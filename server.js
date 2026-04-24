const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

app.post("/pdf", async (req, res) => {
  const { url } = req.body;

  try {
    const browser = await chromium.launch({
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    // ⭐ ここが重要（修正済み）
   await page.goto(url, {
  waitUntil: "networkidle",
  timeout: 60000
});

// ⭐ これに変更（本命）
await page.waitForSelector("#result", { timeout: 30000 });

// ⭐ さらに安定させるなら追加
await page.waitForFunction(() => {
  const el = document.querySelector("#result");
  return el && el.innerText.length > 50;
});

    // ⭐ PDF用に画面モード
   
const pdf = await page.pdf({
  format: "A4",
  printBackground: true
});

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=result.pdf"
    });

    res.send(pdf);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  }
});

app.listen(10000, () => console.log("Server running"));

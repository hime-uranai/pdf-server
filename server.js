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

    // 🔥 読み込み
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000
    });

    // 🔥 DOM完成待ち
    await page.waitForSelector("#result", { timeout: 30000 });

    // 🔥 中身が入るまで待つ（これが本命）
    await page.waitForFunction(() => {
      const el = document.querySelector("#result");
      return el && el.innerText.length > 50;
    });

    // 🔥 レイアウト安定待ち
    await page.waitForTimeout(2000);

    // 🔥 PDF（1回だけ）
   const pdf = await page.pdf({
  format: "A4",
  printBackground: true,
  scale: 1.6,
  margin: {
    top: "0mm",
    bottom: "0mm",
    left: "0mm",
    right: "0mm"
  }
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

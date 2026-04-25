const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

app.post("/pdf", async (req, res) => {
  const { url } = req.body;

  let browser;

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    // 🔥 A4基準のviewport
    await page.setViewportSize({
      width: 1240,
      height: 1754
    });

    // 🔥 ページ読み込み
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000
    });

    // 🔥 DOM生成待ち
    await page.waitForSelector("#result", { timeout: 30000 });

    // 🔥 ページ構築完了待ち（要素数）
    await page.waitForFunction(() => {
      const el = document.querySelector("#result");
      return el && el.children.length > 3;
    });

    // 🔥 フォント完全読み込み
    await page.waitForFunction(() => document.fonts.status === "loaded");

    // 🔥 画像完全読み込み
    await page.waitForFunction(() => {
      const imgs = Array.from(document.images);
      return imgs.every(img => img.complete);
    });

    // 🔥 レイアウト安定待ち
    await page.waitForTimeout(2000);

await page.evaluate(() => {
  window.scrollTo(0, 0);
});

// PDFモード
await page.evaluate(() => {
  document.documentElement.classList.add("pdf-mode");
  document.body.classList.add("pdf-mode");
});

await page.waitForTimeout(1000);

// 👇ここ追加🔥
await page.emulateMedia({ media: "screen" });

const pdf = await page.pdf({
  format: "A4",
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 }
});

    // 🔥 ブラウザ閉じる
    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=result.pdf"
    });

    res.send(pdf);

  } catch (err) {
    console.error("PDF ERROR:", err);

    if (browser) await browser.close();

    res.status(500).send(err.toString());
  }
});

app.listen(10000, () => console.log("Server running"));

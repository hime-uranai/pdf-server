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
    const targetUrl = url.includes("pdf=1")
  ? url
  : url + (url.includes("?") ? "&" : "?") + "pdf=1";

await page.goto(targetUrl, {
  waitUntil: "networkidle",
  timeout: 60000
});

// 🔥 DOM生成待ち
// DOM生成
await page.waitForSelector("#result", { timeout: 30000 });

// 内容入るまで
await page.waitForFunction(() => {
  const el = document.querySelector("#result");
  return el && el.innerText.length > 200;
});

// 高さチェック（これ重要）
await page.waitForFunction(() => {
  const el = document.querySelector("#result");
  return el && el.offsetHeight > 1500;
});

// フォント
await page.evaluate(() => document.fonts.ready);

// 画像
await page.waitForFunction(() => {
  return Array.from(document.images).every(img => img.complete && img.naturalHeight > 0);
});

// 最後の安定待ち
await page.waitForTimeout(3000);

// スクロールリセット
await page.evaluate(() => window.scrollTo(0, 0));

// PDFモード
await page.evaluate(() => {
  document.documentElement.classList.add("pdf-mode");
  document.body.classList.add("pdf-mode");
});

// 反映待ち
await page.waitForTimeout(1500);

// ←ここ重要（printじゃなくscreen）
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

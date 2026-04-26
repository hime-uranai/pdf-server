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

    // ブラウザと同じ前提サイズ
    await page.setViewportSize({
      width: 1240,
      height: 1754
    });

    const targetUrl = url.includes("pdf=1")
      ? url
      : url + (url.includes("?") ? "&" : "?") + "pdf=1";

    // 読み込み
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    // ===== フォント固定（明朝）=====
    await page.addStyleTag({
      content: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap');

        * {
          font-family: 'Noto Serif JP', serif !important;
        }
      `
    });

    await page.evaluate(() => document.fonts.ready);

    // ===== 行間固定（17行維持）=====
    await page.addStyleTag({
      content: `
        .content {
          line-height: 1.7 !important;
          box-sizing: border-box !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      `
    });

    // DOM完成待ち
    await page.waitForSelector("#result", {
      state: "attached",
      timeout: 30000
    });

    // ===== 幅固定（これが最重要）=====
    await page.evaluate(() => {
      const el = document.querySelector('.content');
      if (el) {
        const width = el.clientWidth;
        const style = document.createElement('style');
        style.innerHTML = `.content { width: ${width}px !important; }`;
        document.head.appendChild(style);
      }
    });

    // テキスト入った確認だけ
    await page.waitForFunction(() => {
      const el = document.querySelector("#result");
      return el && el.textContent.length > 50;
    });

    // 画像読み込みだけ待つ
    await page.waitForFunction(() => {
      return Array.from(document.images)
        .every(img => img.complete && img.naturalHeight > 0);
    });

    // 軽く安定待ち
    await page.waitForTimeout(1500);

    // PDFモード
    await page.evaluate(() => {
      document.documentElement.classList.add("pdf-mode");
      document.body.classList.add("pdf-mode");
    });

    // screenで描画
    await page.emulateMedia({ media: "screen" });

    // ===== PDF出力（そのまま）=====
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=result.pdf"
    });

    res.send(pdf);

  } catch (err) {
    console.error(err);
    res.status(500).send(err.toString());
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(10000, () => console.log("🚀 Server running"));

const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

app.post("/pdf", async (req, res) => {
  const { url } = req.body;

  let browser;

  console.log("====================================");
  console.log("🚀 PDF生成リクエスト受信");
  console.log("🌐 元URL:", url);

  try {
    browser = await chromium.launch({
      args: ["--no-sandbox"]
    });

    const page = await browser.newPage();

    console.log("🖥️ ブラウザ起動完了");

    await page.setViewportSize({
      width: 1240,
      height: 1754
    });

    console.log("📐 viewport設定完了");

    const targetUrl = url.includes("pdf=1")
      ? url
      : url + (url.includes("?") ? "&" : "?") + "pdf=1";

    console.log("🌐 実際に開くURL:", targetUrl);

    // =========================
    // ページ読み込み
    // =========================
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    console.log("📄 ページ読み込み完了");

    // =========================
    // result生成待ち（最低限）
    // =========================
    await page.waitForSelector("#result", {
      state: "attached",
      timeout: 30000
    });

    console.log("📦 #result検出");

    // =========================
    // フォント待機
    // =========================
    await page.evaluate(() => document.fonts.ready);
    console.log("🔤 フォント読み込み完了");

    // =========================
    // 画像待機（軽め）
    // =========================
    await page.waitForFunction(() => {
      return Array.from(document.images)
        .every(img => img.complete);
    });

    console.log("🖼️ 画像読み込み完了");

    // =========================
    // 安定待ち（最重要）
    // =========================
    await page.waitForTimeout(5000);
    console.log("⏳ 安定待ち完了");

    // =========================
    // スクロールリセット
    // =========================
    await page.evaluate(() => window.scrollTo(0, 0));
    console.log("🔝 スクロールリセット");

    // =========================
    // PDFモード適用
    // =========================
    await page.evaluate(() => {
      document.documentElement.classList.add("pdf-mode");
      document.body.classList.add("pdf-mode");
    });

    console.log("📄 PDFモード適用");

    // PDFモード反映待ち
    await page.waitForTimeout(7000);

    // =========================
    // media設定
    // =========================
    await page.emulateMedia({ media: "screen" });
    console.log("🖥️ media=screen適用");

    // =========================
    // PDF生成
    // =========================
    console.log("🟡 PDF生成開始");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    console.log("🟢 PDF生成完了");

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=result.pdf"
    });

    res.send(pdf);

    console.log("📤 レスポンス送信完了");

  } catch (err) {
    console.error("🔥 PLAYWRIGHT ERROR:", err);
    res.status(500).send(err.toString());

  } finally {
    if (browser) {
      await browser.close();
      console.log("🧹 ブラウザクローズ");
    }
    console.log("====================================");
  }
});

app.listen(10000, () => console.log("🚀 Server running"));

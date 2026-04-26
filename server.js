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

    
    // ページ読み込み
await page.goto(targetUrl, {
  waitUntil: "domcontentloaded",
  timeout: 60000
});

console.log("📄 ページ読み込み完了");

// 🔥 ここに入れる（←今の位置で正解）
await page.addStyleTag({
  content: `
    * {
      font-family: "Noto Sans JP", sans-serif !important;
    }
  `
});

await page.evaluate(() => document.fonts.ready);

console.log("🔤 フォント固定完了");

 

    

    // DOM生成待ち
   await page.waitForSelector("#result", {
  state: "attached",
  timeout: 30000
});
    console.log("📦 #result検出");

    // テキスト量チェック
    await page.waitForFunction(() => {
  const el = document.querySelector("#result");
  return el && el.textContent.length > 50;
});
    console.log("📝 コンテンツ十分");

    // 高さチェック（超重要）
    await page.waitForFunction(() => {
      const el = document.querySelector("#result");
      return el && el.offsetHeight > 1500;
    }, { timeout: 30000 });

    console.log("📏 レイアウト高さOK");

    // フォント
    await page.evaluate(() => document.fonts.ready);
    console.log("🔤 フォント読み込み完了");

    // 画像
    await page.waitForFunction(() => {
      return Array.from(document.images)
        .every(img => img.complete && img.naturalHeight > 0);
    }, { timeout: 30000 });

    console.log("🖼️ 画像読み込み完了");

    // 安定待ち
    await page.waitForTimeout(3000);
    console.log("⏳ 安定待ち完了");

    // スクロールリセット
    await page.evaluate(() => window.scrollTo(0, 0));
    console.log("🔝 スクロールリセット");

    // PDFモード
    await page.evaluate(() => {
      document.documentElement.classList.add("pdf-mode");
      document.body.classList.add("pdf-mode");
    });

    console.log("📄 PDFモード適用");

    await page.waitForTimeout(1500);

    // 🔥 PDF環境で再分割（最重要）
await page.evaluate(() => {

  function splitByHeightStable(el, maxHeight = 660){

    // 🔥 クローンを作る（ここが重要）
    const measure = el.cloneNode(true);
    measure.style.position = "absolute";
    measure.style.visibility = "hidden";
    measure.style.pointerEvents = "none";

    el.parentElement.appendChild(measure);

    const sentences = el.innerText.split(/(?<=。|！|？)/);

    const pages = [];
    let current = "";

    sentences.forEach(sentence => {

      measure.innerText = current + sentence;

      if(measure.scrollHeight > maxHeight){

        if(current.trim()){
          pages.push(current.trim());
        }

        current = sentence;

      } else {
        current += sentence;
      }

    });

    if(current.trim()){
      pages.push(current.trim());
    }

    measure.remove(); // ←必ず削除

    return pages;
  }

  const contents = document.querySelectorAll(".content");

  contents.forEach(el => {

    const parent = el.parentElement;

    const pages = splitByHeightStable(el);

    parent.innerHTML = "";

    pages.forEach(p => {

      const div = document.createElement("div");
      div.className = "content";
      div.innerText = p;

      parent.appendChild(div);

      // 🔥 最終チェック
      if(div.scrollHeight > 660){
        div.style.fontSize = "18px";
      }

    });

  });

});
    // screen指定（重要）
    await page.emulateMedia({ media: "screen" });
    console.log("🖥️ media=screen適用");

    // 🔥 PDF生成
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

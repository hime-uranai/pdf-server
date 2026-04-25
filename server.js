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

    await page.setViewportSize({
      width: 1240,
      height: 1754
    });

    const targetUrl = url.includes("pdf=1")
      ? url
      : url + (url.includes("?") ? "&" : "?") + "pdf=1";

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForSelector("#result", { timeout: 30000 });

    await page.waitForFunction(() => {
      const el = document.querySelector("#result");
      return el && el.innerText.length > 200;
    }, { timeout: 30000 });

    await page.evaluate(() => document.fonts.ready);

    await page.waitForFunction(() => {
      return Array.from(document.images).every(img => img.complete && img.naturalHeight > 0);
    }, { timeout: 30000 });

    await page.waitForTimeout(3000);

    await page.evaluate(() => window.scrollTo(0, 0));

    await page.evaluate(() => {
      document.documentElement.classList.add("pdf-mode");
      document.body.classList.add("pdf-mode");
    });

    await page.waitForTimeout(1500);

    await page.emulateMedia({ media: "screen" });

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
    console.error("🔥 PLAYWRIGHT ERROR:", err);
    res.status(500).send(err.toString());

  } finally {
    if (browser) await browser.close();
  }
});

app.listen(10000, () => console.log("Server running"));

const express = require('express');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

const app = express();

app.get('/pdf', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    const browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ],
  executablePath:
    (await chromium.executablePath) || '/usr/bin/chromium-browser',
  headless: true,


   ignoreHTTPSErrors: true,
});

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
    });

    res.send(pdf);

  } catch (err) {
    console.error('🔥 ERROR:', err);
    res.status(500).send('PDF generation failed');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
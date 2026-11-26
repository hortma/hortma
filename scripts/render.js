// Renders every src/*.html to assets/*.png.
// Only the element with id="card" is captured, so the image
// size always matches your design (no extra whitespace).
import { chromium } from "playwright";
import { readdirSync, mkdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";

const SRC = resolve("src");
const OUT = resolve("assets");
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.endsWith(".html"));
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1000, height: 800 },
  deviceScaleFactor: 2, // crisp on retina screens
});

for (const file of files) {
  await page.goto(pathToFileURL(resolve(SRC, file)).href);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready); // make sure fonts loaded
  const out = resolve(OUT, basename(file, ".html") + ".png");
  await page.locator("#card").screenshot({ path: out, omitBackground: true });
  console.log("rendered", out);
}

await browser.close();

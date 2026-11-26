// Renders every src/*.html to assets/*.png.
// Only the element with id="card" is captured, so the image
// size always matches your design (no extra whitespace).
import { chromium } from "playwright";
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const SRC = resolve("src");
const OUT = resolve("assets");
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.endsWith(".html"));
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1000, height: 800 },
  deviceScaleFactor: 2, // crisp on retina screens
});

const rendered = [];

for (const file of files) {
  // reset the viewport so the previous card's size doesn't leak into this page
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto(pathToFileURL(resolve(SRC, file)).href);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);

  const card = page.locator("#card");
  if ((await card.count()) === 0) {
    console.error(`skipped ${file}: no #card element`);
    continue;
  }

  const box = await card.boundingBox();
  await page.setViewportSize({
    width: Math.ceil(box.x + box.width),
    height: Math.ceil(box.y + box.height),
  });

  const name = basename(file, ".html");
  await card.screenshot({ path: resolve(OUT, name + ".png"), omitBackground: true });
  rendered.push(name);
  console.log("rendered", name);
}

await browser.close();

let readme = readFileSync("README.md", "utf8");
for (const name of rendered) {
  const hash = createHash("md5")
    .update(readFileSync(resolve(OUT, name + ".png")))
    .digest("hex")
    .slice(0, 8);
  readme = readme.replace(
    new RegExp(`\\./assets/${name}\\.png(\\?v=\\w+)?`, "g"),
    `./assets/${name}.png?v=${hash}`
  );
}
writeFileSync("README.md", readme);
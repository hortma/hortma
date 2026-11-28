// Renders every src/*.html to assets/ in two layouts:
//   <name>.png          desktop (card is max 900px wide)
//   <name>-mobile.png   mobile  (380px viewport, triggers the @media block in your CSS)
// Only the element with id="card" is captured, so the image
// size always matches your design (no extra whitespace).
// Finally, README.md image URLs get ?v=<hash> so GitHub's image cache refreshes.
import { chromium } from "playwright";
import { readdirSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const SRC = resolve("src");
const OUT = resolve("assets");
mkdirSync(OUT, { recursive: true });

// Layouts to render. Keep the mobile width close to a phone's README column
// (~360-390px) so text stays near 1:1 on screen, and below your CSS breakpoint (600px).
const TARGETS = [
  { suffix: "", width: 1200, scale: 2 }, // wide enough for the card's 900px max-width
  { suffix: "-mobile", width: 380, scale: 3 },
];

// Pages with no mobile design are rendered as desktop only, e.g. new Set(["banner"])
const DESKTOP_ONLY = new Set([]);

const files = readdirSync(SRC).filter((f) => f.endsWith(".html"));
const browser = await chromium.launch();
const rendered = []; // output file names, e.g. "hero.png", "hero-mobile.png"

for (const { suffix, width, scale } of TARGETS) {
  // deviceScaleFactor is fixed per page, so each layout gets its own page
  const page = await browser.newPage({
    viewport: { width, height: 800 },
    deviceScaleFactor: scale,
  });

  for (const file of files) {
    const name = basename(file, ".html");
    if (suffix && DESKTOP_ONLY.has(name)) continue;

    // reset the viewport so the previous card's size doesn't leak into this page
    await page.setViewportSize({ width, height: 800 });
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

    const out = `${name}${suffix}.png`;
    await card.screenshot({ path: resolve(OUT, out), omitBackground: true });
    rendered.push(out);
    console.log("rendered", out);
  }

  await page.close();
}

await browser.close();

// Cache-bust README image URLs (keeps whatever prefix you wrote: ./assets/ or assets/)
let readme = readFileSync("README.md", "utf8");
for (const out of rendered) {
  const hash = createHash("md5")
    .update(readFileSync(resolve(OUT, out)))
    .digest("hex")
    .slice(0, 8);
  const escaped = out.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  readme = readme.replace(
    new RegExp(`assets/${escaped}(\\?v=\\w+)?`, "g"),
    `assets/${out}?v=${hash}`
  );
}
writeFileSync("README.md", readme);

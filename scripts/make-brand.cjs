/**
 * SONUS brand pipeline — extracts the official logo assets from
 * `upload/Logotipo SONUS.png` (2000x2000, neon globe + wordmark on black).
 *
 * Technique: the artwork is pure neon on black, so we rebuild transparency
 * additively (alpha = max(r,g,b)) — this preserves every glow falloff pixel
 * perfectly and drops the black background without hard edges.
 *
 * Outputs:
 *   src/assets/brand/sonus-globe.png      512px square, globe only (header mark)
 *   src/assets/brand/sonus-logo-full.png  ~900px wide, full lockup (footer)
 *   src/app/icon.png                      64px favicon
 *   src/app/apple-icon.png                180px iOS icon
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SRC = "/home/z/my-project/upload/Logotipo SONUS.png";
const OUT_BRAND = "/home/z/my-project/src/assets/brand";
const OUT_APP = "/home/z/my-project/src/app";

/** additive alpha: black -> transparent, neon keeps its glow falloff */
function addAlpha(buffer) {
  const { data, info } = buffer;
  const out = Buffer.alloc(data.length * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = Math.max(r, g, b);
  }
  return { data: out, info: { ...info, channels: 4 } };
}

async function main() {
  const mode = process.argv[2] || "analyze";

  if (mode === "analyze") {
    // 1) find content bbox (threshold 8 to ignore jpeg-ish noise)
    const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 3;
        const lum = Math.max(data[i], data[i + 1], data[i + 2]);
        if (lum > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    console.log("content bbox:", { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 });

    // 2) row luminance profile to find the gap between globe and wordmark
    const rows = [];
    for (let y = minY; y <= maxY; y += 8) {
      let rowMax = 0;
      for (let x = minX; x <= maxX; x++) {
        const i = (y * info.width + x) * 3;
        rowMax = Math.max(rowMax, data[i], data[i + 1], data[i + 2]);
      }
      rows.push(y + ":" + rowMax);
    }
    console.log("row profile (y:rowMax):", rows.join(" "));
    return;
  }

  if (mode === "build") {
    const cropGlobe = JSON.parse(process.argv[3]); // {left,top,width,height}
    const cropFull = JSON.parse(process.argv[4]); // {left,top,width,height}

    fs.mkdirSync(OUT_BRAND, { recursive: true });

    // globe mark
    const globeRaw = await sharp(SRC).extract(cropGlobe).raw().toBuffer({ resolveWithObject: true });
    const globeA = addAlpha(globeRaw);
    await sharp(globeA.data, { raw: globeA.info })
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(OUT_BRAND, "sonus-globe.png"));

    // full lockup
    const fullRaw = await sharp(SRC).extract(cropFull).raw().toBuffer({ resolveWithObject: true });
    const fullA = addAlpha(fullRaw);
    await sharp(fullA.data, { raw: fullA.info })
      .resize({ width: 900, withoutEnlargement: true })
      .png()
      .toFile(path.join(OUT_BRAND, "sonus-logo-full.png"));

    // favicon + apple icon (black square bg version reads better at tiny sizes)
    const globeSquare = await sharp(SRC).extract(cropGlobe).resize(64, 64).png().toBuffer();
    fs.writeFileSync(path.join(OUT_APP, "icon.png"), globeSquare);
    await sharp(SRC).extract(cropGlobe).resize(180, 180).png().toFile(path.join(OUT_APP, "apple-icon.png"));

    console.log("brand assets written");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

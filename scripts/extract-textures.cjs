/* One-off extractor: pulls the NASA base64 textures out of the v3 prototype
 * and writes them as real image files so the Next.js app can import them
 * statically (offline, no external URLs). */
const fs = require('fs');
const path = require('path');

const SRC = '/home/z/my-project/upload/sonus_prototype.html';
const OUT_DIR = '/home/z/my-project/src/assets/textures';

const html = fs.readFileSync(SRC, 'utf8');
const texLine = html.split('\n').find((l) => l.includes('const TEX'));
if (!texLine) {
  console.error('TEX line not found');
  process.exit(1);
}

function grab(key) {
  const re = new RegExp(key + ":'data:image/([a-zA-Z]+);base64,([^']+)'");
  const m = texLine.match(re);
  if (!m) throw new Error('texture ' + key + ' not found');
  return { ext: m[1].toLowerCase(), data: Buffer.from(m[2], 'base64') };
}

const day = grab('day');
const night = grab('night');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'blue-marble.' + day.ext), day.data);
fs.writeFileSync(path.join(OUT_DIR, 'black-marble.' + night.ext), night.data);
console.log('day:', day.ext, day.data.length, 'bytes');
console.log('night:', night.ext, night.data.length, 'bytes');

// Reuse the approved vector paths, with a compact layout for square icons.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = join(root, 'public/favicons');
const design = join(root, 'docs/design/rh-flame/favicon');
const palettes = ['mono', 'orange-blue', 'blue', 'orange'];
const sizes = [16, 32, 48, 64, 192, 512];
await mkdir(design, { recursive: true });

for (const palette of palettes) {
  const source = await readFile(join(root, `public/brand/rh-flame-${palette === 'mono' ? 'black' : palette}.svg`), 'utf8');
  const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? '';
  const artwork = source.match(/<g id="RH-Flame">[\s\S]*?<\/g>/)?.[0];
  if (!artwork) throw new Error(`Missing approved artwork: ${palette}`);
  // Keep the approved bird-shaped R, including its bowl, leg and lower feather.
  const rPaths = [...artwork.matchAll(/<path\b[^>]*\/>/g)]
    .map(match => match[0])
    .filter(path => /id="(?:R-[^"]+|Lower-flight-feather)"/.test(path));
  if (rPaths.length !== 4) throw new Error(`Missing R paths: ${palette}`);
  const symbol = `<g id="R-Flame">${rPaths.join('')}</g>`;
  // Enlarge R on its own to ~97% of the width, centered on a square canvas.
  const icon = (radius, transform = 'translate(-34 29) scale(2.48)') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>R Flame — ${palette} favicon</title>${defs}<rect width="512" height="512" rx="${radius}" fill="${palette === 'mono' ? '#ffffff' : '#031121'}"/><g transform="${transform}">${symbol}</g></svg>\n`;

  const directory = join(output, palette);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'favicon.svg'), icon(32));
  for (const size of sizes) {
    await sharp(Buffer.from(icon(32)), { density: 288 }).resize(size, size)
      .png().toFile(join(directory, `icon-${size}.png`));
  }
  // iOS and maskable icons need a fully opaque square: the platform crops it.
  await sharp(Buffer.from(icon(0, 'translate(17 68) scale(2.05)')), { density: 288 }).resize(180, 180)
    .png().toFile(join(directory, 'apple-touch-icon.png'));
  await sharp(Buffer.from(icon(0, 'translate(81 119) scale(1.5)')), { density: 288 }).resize(512, 512)
    .png().toFile(join(directory, 'icon-maskable-512.png'));
}

const ico = spawnSync('python3', ['-c', `
from pathlib import Path
from PIL import Image
root = Path(${JSON.stringify(output)})
for palette in ['mono', 'orange-blue', 'blue', 'orange']:
    folder = root / palette
    image = Image.open(folder / 'icon-512.png').convert('RGBA')
    image.save(folder / 'favicon.ico', format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64)])
`], { encoding: 'utf8' });
if (ico.status !== 0) throw new Error(ico.stderr || 'ICO generation failed');

const primary = join(output, 'mono');
await copyFile(join(primary, 'favicon.svg'), join(root, 'src/app/icon.svg'));
await copyFile(join(primary, 'favicon.ico'), join(root, 'src/app/favicon.ico'));
await copyFile(join(primary, 'apple-touch-icon.png'), join(root, 'src/app/apple-icon.png'));
await copyFile(join(primary, 'favicon.svg'), join(design, 'RH-Flame-favicon.svg'));

// Actual pixel sizes plus larger colour samples, for visual inspection.
const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="460"><rect width="1000" height="460" fill="#f5f6f8"/><g fill="#1d1d1f" font-family="Arial"><text x="40" y="55" font-size="24" font-weight="700">R / FAVICON</text><text x="360" y="122" font-size="15">Actual sizes</text><text x="360" y="230" font-size="12">16px</text><text x="435" y="230" font-size="12">32px</text><text x="525" y="230" font-size="12">48px</text><text x="635" y="230" font-size="12">64px</text><text x="360" y="286" font-size="15">Colour variants</text><text x="40" y="420" font-size="13">SVG · ICO (16 / 32 / 48 / 64) · PNG · Apple touch icon · Maskable icon</text></g></svg>`;
const composites = [{ input: join(primary, 'icon-512.png'), left: 40, top: 102 }];
composites[0].input = await sharp(composites[0].input).resize(256).png().toBuffer();
for (const [size, left] of [[16, 360], [32, 435], [48, 525], [64, 635]]) {
  composites.push({ input: join(primary, `icon-${size}.png`), left, top: 192 - size });
}
for (const [index, palette] of palettes.entries()) {
  composites.push({ input: await sharp(join(output, palette, 'icon-512.png')).resize(80).png().toBuffer(), left: 360 + index * 110, top: 307 });
}
await sharp(Buffer.from(board)).composite(composites).png().toFile(join(design, 'RH-Flame-favicon-preview.png'));

const archive = spawnSync('python3', ['-c', `
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(${JSON.stringify(output)})
with ZipFile(root / 'rh-flame-favicons.zip', 'w', ZIP_DEFLATED) as bundle:
    for palette in ['mono', 'orange-blue', 'blue', 'orange']:
        for path in sorted((root / palette).iterdir()):
            bundle.write(path, path.relative_to(root))
`], { encoding: 'utf8' });
if (archive.status !== 0) throw new Error(archive.stderr || 'Archive generation failed');
console.info(`Generated favicon sets: ${resolve(output)}`);

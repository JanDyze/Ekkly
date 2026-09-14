// The installed app's icons, drawn from Ekkly's mark.
//
//   node scripts/generate-icons.mjs
//
// Every church installs the same app from the same manifest for now, so these
// are the platform's icons. When the manifest is served per church, a church
// with a logo of its own will want its own set.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = "public/ekkly-mark.svg";
const out = "public/icons";
mkdirSync(out, { recursive: true });

// An SVG has no pixel size; a high density renders it crisply at any size below.
const mark = (size) => sharp(src, { density: 600 }).resize(size, size).png().toBuffer();

// Standard icons: transparent ground, the mark with a little room around it.
for (const size of [64, 192, 512]) {
  const inner = Math.round(size * 0.9);
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await mark(inner), gravity: "center" }])
    .png()
    .toFile(`${out}/pwa-${size}x${size}.png`);
}

// Maskable: the mark inside the safe zone on white. The panes are four
// colours, so no single brand colour behind them would sit well with all four.
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ffffff" } })
  .composite([{ input: await mark(320), gravity: "center" }])
  .png()
  .toFile(`${out}/maskable-512x512.png`);

// Apple touch icon: 180x180 on white (iOS dislikes transparency).
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#ffffff" } })
  .composite([{ input: await mark(140), gravity: "center" }])
  .png()
  .toFile(`${out}/apple-touch-icon.png`);

// Notification badge: Android draws only the alpha channel, as a flat
// silhouette. The window becomes solid white and the cross, already
// transparent in the mark, stays as the negative space that makes it readable.
{
  const size = 512;
  const { data } = await sharp(await mark(size)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const opaque = data[i + 3] > 40;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = opaque ? 255 : 0;
  }
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .resize(96, 96)
    .png()
    .toFile(`${out}/badge-96x96.png`);
}

// A plain PNG of the mark, for the places that cannot take an SVG (email).
await sharp(await mark(512)).toFile("public/ekkly-mark.png");

console.log("icons generated");

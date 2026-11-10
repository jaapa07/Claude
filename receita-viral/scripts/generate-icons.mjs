// Gera os ícones PNG do PWA a partir do SVG (usa o sharp que já vem com o Next).
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url));
for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(new URL(`../public/icons/icon-${size}.png`, import.meta.url).pathname);
}
// Ícone "maskable" com margem de segurança
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#f2600c" } })
  .composite([{ input: await sharp(svg).resize(400, 400).png().toBuffer(), gravity: "center" }])
  .png()
  .toFile(new URL("../public/icons/icon-maskable-512.png", import.meta.url).pathname);
console.log("Ícones gerados.");

import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Reuse the complete approved title artwork, with no redraw, crop or recoloring.
// A solid square avoids the black transparency fill of iOS Home Screen icons.
export const GAME_ICON_BACKGROUND = '#fff9eb';
export const GAME_INSTALL_ICONS = [
  ['apple-touch-icon-v1.png', 180, 0.94],
  ['icon-192-v1.png', 192, 0.94],
  ['icon-512-v1.png', 512, 0.94],
  // The complete horizontal logo stays within the central 80% safe circle.
  ['icon-maskable-512-v1.png', 512, 0.74],
];

export async function buildGameInstallIcons(dest) {
  const source = await readFile(new URL('../public/game-art/game-title.png', import.meta.url));
  const directory = new URL('game-icons/', dest);
  await mkdir(directory, { recursive: true });
  for (const [name, size, fraction] of GAME_INSTALL_ICONS) {
    const width = Math.round(size * fraction);
    const logo = await sharp(source).resize({ width, withoutEnlargement: true }).png().toBuffer();
    const shape = await sharp(logo).metadata();
    const png = await sharp({ create: { width: size, height: size, channels: 3, background: GAME_ICON_BACKGROUND } })
      .composite([{ input: logo, left: Math.floor((size - shape.width) / 2), top: Math.floor((size - shape.height) / 2) }]).png().toBuffer();
    await writeFile(new URL(name, directory), png);
  }
}

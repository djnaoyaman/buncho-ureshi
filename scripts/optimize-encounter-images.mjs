import sharp from 'sharp';
import { readdir, stat, writeFile } from 'node:fs/promises';

/** Delivery copies only. Original illustrations and all licensed photographs stay intact. */
export async function optimizeEncounterImages(dest) {
  const records = [];
  for (const folder of ['gardens', 'finches']) {
    const directory = new URL(`game-art/${folder}/`, dest);
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.png')).sort()) {
      const source = new URL(name, directory), bytes = (await stat(source)).size;
      const metadata = await sharp(source.pathname).metadata();
      // Keep the full source dimensions, transparency and individual artwork.
      const screen = new URL(name.replace(/\.png$/, '.screen.webp'), directory);
      await sharp(source.pathname).webp({ quality: 92, alphaQuality: 100, effort: 5 }).toFile(screen.pathname);
      const record = { source: `game-art/${folder}/${name}`, width: metadata.width, height: metadata.height, originalBytes: bytes, screenBytes: (await stat(screen)).size };
      if (folder === 'finches') {
        const thumb = new URL(name.replace(/\.png$/, '.thumb.webp'), directory);
        await sharp(source.pathname).resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(thumb.pathname);
        record.thumbnailBytes = (await stat(thumb)).size;
      }
      records.push(record);
    }
  }
  await writeFile(new URL('encounter-image-sizes.json', dest), JSON.stringify(records, null, 2) + '\n');
  console.log(`Prepared ${records.length} garden/notebook illustrations; original files and licensed photographs unchanged.`);
  return records;
}

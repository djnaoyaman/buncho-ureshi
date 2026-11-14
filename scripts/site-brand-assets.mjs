import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../public/site-brand-v1/', import.meta.url);
const bird = await readFile(new URL('bird-05-master.webp', root));
for (const size of [16,32,48,180,192,512]) {
 const name=size===180?'apple-touch-icon.png':size<100?`favicon-${size}.png`:`icon-${size}.png`;
 await sharp(bird).resize(size,size).flatten({background:'#fff6e8'}).png({palette:true}).toFile(new URL(name,root).pathname);
}
const safe=await sharp(bird).resize(350,350).png().toBuffer();
await sharp({create:{width:512,height:512,channels:3,background:'#fff6e8'}}).composite([{input:safe,left:81,top:81}]).png({palette:true}).toFile(new URL('icon-maskable-512.png',root).pathname);
const icon=await readFile(new URL('icon-512.png',root));
await writeFile(new URL('favicon.svg',root),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${icon.toString('base64')}"/></svg>`);
// Native vector layout embeds the unchanged approved wordmark, never redraws it.
const bg=await readFile(new URL('poster-background.webp',root));
const logo=await sharp(await readFile(new URL('../brand/wordmark-04-transparent.webp',root))).png().toBuffer();
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><image width="1200" height="630" preserveAspectRatio="xMidYMid slice" href="poster-background.webp"/><image x="240" y="63" width="720" height="415" href="../brand/wordmark-04-transparent.webp"/><text x="600" y="547" text-anchor="middle" font-family="Noto Serif CJK JP,serif" font-size="29" letter-spacing="5" fill="#123d2c">見る。知る。つくる。</text></svg>`;
await writeFile(new URL('ogp-artposter.svg',root),svg);
const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><text x="600" y="547" text-anchor="middle" font-family="Noto Serif CJK JP,serif" font-size="29" letter-spacing="5" fill="#123d2c">見る。知る。つくる。</text></svg>`);
await sharp(bg).resize(1200,630).composite([{input:await sharp(logo).resize(720,415,{fit:'contain',background:'#00000000'}).png().toBuffer(),left:240,top:63},{input:label}]).png({palette:true,quality:85}).toFile(new URL('ogp-artposter.png',root).pathname);
const entries=await Promise.all([16,32,48].map(size=>readFile(new URL(`favicon-${size}.png`,root))));
const header=Buffer.alloc(6+16*3);header.writeUInt16LE(1,2);header.writeUInt16LE(3,4);let offset=header.length;
entries.forEach((b,i)=>{const o=6+16*i;header[o]=header[o+1]=[16,32,48][i];header.writeUInt16LE(1,o+4);header.writeUInt16LE(32,o+6);header.writeUInt32LE(b.length,o+8);header.writeUInt32LE(offset,o+12);offset+=b.length;});
await writeFile(new URL("favicon.ico",root),Buffer.concat([header,...entries]));

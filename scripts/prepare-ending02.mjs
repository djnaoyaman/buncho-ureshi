// Transport the approved film in two repository blobs, never re-encode it.
// The connector request size limits base64 uploads; only the assembled MP4 ships.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=new URL('../media-source/ending02/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',source),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
if(manifest.output!=='omochi-ending02-revised-87.mp4'||manifest.sha256!=='8ff8e50f2f3bfb2e6e546ec731bdc5a6636e7c02de53a6ee9058e2b1dcc09867'||manifest.parts.length!==2)throw Error('Unexpected ending 2 identity');
const chunks=[];
for(const part of manifest.parts){
 if(!/^approved-87\.part[12]$/.test(part.name))throw Error('Unexpected film part');
 const bytes=await readFile(new URL(part.name,source));
 if(bytes.length!==part.bytes||hash(bytes)!==part.sha256)throw Error('Damaged film part: '+part.name);
 chunks.push(bytes);
}
const bytes=Buffer.concat(chunks);
if(bytes.length!==manifest.bytes||hash(bytes)!==manifest.sha256)throw Error('Ending 2 differs from approved master');
const output=new URL('../public/game-endings/',import.meta.url);
await mkdir(output,{recursive:true});await writeFile(new URL(manifest.output,output),bytes);
console.log('Prepared approved ending 2: '+bytes.length+' bytes, SHA256 '+hash(bytes));

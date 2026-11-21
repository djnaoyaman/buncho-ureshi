// Reconstruct the owner-approved fourth collection film without re-encoding it.
import {createHash} from 'node:crypto';
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
const sha=b=>createHash('sha256').update(b).digest('hex');
const src=new URL('../media-source/ending04/',import.meta.url);
const dest=new URL('../public/game-endings/',import.meta.url);
const output='raptors-v5.mp4', bytes=19451231;
const expected='6dfec74cf2396262a08daddcef163425b2818695822c35898fea2cc3818b6d1b';
const pins=[
 ['approved-v5.part1',6600000,'26457e5aa15dc7bf9f7ccfcf23f38da536056beace2c2c6d7c841328be0106f6'],
 ['approved-v5.part2',6600000,'3cd2451bf2b2f2e7ee8b63424356d3fcdb6b7027e0d8a53cdb99936d6e6726ce'],
 ['approved-v5.part3',6251231,'61e945cbfff8a43aec6db655537808c66538434769954256413e418a6b6edae3']
];
const declared=JSON.parse(await readFile(new URL('manifest.json',src),'utf8'));
if(declared.output!==output||declared.bytes!==bytes||declared.sha256!==expected||
 !Array.isArray(declared.parts)||declared.parts.length!==pins.length)throw Error('Unexpected Ending 4 media identity');
const parts=[];
for(const [i,[name,size,hash]] of pins.entries()){
 const p=declared.parts[i];
 if(!p||p.name!==name||p.bytes!==size||p.sha256!==hash)throw Error('Unexpected Ending 4 part metadata');
 const buffer=await readFile(new URL(name,src));
 if(buffer.length!==size||sha(buffer)!==hash)throw Error('Damaged Ending 4 part: '+name);
 parts.push(buffer);
}
const result=Buffer.concat(parts);
if(result.length!==bytes||sha(result)!==expected)throw Error('Ending 4 differs from approved original');
await mkdir(dest,{recursive:true});
const temp=new URL('.'+output+'.part-'+process.pid,dest);
try{
 await writeFile(temp,result,{flag:'wx'});
 await rename(temp,new URL(output,dest));
}catch(error){
 await rm(temp,{force:true});
 throw error;
}
console.log('Prepared approved ending 4: '+bytes+' bytes, SHA256 '+expected);

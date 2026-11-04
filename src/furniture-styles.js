/** Visual finishes only: never remap the stored color, form, tier or item ID. */
const MIDCENTURY=['#667d52','#b86e57','#467c87','#c1a143','#77677e','#b57644','#c9b88c','#398b83'];
export function furnitureMaterials(index,color,level){
 if(level===2)return {body:MIDCENTURY[index]||MIDCENTURY[0],wood:['#b98b59','#8d5b35','#734727','#59351f','#a87948'],rim:'#f2dfb6',edge:'#594638'};
 if(level===3)return {body:'#d7ae48',wood:['#f2dcb1','#d5b17b','#c49863','#99764e','#d9bc8b'],rim:'#fff1b6',edge:'#8c6727'};
 return {body:color,wood:['#f2dcb1','#d5b17b','#c49863','#99764e','#d9bc8b'],rim:'#fff9e9',edge:null};
}
/** Low, integrated plinths keep the established floor/hook contact unchanged.
 * Gold is a fictional finish, not husbandry advice or exposed dangling hardware. */
export function styleArtwork(slot,index,level,art,p){
 const {g,c,ivory}=p;
 const path=(d,fill,stroke='none',width=1)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
 const line=(d,stroke,width=2)=>path(d,'none',stroke,width);
 const mark=`data-furniture-style="${level===1?'warm':level===2?'mid-century':'gold'}"`;
 if(level===1)return `<g ${mark}>${art}</g>`;
 const floor=['feed','bath','water','greens','shellgrit'].includes(slot)&&!(slot==='water'&&index===4)&&!(slot==='greens'&&index===3);
 if(level===2){
  if(floor){
   // Compress around the original base, leaving 12 units for splayed walnut feet.
   const base=slot==='greens'?154:slot==='water'?156:150;
   const feet=path(`M58 ${base-13}l13 1-7 12H54Z`,g('wood'))+path(`M129 ${base-12}l13-1 4 13h-10Z`,g('wood'));
   return `<g ${mark}>${feet}<g transform="translate(0 ${base*.12-12}) scale(1 .88)">${art}</g>${line(`M70 ${base-10}h60`,g('wood'),5)}</g>`;
  }
  if(slot==='water'&&index===4)art+=path('M42 123h116v11H42Z',g('wood'))+path('M52 134l7 13h8l-3-13ZM133 134l-3 13h8l7-13Z',g('wood'));
  if(slot==='greens'&&index===3)art+=path('M64 137h72v10H64Z',g('wood'))+line('M69 140h62',ivory,1);
  return `<g ${mark}>${art}</g>`;
 }
 // Broad sculpted fittings, not glitter or loose jewels. Retain natural bird-contact wood.
 if(slot==='perch')art+=path('M13 83h12v18H13ZM175 83h12v18h-12Z',g('gold'),'#957137')+line('M16 85v13m162-13v13','#fff0bd',1.7);
 if(slot==='swing')art+=path('M35 132h18v18H35ZM147 132h18v18h-18Z',g('gold'),'#957137')+line('M39 135v12m112-12v12','#fff0bd',2);
 return `<g ${mark}>${art}</g>`;
}

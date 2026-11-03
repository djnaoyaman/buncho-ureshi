/** Form identity is derived from existing colors; no new save fields or items. */
const COLORS=['#8fbea6','#e8a8b5','#94c6df','#edd88a','#beb0dc','#e9ba97','#e9dfc5','#8ecdc8'];
export const FURNITURE_FORMS=Object.freeze({
 perch:['自然の枝','二股の枝','段違いの枝','編みロープ','くつろぎ棚','はしご付き枝','アーチの枝','小枝のテラス'],
 water:['ガラス給水塔','丸い水鉢','角形水鉢','しずくボトル','壁掛けカップ','横長の水鉢','半月カップ','小さな水差し'],
 feed:['丸いごはん鉢','角形ごはん鉢','舟形ごはん鉢','花びらの鉢','浅いごはん皿','脚付きごはん鉢','二つのごはん鉢','縦長のごはん鉢'],
 bath:['丸い水浴び鉢','楕円の水浴び鉢','四角い水浴び鉢','花びらの水浴び鉢','貝形の水浴び鉢','半月の水浴び鉢','舟形の水浴び鉢','六角の水浴び鉢'],
 greens:['丸い青菜立て','角形青菜立て','筒形青菜立て','壁掛け青菜立て','舟形青菜立て','二連の青菜立て','小瓶の青菜立て','葉形の青菜立て'],
 shellgrit:['丸いボレー鉢','角形ボレー鉢','舟形ボレー鉢','花びらのボレー鉢','浅いボレー皿','脚付きボレー鉢','二つのボレー鉢','縦長のボレー鉢'],
 swing:['アーチブランコ','三角ブランコ','丸いブランコ','四角いブランコ','二本吊りブランコ','しずくブランコ','六角ブランコ','小枝ブランコ'],
 toy:['木玉とベル','三つのリング','木のはしご','花と木玉','輪っかのモビール','木の葉モビール','積み木の飾り','編み玉の飾り'],
 paper:['草花の敷き紙','丸角の敷き紙','波縁の敷き紙','六角の敷き紙','折り返しの敷き紙','葉模様の敷き紙','市松の敷き紙','重ねた敷き紙']
});
export function furnitureFormIndex(color){const i=COLORS.indexOf(String(color).toLowerCase());return Math.max(0,i);}
export function furnitureFormName(slot,color){return (FURNITURE_FORMS[slot]||FURNITURE_FORMS.toy)[furnitureFormIndex(color)];}

export function formArtwork(slot,index,level,p,h){
 const {g,c,pale,deep,edge,ivory}=p,{bowl,shadow}=h;
 const path=(d,fill=g('wood'),stroke='#96774d',width=1.2)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
 const line=(d,width=2,color=ivory)=>path(d,'none',color,width);
 const circle=(x,y,r,fill=g('glaze'))=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${edge}" stroke-width="1.2"/>`;
 const clamp=(x,y)=>`<ellipse cx="${x}" cy="${y}" rx="5" ry="12" fill="${g('glaze')}" stroke="${edge}"/>${line(`M${x-2} ${y-7}v13`,1.3,pale)}`;
 const tierTrim=(d)=>level>1?line(d,level===3?2.5:1.5,level===3?g('gold'):ivory):'';
 if(slot==='perch'){
  const beam=path('M16 84Q78 77 184 84L184 100Q87 94 16 101Z')+line('M20 87Q85 81 179 87',1.5,'#f8e5bc')+line('M24 94q29-5 58-1t90 0',.8,'#a17b4f');
  const branch=d=>path(d,'none','#99734b',13)+path(d,'none',g('wood'),10)+line(d,1.1,'#e9cd97');
  const forms=[
   branch('M53 90Q63 71 79 65M136 88q12 13 27 18'),
   branch('M39 90Q83 109 139 134M86 108q28-20 67-21'),
   branch('M41 92V125H150M112 125v23h53'),
   path('M25 96Q100 155 176 96','none','#9a8157',14)+path('M25 96Q100 155 176 96','none','#e4d1a6',10)+Array.from({length:12},(_,i)=>line(`M${33+i*12} ${106+Math.sin(i/11*Math.PI)*24}l4-7`,1.5,'#aa8f66')).join(''),
   path('M29 97L151 95 176 124 44 132Z')+path('M44 132l132-8v9l-132 8Z')+line('M47 104l12 27m17-28 11 25m18-26 10 23m18-24 10 21',1,'#98774f')+path('M42 100v33m111-35v31','none',g('glaze'),5),
   branch('M53 99l-10 63M147 99l12 63')+[118,138,157].map((y,i)=>branch(`M${50-i*3} ${y}H${151+i*3}`)).join(''),
   branch('M37 97Q100 164 165 97')+branch('M61 117H141'),
   path('M32 99L151 97 177 123 53 137Z')+[0,1,2,3,4,5].map(i=>branch(`M${37+i*21} 100l22 29`)).join('')
  ];
  return forms[index]+beam+clamp(17,92)+clamp(183,92)+tierTrim('M24 91Q100 84 176 91')+(level===3?circle(17,92,2,g('gold'))+circle(183,92,2,g('gold')):'');
 }
 if(slot==='water'){
  const glass=(body,water,top)=>path(body,g('glass'),'#87a89f')+path(water,g('water'),'#9bc7bc',.5)+line('M79 53v45',3,'#f5fff2')+path(top,g('glaze'),edge)+tierTrim('M73 46q27 9 54 0');
  const forms=[
   glass('M69 39Q100 30 131 39V126H69Z','M73 81q27 8 54 0v43H73Z','M65 30Q100 17 135 30v13Q100 54 65 43Z')+`<ellipse cx="100" cy="30" rx="35" ry="9" fill="${g('rim')}"/>`+bowl('bath',49,130,154),
   bowl('bath',70,99,150),
   vessel(2,'water',74,93,151),
   glass('M86 28h28v25Q145 77 132 128H68Q55 77 86 53Z','M69 88q30 9 62 0v39H69Z','M83 25h34v15H83Z')+bowl('bath',43,137,156),
   line('M57 76V42h25m36 0h25v34',5,'#a18b67')+vessel(1,'water',58,92,150)+path('M44 99l-11-6v27l13 6',g('glaze'),edge),
   vessel(2,'water',83,110,150),
   path('M32 91L100 61 168 91v46Q100 167 32 137Z',g('glaze'),edge)+path('M38 91L100 68 162 91Q100 122 38 91Z',g('water'),'#d8eee2')+tierTrim('M42 131q58 27 116 0')+line('M63 88q26-11 48-4',2),
   path('M75 60Q100 44 125 60L139 134Q100 165 61 134Z',g('glaze'),edge)+path('M72 66L43 59 64 93Z',g('glaze'),edge)+path('M125 73Q169 56 158 110Q153 128 137 124','none',deep,9)+path('M125 73Q169 56 158 110Q153 128 137 124','none',pale,5)+`<ellipse cx="100" cy="61" rx="25" ry="10" fill="${g('rim')}"/><ellipse cx="100" cy="62" rx="19" ry="6" fill="${g('water')}"/>`+tierTrim('M77 129q23 12 46 0')
  ];return shadow(100,160,80,9)+forms[index];
 }
 function vessel(form,kind,rx=70,top=92,bottom=150){
  if(form===0)return bowl(kind==='water'?'bath':kind,rx,top,bottom);
  const a=100-rx,b=100+rx,fill=kind==='water'||kind==='bath'?g('water'):kind==='greens'?'#738558':kind==='feed'?'#e1c99b':'#e8dfc9';
  const outlines=[null,`M${a} ${top-12}h${rx*2}v${bottom-top+7}q-${rx} 23-${rx*2} 0Z`,`M${a} ${top}Q100 ${top-45} ${b} ${top}L${b-15} ${bottom-8}Q100 ${bottom+14} ${a+15} ${bottom-8}Z`,`M${a} ${top}q-9-19 14-18q8-22 29-12q18-17 39 0q24-9 30 12q23 0 15 18l-14 ${bottom-top-9}q-55 29-104 0Z`,`M${a} ${top}Q100 ${top-25} ${b} ${top}L${b-10} ${bottom-9}Q100 ${bottom+7} ${a+10} ${bottom-9}Z`,`M${a+9} ${top-14}h${rx*2-18}l9 16-${rx*.35} ${bottom-top-7}h-${rx*1.3}L${a} ${top+2}Z`];
  const d=outlines[Math.min(5,form)];
  let out=shadow(100,bottom+7,rx+8,10)+path(d,g('glaze'),edge)+`<ellipse cx="100" cy="${top}" rx="${rx-8}" ry="${rx*.24}" fill="${g('rim')}" stroke="${edge}"/><ellipse cx="100" cy="${top+1}" rx="${rx-14}" ry="${rx*.24-5}" fill="${fill}"/>`+line(`M${a+7} ${top+12}l6 ${Math.max(5,bottom-top-25)}`,2,pale)+tierTrim(`M${a+17} ${bottom-14}q${rx-17} 20 ${2*rx-34} 0`);
  out+=line(`M${a+18} ${bottom-5}q${rx-18} 12 ${rx*2-36} 0`,1,deep);
  if(level===3)out+=line(`M${a+16} ${top+4}q${rx-16} ${rx*.32} ${rx*2-32} 0`,1.5,g('gold'));
  if(kind==='feed'||kind==='shellgrit')out+=Array.from({length:23},(_,i)=>{const a=i*2.399,r=Math.sqrt(i/23),x=100+Math.cos(a)*r*(rx-19),y=top+2+Math.sin(a)*r*(rx*.24-8);return kind==='shellgrit'?`<path d="M${x} ${y}l-4-2 2-3 5 1 1 3Z" fill="${i%2?'#f5efdd':'#d0c4a5'}" stroke="#b6ac8d" stroke-width=".4"/>`:`<ellipse cx="${x}" cy="${y}" rx="2.8" ry="1.7" fill="${i%2?'#f7edce':'#b8a072'}" transform="rotate(${i*31} ${x} ${y})"/>`;}).join('');
  if(kind==='water'||kind==='bath')out+=line(`M${a+22} ${top}q20-7 39-2m5 5q17 3 29-3`,1.5,'#effff0');
  return out;
 }
 if(slot==='feed'||slot==='shellgrit'){
  const kind=slot,forms=[()=>bowl(kind,65,91,149),()=>vessel(1,kind,66,90,149),()=>vessel(2,kind,79,104,149),()=>vessel(3,kind,66,89,149),()=>vessel(4,kind,79,126,150),()=>`<ellipse cx="100" cy="153" rx="40" ry="7" fill="${g('rim')}" stroke="${edge}"/>`+path('M89 123h22v27H89Z',g('glaze'),edge)+bowl(kind,60,76,127),()=>`<g transform="translate(1 38) scale(.62)">${bowl(kind,66,91,149)}</g><g transform="translate(75 38) scale(.62)">${bowl(kind,66,91,149)}</g>`+path('M22 141h156v9H22Z',g('wood')),()=>vessel(5,kind,47,65,150)];
  return forms[index]();
 }
 if(slot==='bath'){
  const forms=[()=>bowl('bath',77,102,149),()=>vessel(4,'bath',87,113,149),()=>vessel(1,'bath',75,100,149),()=>vessel(3,'bath',76,102,149),()=>path('M23 102Q20 58 44 83Q48 43 70 76Q93 41 105 76Q136 47 137 85Q170 61 177 102L158 145Q100 167 42 145Z',g('glaze'),edge)+`<ellipse cx="100" cy="113" rx="63" ry="23" fill="${g('rim')}"/><ellipse cx="100" cy="114" rx="56" ry="17" fill="${g('water')}"/>`+tierTrim('M50 139q50 24 100 0'),()=>path('M26 91L174 91v44Q100 173 26 135Z',g('glaze'),edge)+path('M32 95H168Q100 139 32 95Z',g('water'),'#edf6e5')+tierTrim('M40 132q60 27 120 0'),()=>vessel(2,'bath',88,110,150),()=>vessel(5,'bath',77,105,150)];
  return shadow(100,158,85,10)+forms[index]();
 }
 if(slot==='greens'){
  const leaves=path('M95 113Q52 85 58 38Q87 36 101 105Q76 53 110 20Q142 49 111 110Q119 66 153 57Q165 91 118 120',g('leaf'),'#638454')+line('M98 116L63 46m42 65 7-81m2 86 35-51',1.4,'#dae2a0')+line('M79 84l-11-3m18 16 0-13m22-21-11-8m15 25 11-10m11 20 11-3',.9,'#dae2a0');
  const forms=[()=>bowl('greens',46,120,154),()=>vessel(1,'greens',47,121,154),()=>path('M69 102h62v47q-31 15-62 0Z',g('glaze'),edge)+`<ellipse cx="100" cy="102" rx="31" ry="9" fill="${g('rim')}"/>`,()=>line('M62 116V91H78m44 0h16v25',4,'#a4916e')+vessel(5,'greens',46,122,153),()=>vessel(2,'greens',68,128,154),()=>`<g transform="translate(15 64) scale(.58)">${bowl('greens',46,120,154)}</g><g transform="translate(71 64) scale(.58)">${bowl('greens',46,120,154)}</g>`,()=>path('M84 95h32v24q20 10 15 32q-31 14-62 0q-5-22 15-32Z',g('glass'),'#8aa89d')+path('M73 132h54v17q-27 11-54 0Z',g('water'),'#92bca9'),()=>path('M39 124q42-26 116-7q-9 41-71 39Z',g('glaze'),edge)+path('M46 124q45-19 99-5q-32 23-86 17Z','#718852',edge)];
  return shadow(100,162,72,9)+(index===5?`<g transform="translate(15 64) scale(.58)">${leaves}</g><g transform="translate(71 64) scale(.58)">${leaves}</g>`:leaves)+forms[index]()+tierTrim('M78 143q22 10 44 0');
 }
 if(slot==='swing'){
  const frame=d=>path(d,'none','#907b57',7)+path(d,'none','#e5d1a9',4)+line(d,1,'#fff0ce');
  const outlines=['M45 133V82a55 55 0 01110 0v51','M36 135L100 28 164 135Z','M100 28a56 56 0 110 112a56 56 0 010-112','M43 133V40h114v93','M43 133V40L100 28 157 40V133','M100 28Q8 119 57 140H143Q192 119 100 28','M100 28L157 59v64l-57 26-57-26V59Z','M40 133Q36 70 100 28Q150 68 161 133'];
  const seat=path('M33 133h134v16H33Z',g('wood'))+line('M39 137h122',1.4,'#f6e1b4')+line('M43 144q41-5 111 0',.8,'#aa875c');
  const wrap=index===4?line('M41 47l5 4m-5 10 5 4m-5 10 5 4m-5 10 5 4m108-44 5 4m-5 10 5 4m-5 10 5 4',2,c):'';
  return `<ellipse cx="100" cy="13" rx="6" ry="9" fill="none" stroke="#ac9467" stroke-width="3"/>`+line(index===3?'M100 22v18':'M100 22v6',3,'#ac9467')+frame(outlines[index])+seat+wrap+path('M46 133v16m108-16v16','none',g('glaze'),8)+tierTrim('M58 141h84')+(level===3?circle(46,141,2,g('gold'))+circle(154,141,2,g('gold')):'');
 }
 if(slot==='toy'){
  const cord=d=>line(d,2.8,'#a38c62')+line(d,1,'#e8d6ae');
  const bead=(x,y,r=14)=>circle(x,y,r)+line(`M${x-r*.6} ${y-3}q3-${r*.7} ${r*.7}-${r*.6}`,1.6,ivory);
  const ring=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${edge}" stroke-width="8"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${g('glaze')}" stroke-width="5"/>`;
  const leaf=(x,y,flip=1)=>path(`M${x} ${y}q${-30*flip}-25 ${-14*flip}-42q${34*flip} 4 ${14*flip} 42Z`,g('wood'))+line(`M${x} ${y}l${-12*flip}-32`,1,pale);
  const forms=[()=>cord('M100 22v129')+bead(100,50,22)+path('M100 81l23 21-23 20-23-20Z',g('wood'))+path('M83 151q0-23 17-24q17 1 17 24Z',g('gold'),edge)+`<ellipse cx="100" cy="151" rx="17" ry="5" fill="#ac8b56"/>`,()=>cord('M100 22v14')+ring(100,56,23)+ring(100,94,23)+ring(100,132,23),()=>cord('M100 22L64 43v107M100 22l36 21v107')+[53,82,111,140].map((y,i)=>path(`M58 ${y}h84v11H58Z`,i%2?g('glaze'):g('wood'),edge)).join(''),()=>cord('M100 22v132')+[[-18,-10],[18,-10],[0,-28],[-12,18],[12,18]].map(([x,y])=>bead(100+x,75+y,13)).join('')+bead(100,75,12)+bead(100,129,17),()=>cord('M100 22v30M53 57h94M53 57v40m94-40v40M100 57v78')+ring(53,115,20)+ring(147,115,20)+ring(100,145,16),()=>cord('M100 22v132M100 51L66 74m34-2 34 22')+leaf(67,94)+leaf(133,114,-1)+leaf(100,157),()=>cord('M100 22v135')+[48,88,128].map((y,i)=>path(`M100 ${y-19}l24 13v26l-24 13-24-13v-26Z`,i%2?g('wood'):g('glaze'),edge)+line(`M76 ${y-6}l24 13 24-13M100 ${y+7}v26`,1,pale)).join(''),()=>cord('M100 22v130')+[57,118].map(y=>bead(100,y,26)+[-14,-7,0,7,14].map(x=>line(`M${100+x} ${y-22}q${-x} 22 0 44`,1,'#b89b68')).join('')+[-12,0,12].map(dy=>line(`M78 ${y+dy}q22 6 44 0`,1,'#eaddb9')).join('')).join('')];
  return `<ellipse cx="100" cy="13" rx="5" ry="9" fill="none" stroke="#af986d" stroke-width="2.5"/>`+forms[index]()+ (level>1?bead(100,25,level===3?7:5):'');
 }
 if(slot==='paper'){
  const outlines=['M38 46H162L187 145H13Z','M49 46H151Q161 46 164 57L184 132Q188 145 174 145H26Q12 145 17 132L36 57Q39 46 49 46Z','M38 46q15 8 31 0t31 0t31 0t31 0l25 99q-20-8-43 0t-44 0t-44 0t-43 0Z','M56 46h88l40 49-21 50H37L16 95Z','M38 46H162L187 145H13Z','M38 46H162L187 145H13Z','M38 46H162L187 145H13Z','M38 46H162L187 145H13Z'];
  const id=`paper-form-${index}-${c.slice(1)}-${level}`;
  let out=shadow(100,153,88,9)+(index===7?path('M29 53h131l33 95-174 7Z','#d8caa8','#ae9c7a'):'')+path(outlines[index],g('paper'),'#b9a887');
  const motifs=Array.from({length:20},(_,i)=>{const x=45+i%5*27,y=64+Math.floor(i/5)*21;const motif=index%4;return motif===0?line(`M${x} ${y+8}q-8-11 0-15q8 4 0 15m0-7 7-5`,1,c):motif===1?`<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${c}"/>`:motif===2?path(`M${x-7} ${y-5}h13v10h-13Z`,i%2?pale:c,'none'):line(`M${x-6} ${y}l6-6 6 6-6 6Z`,1,c);}).join('');
  out+=`<clipPath id="${id}">${path(outlines[index])}</clipPath><g clip-path="url(#${id})">${motifs}</g>`;
  out+=index===4?path('M162 46l25 99q-16-15-37-9Z',g('rim'),'#b6a37f'):line('M42 54H157L177 137H24',1,ivory);
  if(level>1)out+=line('M48 60h104m-123 76h141',level===3?2:1,level===3?g('gold'):c);
  return out;
 }
 return null;
}

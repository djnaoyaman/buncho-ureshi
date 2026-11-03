// Canonical host box is shared with garden-bird-motion.js (850:1000).
// A single scalar preserves anatomy; neither axis is independently stretched.
const finite=Number.isFinite;
export function omochiFrameGeometry(frame,{factor=1.2}={}) {
 if(!frame||!Array.isArray(frame.dimensions)||frame.dimensions.length!==2||!frame.dimensions.every(v=>finite(v)&&v>0)||!finite(frame.render_scale)||frame.render_scale<=0||!Array.isArray(frame.render_offset)||frame.render_offset.length!==2||!frame.render_offset.every(finite)||!finite(factor)||factor<=0||factor>3)return null;
 const [w,h]=frame.dimensions,s=frame.render_scale*factor;
 const left=459+(frame.render_offset[0]-640)*factor,top=975+(frame.render_offset[1]-1110)*factor;
 const b=frame.alphaBounds;
 if(!Array.isArray(b)||b.length!==4||!b.every(finite)||b[0]<0||b[1]<0||b[2]>w||b[3]>h||b[2]<=b[0]||b[3]<=b[1])return null;
 return {image:{left:left/850,top:top/1000,width:w*s/850,height:h*s/1000},visible:{left:(left+b[0]*s)/850,top:(top+b[1]*s)/1000,right:(left+b[2]*s)/850,bottom:(top+b[3]*s)/1000}};
}
export function omochiAnimationEnvelope(frames,options) {
 if(!Array.isArray(frames)||!frames.length)return null;
 const boxes=frames.map(f=>omochiFrameGeometry(f,options)?.visible);if(boxes.some(b=>!b))return null;
 return {left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))};
}
export function projectOmochiEnvelope(spriteRect,envelope){
 if(!spriteRect||!envelope||!['left','right','top','bottom'].every(k=>finite(spriteRect[k])&&finite(envelope[k]))||spriteRect.right<=spriteRect.left||spriteRect.bottom<=spriteRect.top||envelope.right<=envelope.left||envelope.bottom<=envelope.top)return null;
 const w=spriteRect.right-spriteRect.left,h=spriteRect.bottom-spriteRect.top;
 return {left:spriteRect.left+envelope.left*w,right:spriteRect.left+envelope.right*w,top:spriteRect.top+envelope.top*h,bottom:spriteRect.top+envelope.bottom*h};
}

/** Exercise the real candidate and confirmation controls; supports the frozen baseline. */
export function selectGarden(root,id){
 const jog=root.querySelector('[data-garden-jog]');
 if(!jog){root.querySelector(`[data-garden-select="${id}"]`).click();return;}
 for(let i=0;i<100&&jog.dataset.preview!==id;i++)root.querySelector('[data-garden-scroll="next"]').click();
 if(jog.dataset.preview!==id)throw Error('Garden candidate missing: '+id);
 root.querySelector('[data-jog-center]').click();
}

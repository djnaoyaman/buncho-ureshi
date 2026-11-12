/** Exercise each real arrow arrival and wait for its saved selection before continuing. */
export async function selectGarden(root,id){
 if(!root.querySelector('[data-garden-jog]')){root.querySelector(`[data-garden-select="${id}"]`).click();return;}
 for(let i=0;i<100;i++){
  const jog=root.querySelector('[data-garden-jog]');
  if(jog.querySelector('[data-jog-center]').dataset.gardenSelect===id)return;
  root.querySelector('[data-garden-scroll="next"]').click();
  const target=root.querySelector('[data-garden-jog]').dataset.preview;
  root.querySelector('[data-jog-center]').click(); // Compatible with the frozen candidate-only baseline.
  let done=false;
  for(let n=0;n<200;n++){
   await new Promise(resolve=>setTimeout(resolve,10));
   if(root.querySelector('[data-jog-center]')?.dataset.gardenSelect===target&&root.getAttribute('aria-busy')!=='true'){done=true;break;}
  }
  if(!done)throw Error('Garden arrival did not finish: '+target);
 }
 throw Error('Garden missing: '+id);
}

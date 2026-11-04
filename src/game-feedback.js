// Ordinary action feedback expires independently of world updates and rendering.
// Errors and danger notices are owned by their existing, persistent UI.
export function feedbackDuration(text) {
  return Math.min(8000, Math.max(4000, Array.from(String(text)).length * 180));
}
export function createFeedbackTimer(onExpire, {schedule=setTimeout,cancel=clearTimeout}={}) {
  let timer=null, generation=0;
  return {
    set(text,{persistent=false}={}) {
      const token=++generation;
      if(timer!==null)cancel(timer);
      timer=null;
      if(text&&!persistent)timer=schedule(()=>{if(token!==generation)return;timer=null;onExpire();},feedbackDuration(text));
    },
    destroy(){generation++;if(timer!==null)cancel(timer);timer=null;},
  };
}

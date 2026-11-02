export function deferred() {let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
export function audioRig({held=false,reject=false}={}) {
  const contexts=[],gate=deferred();
  class Param {constructor(){this.events=[];}setValueAtTime(...args){this.events.push(['set',...args]);}linearRampToValueAtTime(...args){this.events.push(['linear',...args]);}exponentialRampToValueAtTime(...args){this.events.push(['exponential',...args]);}cancelScheduledValues(...args){this.events.push(['cancel',...args]);}}
  class Context {
    constructor(){this.state='suspended';this.currentTime=10;this.destination={};this.nodes=[];this.gains=[];this.resumes=0;this.closes=0;contexts.push(this);}
    resume(){this.resumes++;if(reject)return Promise.reject(new Error('audio denied'));return (held?gate.promise:Promise.resolve()).then(()=>{if(this.state!=='closed')this.state='running';});}
    createOscillator(){const node={frequency:new Param(),starts:[],stops:[],disconnected:0,connect(){},disconnect(){this.disconnected++;},start(time){this.starts.push(time);},stop(time){this.stops.push(time);}};this.nodes.push(node);return node;}
    createGain(){const gain={gain:new Param(),connect(){},disconnect(){}};this.gains.push(gain);return gain;}
    close(){this.closes++;this.state='closed';return Promise.resolve();}
  }
  return {Context,contexts,gate,get starts(){return contexts.flatMap(c=>c.nodes).flatMap(n=>n.starts).length;}};
}

import type {Snapshot} from '../../shared/multiplayer';
export class SnapshotBuffer{
 private renderTime=-Infinity;
 private samples:{state:Snapshot;received:number}[]=[];
 push(state:Snapshot,received:number){const last=this.samples.at(-1);if(last&&(last.state.code!==state.code||state.time<last.state.time||last.state.phase!==state.phase)){this.samples=[];this.renderTime=-Infinity;}const tail=this.samples.at(-1);if(tail&&tail.state.time===state.time)this.samples[this.samples.length-1]={state,received};else this.samples.push({state,received});while(this.samples.length>12)this.samples.shift();}
 position(kind:'players'|'enemies'|'shots',id:string,now:number,fallback:{x:number;z:number}){const latest=this.samples.at(-1);if(!latest||this.samples.length<2)return fallback;const renderTime=Math.min(latest.state.time,Math.max(this.renderTime,latest.state.time-.12+Math.max(0,now-latest.received)/1000));this.renderTime=renderTime;let a=this.samples[0],b=latest;for(let i=1;i<this.samples.length;i++)if(this.samples[i].state.time>=renderTime){a=this.samples[i-1];b=this.samples[i];break;}const first=a.state[kind].find(o=>o.id===id),last=b.state[kind].find(o=>o.id===id);if(!first||!last)return fallback;const delta=b.state.time-a.state.time,t=delta>0?Math.max(0,Math.min(1,(renderTime-a.state.time)/delta)):1;return {x:first.x+(last.x-first.x)*t,z:first.z+(last.z-first.z)*t};}
 clear(){this.samples=[];this.renderTime=-Infinity;}
}

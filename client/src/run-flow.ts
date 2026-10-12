export class RunFlow{
 mode:'menu'|'playing'|'paused'|'finished'='menu';
 elapsed=0;kills=0;upgrades:string[]=[];
 start(){this.mode='playing';this.elapsed=0;this.kills=0;this.upgrades=[];}
 pause(){if(this.mode==='playing')this.mode='paused';}
 resume(){if(this.mode==='paused')this.mode='playing';}
 finish(){this.mode='finished';}
 menu(){this.mode='menu';}
 tick(dt:number){if(this.mode==='playing')this.elapsed+=dt;}
 get time(){const s=Math.floor(this.elapsed);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
}

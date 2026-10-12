import type { Point } from './navigation';
export const enemyTypes={
 pursuer:{name:'Pursuer',health:75,speed:2.6,damage:10,cooldown:1.2,color:0xdd5363},
 runner:{name:'Runner',health:50,speed:4,damage:8,cooldown:.9,color:0xcf83ff},
 armored:{name:'Armored',health:150,speed:1.6,damage:18,cooldown:1.8,color:0xffbb58}
};
export type EnemyKind=keyof typeof enemyTypes;
export const waves:EnemyKind[][]=[['pursuer','runner'],['pursuer','runner','armored'],['pursuer','runner','runner','armored','armored']];
export function safeSpawn(player:Point,occupied:Point[],blocked:(x:number,z:number)=>boolean):Point|null{
 const candidates:Point[]=[];
 for(let x=-17;x<=17;x+=2)for(let z=-17;z<=17;z+=2){
  if(!blocked(x,z)&&Math.hypot(x-player.x,z-player.z)>=8&&occupied.every(p=>Math.hypot(x-p.x,z-p.z)>=3))candidates.push({x,z});
 }
 candidates.sort((a,b)=>Math.hypot(b.x-player.x,b.z-player.z)-Math.hypot(a.x-player.x,a.z-player.z));
 return candidates[0]??null;
}

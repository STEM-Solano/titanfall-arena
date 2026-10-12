export type Point = { x: number; z: number };
// Four-neighbor grid search; every edge is checked at small intervals for clearance.
export function findPath(start: Point, goal: Point, blocked: (x: number, z: number) => boolean): Point[] {
 const clear = (a: Point, b: Point) => {
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1));
  for(let i=0;i<=steps;i++)if(blocked(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;
  return true;
 };
 const cells:Point[]=[];
 for(let x=-18;x<=18;x++)for(let z=-18;z<=18;z++)if(!blocked(x,z))cells.push({x,z});
 const nearest=(p:Point,requireClear:boolean)=>cells.filter(c=>!requireClear||clear(p,c)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
 const first=nearest(start,true),last=nearest(goal,false);if(!first||!last)return [];
 const key=(p:Point)=>`${p.x},${p.z}`,valid=new Set(cells.map(key));
 const queue=[first],parents=new Map<string,Point|null>([[key(first),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  if(key(p)===key(last)){
   const path:Point[]=[];let node:Point|null=p;
   while(node){path.unshift(node);node=parents.get(key(node))??null;}
   if(clear(last,goal))path.push({...goal});return path;
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const n={x:p.x+dx,z:p.z+dz};if(valid.has(key(n))&&!parents.has(key(n))&&clear(p,n)){parents.set(key(n),p);queue.push(n);}
  }
 }
 return [];
}

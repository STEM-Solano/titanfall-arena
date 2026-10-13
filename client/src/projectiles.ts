export type HitBox={x:number;z:number;w:number;d:number};
// Segment/AABB intersection prevents fast projectiles tunneling through cover.
export function segmentHit(ax:number,az:number,bx:number,bz:number,box:HitBox,padding=.12):number|null{
 let near=0,far=1;
 for(const [a,b,center,size] of [[ax,bx,box.x,box.w],[az,bz,box.z,box.d]]){
  const min=center-size/2-padding,max=center+size/2+padding,delta=b-a;
  if(Math.abs(delta)<1e-10){if(a<min||a>max)return null;continue;}
  let t1=(min-a)/delta,t2=(max-a)/delta;if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return null;
 }
 return near;
}

import * as THREE from 'three';
import './style.css';
import type { CharacterState } from '../../shared/game';
const state: CharacterState = { className: 'Vanguard', health: 100, maxHealth: 100 };
document.querySelector('aside .eyebrow')!.textContent = `OPERATOR / ${state.className}`;
const error = document.querySelector<HTMLDivElement>('#error')!;
function fail(message: string) { error.hidden = false; error.textContent = message; }
try { start(); } catch (e) { fail(`Unable to start 3D rendering: ${e instanceof Error ? e.message : e}`); }
function start() {
 const scene = new THREE.Scene(); scene.background = new THREE.Color(0x080e18); scene.fog = new THREE.FogExp2(0x080e18, .014);
 const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true;
 renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.querySelector('#app')!.append(renderer.domElement);
 const camera = new THREE.PerspectiveCamera(48, 1, .1, 150);
 scene.add(new THREE.HemisphereLight(0xa2e4ff, 0x182035, 2));
 const sun = new THREE.DirectionalLight(0xb2d5ff, 3); sun.position.set(8, 20, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25}); scene.add(sun);
 function material(color:number, emissive=0) { return new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:1,roughness:.65,metalness:.4}); }
 const floorMat=material(0x17283c), dark=material(0x223a4c), glow=material(0x58dccb,0x239e91), orange=material(0xfa9761,0x773514);
 function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,parent:THREE.Object3D=scene) {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 box(40,.5,40,0,-.25,0,floorMat);
 const grid=new THREE.GridHelper(40,20,0x407a83,0x284352);grid.position.y=.01;scene.add(grid);
 for(const s of [-1,1]){box(41,1.6,.7,0,.8,s*20,dark);box(.7,1.6,40,s*20,.8,0,dark);box(40,.08,.08,0,1.64,s*19.7,glow);box(.08,.08,40,s*19.7,1.64,0,glow);}
 const obstacles=[{x:-7,z:-5,w:5,d:3},{x:7,z:-6,w:3,d:6},{x:-8,z:7,w:4,d:4},{x:7,z:7,w:6,d:3}];
 for(const o of obstacles){box(o.w,1.8,o.d,o.x,.9,o.z,dark);box(o.w+.08,.08,o.d+.08,o.x,1.85,o.z,glow);box(o.w*.55,.18,.1,o.x,1.1,o.z+o.d/2+.01,orange);}
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3.6,.035,8,64),glow);ring.rotation.x=Math.PI/2;ring.position.y=.04;scene.add(ring);
 const player=new THREE.Group();scene.add(player);
 const body=box(.7,.9,.55,0,1,0,material(0xe7eeee),player);box(.82,.28,.64,0,1.4,0,dark,player);box(.5,.45,.48,0,1.8,0,dark,player);box(.42,.12,.03,0,1.84,-.255,glow,player);
 box(.22,.55,.27,-.23,.3,0,dark,player);box(.22,.55,.27,.23,.3,0,dark,player);box(.22,.65,.3,-.5,1,0,orange,player);box(.22,.65,.3,.5,1,0,orange,player);
 const halo=new THREE.Mesh(new THREE.RingGeometry(.65,.72,40),new THREE.MeshBasicMaterial({color:0x66eed8,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.y=.03;player.add(halo);
 // Training combat stays local and independent of movement input.
 const targetMaterial=material(0xffb45c,0x55300c);
 const target=new THREE.Group();target.position.set(0,0,-3);scene.add(target);
 box(1.1,1.6,1.1,0,.9,0,targetMaterial,target);
 box(.65,.4,.65,0,1.9,0,targetMaterial,target);
 const panel=document.createElement('section');panel.id='training';
 panel.innerHTML='<span class="eyebrow">TRAINING TARGET</span><label for="target-health">100 / 100 HP</label><progress id="target-health" max="100" value="100"></progress><p role="status" aria-live="polite">Get close · Space or Attack</p>';
 document.body.append(panel);
 const healthBar=panel.querySelector('progress')!;
 const healthLabel=panel.querySelector('label')!;
 const feedback=panel.querySelector('p')!;
 const attackButton=document.createElement('button');attackButton.id='attack';attackButton.type='button';attackButton.textContent='Attack';document.body.append(attackButton);
 const pulse=new THREE.Mesh(new THREE.RingGeometry(.4,.6,48),new THREE.MeshBasicMaterial({color:0x9ffff1,transparent:true,opacity:0,side:THREE.DoubleSide}));pulse.rotation.x=-Math.PI/2;pulse.position.y=.08;scene.add(pulse);
 let targetHealth=100,cooldown=0,flash=0,respawn=0,pulseTime=0;
 function updateHealth(){healthBar.value=targetHealth;healthLabel.textContent=`${targetHealth} / 100 HP`;}
 function attack(){
  if(document.hidden||cooldown>0)return;
  cooldown=.45;pulseTime=.25;pulse.position.set(player.position.x,.08,player.position.z);
  if(targetHealth<=0){feedback.textContent='Target respawning…';return;}
  if(player.position.distanceTo(target.position)>3){feedback.textContent='Miss · Move within 3 meters';return;}
  targetHealth=Math.max(0,targetHealth-25);flash=.18;updateHealth();
  feedback.textContent=targetHealth===0?'Target defeated · Respawn in 3 seconds':'Hit! −25 HP';
  if(targetHealth===0){target.visible=false;respawn=3;}
 }
 window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat)attack();}});
 attackButton.addEventListener('click',attack);
 const keys=new Set<string>();const accepted=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
 window.addEventListener('keydown',e=>{if(accepted.includes(e.code)){e.preventDefault();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));
 const pad=document.querySelector<HTMLDivElement>('#joystick')!,stick=document.querySelector<HTMLDivElement>('#stick')!;let pointer:number|null=null;const touch=new THREE.Vector2();
 const reset=()=>{keys.clear();touch.set(0,0);pointer=null;stick.style.transform='';};window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 function drag(e:PointerEvent){const r=pad.getBoundingClientRect();touch.set((e.clientX-r.left-r.width/2)/38,(e.clientY-r.top-r.height/2)/38);if(touch.length()>1)touch.normalize();stick.style.transform=`translate(${touch.x*38}px,${touch.y*38}px)`;}
 pad.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;pad.setPointerCapture(pointer);drag(e);});pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)drag(e);});for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,()=>{touch.set(0,0);pointer=null;stick.style.transform='';});
 const radius=.65,limit=19-radius;
 function overlapsBox(x:number,z:number,o:{x:number,z:number,w:number,d:number},padding=0){
  const nx=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2));
  const nz=Math.max(o.z-o.d/2,Math.min(z,o.z+o.d/2));
  return (x-nx)**2+(z-nz)**2<(radius+padding)**2;
 }
 const targetBounds={x:target.position.x,z:target.position.z,w:1.1,d:1.1};
 function blocked(x:number,z:number){return obstacles.some(o=>overlapsBox(x,z,o))||(targetHealth>0&&overlapsBox(x,z,targetBounds));}
 const cameraOffset=new THREE.Vector3(0,19,16);camera.position.copy(cameraOffset);const look=new THREE.Vector3();
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('Graphics context lost. Reload to resume.');});
 let previous=performance.now();function frame(now:number){const dt=Math.min((now-previous)/1000,.05);previous=now;
 cooldown=Math.max(0,cooldown-dt);flash=Math.max(0,flash-dt);pulseTime=Math.max(0,pulseTime-dt);
 attackButton.disabled=cooldown>0;
 targetMaterial.emissive.setHex(flash>0?0xffffff:0x55300c);
 pulse.scale.setScalar(1+(1-pulseTime/.25)*4);pulse.material.opacity=pulseTime/.25*.65;
 if(targetHealth===0){
  respawn=Math.max(0,respawn-dt);
  if(respawn===0){
   // A small clearance margin keeps the returning target from touching the player.
   if(overlapsBox(player.position.x,player.position.z,targetBounds,.05)){
    feedback.textContent='Respawn waiting · Clear the target area';
   }else{
    targetHealth=100;target.visible=true;updateHealth();feedback.textContent='Target ready · Get close and attack';
   }
  }
 }
 const input=new THREE.Vector2(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+touch.x,Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+touch.y);if(input.length()>1)input.normalize();
 // Small steps keep movement from crossing collision surfaces even after a slow frame.
 const steps=Math.max(1,Math.ceil(6*dt/.1));for(let i=0;i<steps;i++){const x=THREE.MathUtils.clamp(player.position.x+input.x*6*dt/steps,-limit,limit);if(!blocked(x,player.position.z))player.position.x=x;const z=THREE.MathUtils.clamp(player.position.z+input.y*6*dt/steps,-limit,limit);if(!blocked(player.position.x,z))player.position.z=z;}
 if(input.lengthSq()>.001){const target=Math.atan2(-input.x,-input.y);player.rotation.y+=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y))*(1-Math.exp(-14*dt));}body.position.y=1+(input.lengthSq()>.01?Math.sin(now*.015)*.04:0);
 camera.position.lerp(player.position.clone().add(cameraOffset),1-Math.exp(-5*dt));look.lerp(player.position,1-Math.exp(-7*dt));camera.lookAt(look);renderer.render(scene,camera);requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}

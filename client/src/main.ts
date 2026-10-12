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
 const keys=new Set<string>();const accepted=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
 window.addEventListener('keydown',e=>{if(accepted.includes(e.code)){e.preventDefault();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));
 const pad=document.querySelector<HTMLDivElement>('#joystick')!,stick=document.querySelector<HTMLDivElement>('#stick')!;let pointer:number|null=null;const touch=new THREE.Vector2();
 const reset=()=>{keys.clear();touch.set(0,0);pointer=null;stick.style.transform='';};window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 function drag(e:PointerEvent){const r=pad.getBoundingClientRect();touch.set((e.clientX-r.left-r.width/2)/38,(e.clientY-r.top-r.height/2)/38);if(touch.length()>1)touch.normalize();stick.style.transform=`translate(${touch.x*38}px,${touch.y*38}px)`;}
 pad.addEventListener('pointerdown',e=>{if(pointer!==null)return;pointer=e.pointerId;pad.setPointerCapture(pointer);drag(e);});pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)drag(e);});for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,()=>{touch.set(0,0);pointer=null;stick.style.transform='';});
 const radius=.65,limit=19-radius;
 function blocked(x:number,z:number){return obstacles.some(o=>{const nx=Math.max(o.x-o.w/2,Math.min(x,o.x+o.w/2));const nz=Math.max(o.z-o.d/2,Math.min(z,o.z+o.d/2));return (x-nx)**2+(z-nz)**2<radius**2;});}
 const cameraOffset=new THREE.Vector3(0,19,16);camera.position.copy(cameraOffset);const look=new THREE.Vector3();
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('Graphics context lost. Reload to resume.');});
 let previous=performance.now();function frame(now:number){const dt=Math.min((now-previous)/1000,.05);previous=now;
 const input=new THREE.Vector2(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+touch.x,Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+touch.y);if(input.length()>1)input.normalize();
 // Small steps keep movement from crossing collision surfaces even after a slow frame.
 const steps=Math.max(1,Math.ceil(6*dt/.1));for(let i=0;i<steps;i++){const x=THREE.MathUtils.clamp(player.position.x+input.x*6*dt/steps,-limit,limit);if(!blocked(x,player.position.z))player.position.x=x;const z=THREE.MathUtils.clamp(player.position.z+input.y*6*dt/steps,-limit,limit);if(!blocked(player.position.x,z))player.position.z=z;}
 if(input.lengthSq()>.001){const target=Math.atan2(-input.x,-input.y);player.rotation.y+=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y))*(1-Math.exp(-14*dt));}body.position.y=1+(input.lengthSq()>.01?Math.sin(now*.015)*.04:0);
 camera.position.lerp(player.position.clone().add(cameraOffset),1-Math.exp(-5*dt));look.lerp(player.position,1-Math.exp(-7*dt));camera.lookAt(look);renderer.render(scene,camera);requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}

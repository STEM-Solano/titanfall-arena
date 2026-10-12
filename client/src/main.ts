import * as THREE from 'three';
import './style.css';
import { RunFlow } from './run-flow';
import { Progression, type Upgrade } from './progression';
import { enemyTypes, waves, safeSpawn, type EnemyKind } from './waves';
import { HunterAbility } from './hunter';
import { findPath, type Point } from './navigation';
import type { CharacterState } from '../../shared/game';
const state: CharacterState = { className: 'Hunter', health: 100, maxHealth: 100 };
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
 type Enemy={kind:EnemyKind,mesh:THREE.Group,material:THREE.MeshStandardMaterial,health:number,cooldown:number,flash:number,pathTimer:number,path:Point[]};
 const enemies:Enemy[]=[];const pickups:THREE.Group[]=[];
 let waveIndex=0,waveDelay=0,pending:EnemyKind[]=[],victorious=false;
 const enemyPanel=document.createElement('section');enemyPanel.id='enemy-info';enemyPanel.innerHTML='<span class="eyebrow">WAVE 1 / 3</span><p>Preparing encounter</p>';document.body.append(enemyPanel);
 const victory=document.createElement('section');victory.id='victory';victory.hidden=true;victory.innerHTML='<h2>Victory</h2><p>All three waves cleared.</p><div class="run-summary"></div><button type="button" class="play-again">Play Again</button><button type="button" class="return-menu">Return to Menu</button>';document.body.append(victory);
 function updateEnemyHealth(){enemyPanel.querySelector('.eyebrow')!.textContent=`WAVE ${waveIndex+1} / ${waves.length}`;enemyPanel.querySelector('p')!.textContent=waveDelay>0?`Next wave in ${Math.ceil(waveDelay)}s`:enemies.filter(e=>e.health>0).map(e=>`${enemyTypes[e.kind].name} ${e.health} HP`).join(' · ')||'Wave cleared';}
 function dropPickup(position:THREE.Vector3){const pickup=new THREE.Group();pickup.position.copy(position);scene.add(pickup);const green=material(0x6bff9b,0x27a554);box(.65,.25,.65,0,.35,0,green,pickup);box(.14,.08,.45,0,.52,0,material(0xffffff),pickup);box(.45,.08,.14,0,.52,0,material(0xffffff),pickup);pickups.push(pickup);}
 function disposeGroup(group:THREE.Group){scene.remove(group);group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}
 function spawnPending(){
  while(pending.length){const pos=safeSpawn(player.position,[ally.position,...enemies.filter(e=>e.health>0).map(e=>e.mesh.position)],blocked);if(!pos)break;
   const kind=pending.shift()!,stats=enemyTypes[kind],mesh=new THREE.Group(),mat=material(stats.color,0x331525);mesh.position.set(pos.x,0,pos.z);scene.add(mesh);
   if(kind==='runner'){box(.55,.85,.55,0,.6,0,mat,mesh);box(.3,.5,.3,0,1.3,0,mat,mesh);box(1,.12,.3,0,.8,0,mat,mesh);}
   else if(kind==='armored'){box(1.2,1.4,1.1,0,.8,0,mat,mesh);box(1.2,.25,.8,0,1.7,0,mat,mesh);box(.9,.8,.12,0,1,-.65,mat,mesh);}
   else{box(.9,1.2,.8,0,.8,0,mat,mesh);box(.65,.5,.65,0,1.6,0,mat,mesh);}
   enemies.push({kind,mesh,material:mat,health:stats.health,cooldown:0,flash:0,pathTimer:enemies.length*.08,path:[]});
  }
 }
 const damageOverlay=document.createElement('div');damageOverlay.id='damage-flash';document.body.append(damageOverlay);
 const defeat=document.createElement('section');defeat.id='defeat';defeat.hidden=true;defeat.innerHTML='<h2>Defeated</h2><p>The pursuer caught you. Try again.</p><div class="run-summary"></div><button type="button" class="play-again">Play Again</button><button type="button" class="return-menu">Return to Menu</button>';document.body.append(defeat);
 const healingOverlay=document.createElement('div');healingOverlay.id='healing-flash';document.body.append(healingOverlay);
 const healingNotice=document.createElement('div');healingNotice.id='healing-notice';healingNotice.setAttribute('role','status');healingNotice.setAttribute('aria-live','polite');document.body.append(healingNotice);
 let healingTime=0,healedAmount=0;
 let damageTime=0;
 function updatePlayerHealth(){document.querySelector('aside strong')!.innerHTML=`${Math.ceil(state.health)} <small>/ ${state.maxHealth} HP</small>`;document.querySelector<HTMLElement>('aside .health i')!.style.width=`${state.health/state.maxHealth*100}%`;document.querySelector('aside p')!.textContent=state.health===0?'Operator defeated':damageTime>0?'Taking damage · Find cover':healingTime>0?`Healed +${healedAmount} HP`:hunter.remaining>0?'Invisible · Healing 5 HP/s':'Systems nominal';}
 const flow=new RunFlow();
 const startMenu=document.createElement('section');startMenu.id='start-menu';startMenu.innerHTML='<h2>Titanfall Arena</h2><p>Hunter · Survive three waves</p><div class="controls-guide"><p>Move: WASD / arrow keys / touch joystick</p><p>Attack: Space / Attack · Cloak: Q / Cloak</p><p>Revive: hold E / Revive near the blue ally while cloaked</p><p>Upgrades: 1 / 2 / 3 or select a button</p><p>Pause: Esc / Pause · Desktop and iPad landscape recommended</p></div><button type="button">Start Run</button>';document.body.append(startMenu);
 const pauseScreen=document.createElement('section');pauseScreen.id='pause-screen';pauseScreen.hidden=true;pauseScreen.innerHTML='<h2>Paused</h2><p>Encounter and timers are paused.</p><button type="button" class="resume">Resume</button><button type="button" class="return-menu">Return to Menu</button>';document.body.append(pauseScreen);
 const pauseButton=document.createElement('button');pauseButton.id='pause-button';pauseButton.type='button';pauseButton.textContent='Pause · Esc';document.body.append(pauseButton);
 function updateFlow(){startMenu.hidden=flow.mode!=='menu';pauseScreen.hidden=flow.mode!=='paused';pauseButton.hidden=flow.mode!=='playing';pauseButton.disabled=progression.paused;}
 function togglePause(){if(progression.paused)return;if(flow.mode==='playing'){flow.pause();reset();pauseScreen.querySelector<HTMLButtonElement>('.resume')!.focus();}else if(flow.mode==='paused'){flow.resume();reset();}updateFlow();}
 function returnToMenu(){restart();flow.menu();reset();updateFlow();startMenu.querySelector<HTMLButtonElement>('button')!.focus();}
 function finishRun(screen:HTMLElement){flow.finish();screen.querySelector('.run-summary')!.textContent=`Enemies defeated: ${flow.kills} · Level: ${progression.level} · Run time: ${flow.time} · Upgrades: ${flow.upgrades.join('; ')||'None'}`;updateFlow();}
 pauseButton.addEventListener('click',togglePause);pauseScreen.querySelector('.resume')!.addEventListener('click',togglePause);pauseScreen.querySelector('.return-menu')!.addEventListener('click',returnToMenu);
 startMenu.querySelector('button')!.addEventListener('click',restart);
 for(const screen of [defeat,victory])screen.querySelector('.return-menu')!.addEventListener('click',returnToMenu);
 window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();if(!e.repeat)togglePause();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&flow.mode==='playing'&&!progression.paused){flow.pause();reset();updateFlow();}});
 const progression=new Progression();
 const xpPanel=document.createElement('section');xpPanel.id='xp-hud';xpPanel.innerHTML='<span>Level 1</span><progress max="100" value="0" aria-label="XP progress"></progress><small>0 / 100 XP</small>';document.body.append(xpPanel);
 const upgradeScreen=document.createElement('section');upgradeScreen.id='upgrades';upgradeScreen.hidden=true;upgradeScreen.setAttribute('role','dialog');upgradeScreen.setAttribute('aria-modal','true');upgradeScreen.setAttribute('aria-label','Choose level upgrade');
 upgradeScreen.innerHTML='<h2>Level up</h2><p>Encounter paused · Choose one upgrade</p><button data-upgrade="damage"></button><button data-upgrade="health"></button><button data-upgrade="cloak"></button>';document.body.append(upgradeScreen);
 const upgradeKinds:Upgrade[]=['damage','health','cloak'];
 function updateProgression(){
  xpPanel.querySelector('span')!.textContent=`Level ${progression.level}`;xpPanel.querySelector('progress')!.value=progression.xp;xpPanel.querySelector('progress')!.max=progression.threshold;xpPanel.querySelector('small')!.textContent=`${progression.xp} / ${progression.threshold} XP`;
  upgradeScreen.hidden=!progression.paused;
  upgradeKinds.forEach((kind,i)=>{upgradeScreen.querySelector<HTMLButtonElement>(`[data-upgrade="${kind}"]`)!.textContent=`${i+1}. ${progression.effect(kind)}`;});
 }
 function showUpgrades(){updateProgression();if(progression.paused){reset();upgradeScreen.querySelector<HTMLButtonElement>('button')!.focus();}}
 function chooseUpgrade(kind:Upgrade){const chosen=progression.effect(kind);if(!progression.choose(kind))return;flow.upgrades.push(chosen);
  if(kind==='health'){state.maxHealth=progression.maxHealth;state.health=Math.min(state.maxHealth,state.health+25);}
  hunter.cooldownDuration=progression.cloakCooldown;hunter.cooldown=Math.min(hunter.cooldown,progression.cloakCooldown);
  reset();updatePlayerHealth();showUpgrades();
 }
 upgradeKinds.forEach(kind=>upgradeScreen.querySelector(`[data-upgrade="${kind}"]`)!.addEventListener('click',()=>chooseUpgrade(kind)));
 window.addEventListener('keydown',e=>{if(progression.paused){if(['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();if(!e.repeat)chooseUpgrade(upgradeKinds[Number(e.code.slice(-1))-1]);}if(e.code==='Tab'){e.preventDefault();const buttons=upgradeKinds.map(kind=>upgradeScreen.querySelector<HTMLButtonElement>(`[data-upgrade="${kind}"]`)!);const current=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(current+(e.shiftKey?2:1)+3)%3].focus();}}});
 const hunter=new HunterAbility();
 const ally=new THREE.Group();ally.position.set(-3,0,1);scene.add(ally);
 const allyMaterial=material(0x639dff,0x183b77);
 const allyBody=box(1.5,.4,.6,0,.25,0,allyMaterial,ally);box(.4,.4,.4,-.9,.25,0,allyMaterial,ally);
 const abilityButton=document.createElement('button');abilityButton.id='ability';abilityButton.type='button';abilityButton.textContent='Cloak · Q';document.body.append(abilityButton);
 const reviveButton=document.createElement('button');reviveButton.id='revive';reviveButton.type='button';reviveButton.textContent='Hold Revive · E';document.body.append(reviveButton);
 const abilityPanel=document.createElement('section');abilityPanel.id='hunter-hud';abilityPanel.innerHTML='<span class="eyebrow">HUNTER / CLOAK</span><p>Ready · Q</p><label>Downed ally · Cloak and hold E nearby</label><progress max="3" value="0" aria-label="Revival progress"></progress>';document.body.append(abilityPanel);
 const playerMaterials=new Set<THREE.MeshStandardMaterial>();
 player.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial){const m=o.material.clone();o.material=m;playerMaterials.add(m);}});
 function activateCloak(){if(document.hidden||flow.mode!=='playing'||progression.paused)return;if(hunter.activate(state.health>0&&!victorious)){for(const e of enemies){e.path=[];e.pathTimer=0;}}}
 abilityButton.addEventListener('click',activateCloak);
 window.addEventListener('keydown',e=>{
  if(e.code==='KeyQ'){e.preventDefault();if(!e.repeat)activateCloak();}
  if(e.code==='KeyE'){e.preventDefault();if(!e.repeat&&hunter.remaining>0&&state.health>0&&flow.mode==='playing'&&!progression.paused)hunter.reviveHeld=true;}
 });
 window.addEventListener('keyup',e=>{if(e.code==='KeyE')hunter.interruptRevival();});
 reviveButton.addEventListener('pointerdown',e=>{if(hunter.remaining>0&&state.health>0&&flow.mode==='playing'&&!progression.paused){reviveButton.setPointerCapture(e.pointerId);hunter.reviveHeld=true;}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])reviveButton.addEventListener(event,()=>hunter.interruptRevival());
 function attack(){
  if(document.hidden||flow.mode!=='playing'||state.health===0||victorious||progression.paused||cooldown>0)return;
  hunter.end();cooldown=.45;pulseTime=.25;pulse.position.set(player.position.x,.08,player.position.z);
  let enemyHit=false;
  for(const e of enemies){if(e.health>0&&player.position.distanceTo(e.mesh.position)<=3){e.health=Math.max(0,e.health-progression.attackDamage);e.flash=.18;enemyHit=true;if(e.health===0){e.mesh.visible=false;dropPickup(e.mesh.position);progression.award(enemyTypes[e.kind].xp);flow.kills++;}}}updateEnemyHealth();showUpgrades();
  if(targetHealth<=0){feedback.textContent=enemyHit?`Enemy hit! −${progression.attackDamage} HP`:'Target respawning…';return;}
  if(player.position.distanceTo(target.position)>3){feedback.textContent=enemyHit?`Enemy hit! −${progression.attackDamage} HP`:'Miss · Move within 3 meters';return;}
  targetHealth=Math.max(0,targetHealth-progression.attackDamage);flash=.18;updateHealth();
  feedback.textContent=targetHealth===0?'Target defeated · Respawn in 3 seconds':`Hit! −${progression.attackDamage} HP`;
  if(targetHealth===0){target.visible=false;respawn=3;}
 }
 window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();if(!e.repeat)attack();}});
 attackButton.addEventListener('click',attack);
 const keys=new Set<string>();const accepted=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
 window.addEventListener('keydown',e=>{if(accepted.includes(e.code)){e.preventDefault();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));
 const pad=document.querySelector<HTMLDivElement>('#joystick')!,stick=document.querySelector<HTMLDivElement>('#stick')!;let pointer:number|null=null;const touch=new THREE.Vector2();
 const reset=()=>{hunter.interruptRevival();keys.clear();touch.set(0,0);pointer=null;stick.style.transform='';};window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
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
 function restart(){
  flow.start();
  reset();progression.reset();state.maxHealth=100;updateProgression();hunter.reset();allyBody.rotation.z=0;allyBody.position.y=.25;allyMaterial.emissive.setHex(0x183b77);
  for(const e of enemies)disposeGroup(e.mesh);enemies.length=0;for(const p of pickups)disposeGroup(p);pickups.length=0;
  waveIndex=0;waveDelay=0;pending=[...waves[0]];victorious=false;victory.hidden=true;
  healingTime=0;healedAmount=0;healingOverlay.style.opacity='0';healingNotice.textContent='';state.health=100;damageTime=0;cooldown=0;flash=0;pulseTime=0;respawn=0;
  targetHealth=100;target.visible=true;targetMaterial.emissive.setHex(0x55300c);updateHealth();feedback.textContent='Get close · Space or Attack';
  player.position.set(0,0,0);player.rotation.y=0;camera.position.copy(cameraOffset);look.set(0,0,0);updatePlayerHealth();defeat.hidden=true;attackButton.disabled=false;spawnPending();updateEnemyHealth();updateFlow();
 }
 defeat.querySelector('.play-again')!.addEventListener('click',restart);victory.querySelector('.play-again')!.addEventListener('click',restart);
 const cameraOffset=new THREE.Vector3(0,19,16);camera.position.copy(cameraOffset);const look=new THREE.Vector3();
 function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('Graphics context lost. Reload to resume.');});
 let previous=performance.now();function frame(now:number){const dt=document.hidden||flow.mode!=='playing'||state.health===0||victorious||progression.paused?0:Math.min((now-previous)/1000,.05);previous=now;flow.tick(dt);updateFlow();
 cooldown=Math.max(0,cooldown-dt);flash=Math.max(0,flash-dt);pulseTime=Math.max(0,pulseTime-dt);
 attackButton.disabled=flow.mode!=='playing'||cooldown>0||state.health===0||victorious||progression.paused;
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
 damageTime=Math.max(0,damageTime-dt);healingTime=Math.max(0,healingTime-dt);damageOverlay.style.opacity=String(damageTime/.35);updatePlayerHealth();
 for(const e of enemies){
  const stats=enemyTypes[e.kind];e.cooldown=Math.max(0,e.cooldown-dt);e.flash=Math.max(0,e.flash-dt);e.material.emissive.setHex(e.flash>0?0xffffff:0x331525);
  if(e.health<=0||state.health===0||dt===0||hunter.remaining>0)continue;
  if(e.mesh.position.distanceTo(player.position)>1.5){
   e.pathTimer-=dt;if(e.pathTimer<=0){e.path=findPath(e.mesh.position,player.position,blocked);e.pathTimer=.6;}
   let budget=stats.speed*dt;
   while(e.path.length&&budget>0){const next=e.path[0],dx=next.x-e.mesh.position.x,dz=next.z-e.mesh.position.z,d=Math.hypot(dx,dz);
    if(d<.03){e.path.shift();continue;}const step=Math.min(budget,d,.08),x=e.mesh.position.x+dx/d*step,z=e.mesh.position.z+dz/d*step;
    if(blocked(x,z)){e.path=[];e.pathTimer=0;break;}e.mesh.position.set(x,0,z);e.mesh.rotation.y=Math.atan2(-dx,-dz);budget-=step;
   }
  }
  if(e.mesh.position.distanceTo(player.position)<=1.6&&e.cooldown===0){hunter.damage();state.health=Math.max(0,state.health-stats.damage);e.cooldown=stats.cooldown;damageTime=.35;updatePlayerHealth();if(state.health===0){reset();defeat.hidden=false;finishRun(defeat);defeat.querySelector<HTMLButtonElement>('button')!.focus();}}
 }
 if(dt>0){
  if(pending.length)spawnPending();
  if(!pending.length&&enemies.every(e=>e.health===0)){
   if(waveIndex===waves.length-1){victorious=true;reset();victory.hidden=false;finishRun(victory);victory.querySelector<HTMLButtonElement>('button')!.focus();}
   else{if(waveDelay===0)waveDelay=4;else{waveDelay=Math.max(0,waveDelay-dt);if(waveDelay===0){for(const e of enemies)disposeGroup(e.mesh);enemies.length=0;waveIndex++;pending=[...waves[waveIndex]];spawnPending();}}}
  }
 }updateEnemyHealth();
 const input=new THREE.Vector2(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+touch.x,Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))+touch.y);if(flow.mode!=='playing'||state.health===0||victorious||progression.paused)input.set(0,0);if(input.length()>1)input.normalize();
 // Small steps keep movement from crossing collision surfaces even after a slow frame.
 const steps=Math.max(1,Math.ceil(6*dt/.1));for(let i=0;i<steps;i++){const x=THREE.MathUtils.clamp(player.position.x+input.x*6*dt/steps,-limit,limit);if(!blocked(x,player.position.z))player.position.x=x;const z=THREE.MathUtils.clamp(player.position.z+input.y*6*dt/steps,-limit,limit);if(!blocked(player.position.x,z))player.position.z=z;}
 state.health=hunter.tick(dt,state.health,state.maxHealth,player.position.distanceTo(ally.position)<=2);
 for(let i=pickups.length-1;i>=0;i--){const pickup=pickups[i];if(state.health>0&&dt>0&&player.position.distanceTo(pickup.position)<=1){
  const before=state.health;state.health=Math.min(state.maxHealth,state.health+25);healedAmount=state.health-before;
  disposeGroup(pickup);pickups.splice(i,1);healingTime=1.5;damageTime=0;damageOverlay.style.opacity='0';healingNotice.textContent=healedAmount>0?`+${healedAmount} HP · Health pickup collected`:'Health full · Pickup collected';updatePlayerHealth();
 }}
 if(player.position.distanceTo(ally.position)>2)hunter.interruptRevival();
 for(const m of playerMaterials){m.transparent=hunter.remaining>0;m.opacity=hunter.remaining>0?.25:1;}
 halo.material.opacity=hunter.remaining>0?.3:1;halo.material.transparent=true;
 abilityButton.disabled=flow.mode!=='playing'||state.health===0||victorious||progression.paused||hunter.cooldown>0;
 abilityPanel.querySelector('p')!.textContent=hunter.remaining>0?`Invisible ${hunter.remaining.toFixed(1)}s · Healing 5 HP/s`:hunter.cooldown>0?`Cooldown ${hunter.cooldown.toFixed(1)}s`:'Ready · Q / Cloak';
 abilityPanel.querySelector('label')!.textContent=hunter.allyRevived?'Ally revived!':hunter.reviveProgress>0?`Reviving ${(hunter.reviveProgress/3*100).toFixed(0)}%`:hunter.remaining>0?'Hold E / Revive within 2 meters':'Downed ally · Cloak to revive';
 abilityPanel.querySelector('progress')!.value=hunter.allyRevived?3:hunter.reviveProgress;
 reviveButton.disabled=flow.mode!=='playing'||state.health===0||victorious||progression.paused||hunter.remaining===0||hunter.allyRevived||player.position.distanceTo(ally.position)>2;
 if(hunter.allyRevived){allyBody.rotation.z=Math.PI/2;allyBody.position.y=.9;allyMaterial.emissive.setHex(0x27a554);}
 healingOverlay.style.opacity=String(Math.min(healingTime/.35,1)*.6);healingNotice.style.opacity=healingTime>0?'1':'0';
 if(input.lengthSq()>.001){const target=Math.atan2(-input.x,-input.y);player.rotation.y+=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y))*(1-Math.exp(-14*dt));}body.position.y=1+(input.lengthSq()>.01?Math.sin(now*.015)*.04:0);
 camera.position.lerp(player.position.clone().add(cameraOffset),1-Math.exp(-5*dt));look.lerp(player.position,1-Math.exp(-7*dt));camera.lookAt(look);renderer.render(scene,camera);requestAnimationFrame(frame);
 }updateProgression();updateFlow();startMenu.querySelector<HTMLButtonElement>('button')!.focus();pending=[...waves[0]];spawnPending();updateEnemyHealth();requestAnimationFrame(frame);
}

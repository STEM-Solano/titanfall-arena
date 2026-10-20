import test from 'node:test';import assert from 'node:assert/strict';
import {Room} from '../src/room';import {Boss,inZone} from '../src/boss';import {aiTuning} from '../src/teammates';
import {arenaObstacles,type AIStrength} from '../../shared/multiplayer';import {segmentHit} from '../../client/src/projectiles';
const tick=(r:Room,n:number)=>{for(let i=0;i<n;i++)r.tick(.05);};
function team(humans=1,ai=true,strength:AIStrength='support'){const r=new Room('BOSS12');for(let n=0;n<humans;n++)r.add('h'+n,'Human '+n);if(ai){r.setAI('h0',true);r.setAIStrength('h0',strength);}for(let n=humans-1;n>=0;n--)r.ready('h'+n,true);r.start('h0');return r;}
function bossStage(r:Room){r.enemies=[];r.pending=[];r.wave=3;r.tick(.05);assert(r.boss);return r.boss;}

test('AI settings are host/lobby controlled, Support default; effective damage and cadence are reduced',()=>{
 const r=team(2);assert.equal(r.aiStrength,'support');assert.throws(()=>r.setAIStrength('h1','strong'),/host/);assert.throws(()=>r.setAIStrength('h0','strong'),/lobby/);
 for(const mode of ['support','balanced','strong'] as const){const r=team(1,true,mode),human=r.players.get('h0')!,bot=[...r.players.values()].find(p=>p.ai)!;assert.equal(r.combatDamage(human),25);assert.equal(r.combatDamage(bot),25*aiTuning[mode].damage);assert(aiTuning[mode].interval>.45);
  r.enemies=[];r.pending=[];r.waveDelay=9999;bot.x=0;bot.z=2;human.x=0;human.z=3;for(const p of [...r.players.values()].filter(p=>p.ai&&p!==bot))r.remove(p.id);
  const boss=new Boss(0,5,1,1);r.boss=boss;r.humanCombatUntil=10;tick(r,1);const first=boss.health;assert(first<boss.maxHealth);tick(r,8);assert.equal(boss.health,first,'AI cannot fire at human frequency');
 }
});

test('AI level/XP follows human host, shared kills award all humans including reserved slots; training awards none',()=>{
 const r=team(2),host=r.players.get('h0')!,guest=r.players.get('h1')!,bots=[...r.players.values()].filter(p=>p.ai);assert(bots.every(p=>p.progression.level===host.progression.level));
 r.disconnect(guest.id);const bot=bots[0];host.x=0;host.z=5;bot.x=0;bot.z=6;for(const other of bots.slice(1))r.remove(other.id);const e=r.enemies[0];r.enemies=[e];r.pending=['armored'];e.x=0;e.z=7;e.health=1;e.cooldown=100;tick(r,1);assert.equal(e.health,0);assert.equal(host.progression.xp,30);assert.equal(guest.progression.xp,30);assert.equal(bot.progression.xp,30);
 host.progression.award(220);tick(r,1);assert.equal(host.progression.level,3);assert.equal(bot.progression.level,3);assert.equal(bot.progression.xp,host.progression.xp);assert.equal(bot.progression.pending,0);assert.equal(bot.progression.attackDamage,25,'support upgrades prioritize health and cloak');
 r.reconnect(guest.id);assert.equal(guest.progression.xp,30);r.host=guest.id;tick(r,1);assert.equal(bot.progression.level,guest.progression.level);
 r.enemies=[];r.pending=[];r.waveDelay=9999;host.progression.pending=0;host.x=0;host.z=-.5;host.meleeCooldown=0;const xp=host.progression.xp;r.action(host.id,'melee');tick(r,1);assert.equal(host.progression.xp,xp);
});

test('boss spawns after wave three; scaling locks at match start across human/AI removal and disconnect',()=>{
 for(const [humans,ai,expected] of [[1,true,1100],[2,true,1300],[2,false,900],[6,false,2100]] as const){const r=team(humans,ai);const original=[...r.players.values()];if(humans>1)r.remove('h1');const b=bossStage(r);assert.equal(b.maxHealth,expected);assert.equal(r.phase,'playing');assert.equal(b.humans,humans);assert.equal(b.allies,ai?6-humans:0);assert(original.every(p=>Math.hypot(p.x-b.x,p.z-b.z)>3));assert(r.blocked(b.x,b.z));r.disconnect('h0');const hp=b.maxHealth;tick(r,2);r.reconnect('h0');assert.equal(b.maxHealth,hp);}
});

test('lance and pulse have locked, dodgeable warnings, single impact and a faster second phase below half HP',()=>{
 const b=new Boss(0,-12,2,0),target={x:0,z:0};let damage=0;for(let i=0;i<61;i++)damage+=b.tick(.05,[target]);assert.equal(damage,0);assert.equal(b.attack,'lance');assert(b.remaining>1.5);assert(inZone(target,b.zones[0]));const locked=JSON.stringify(b.zones);b.tick(.05,[{x:9,z:9}]);assert.equal(JSON.stringify(b.zones),locked);assert(!inZone({x:4,z:0},b.zones[0],.5));for(let i=0;i<33;i++)damage+=b.tick(.05,[target]);assert.equal(damage,24);for(let i=0;i<70&&String(b.attack)!=='pulse';i++)b.tick(.05,[target]);assert.equal(b.attack,'pulse');assert.equal(b.zones[0].kind,'circle');assert(!inZone({x:5,z:0},b.zones[0],.5));
 b.damage(b.maxHealth*.5,false);assert.equal(b.phase,1);b.damage(1,false);assert.equal(b.phase,2);for(let i=0;i<200;i++){b.tick(.05,[target,{x:6,z:0}]);if(String(b.attack)==='pulse'&&b.telegraphDuration===1.25)break;}assert.equal(b.telegraphDuration,1.25);assert.equal(b.zones.length,2);
});

test('boss impacts reduce player HP and interrupt revival; moving outside avoids damage, cloak hides new targeting',()=>{
 const r=team(2,false),b=bossStage(r),a=r.players.get('h0')!,other=r.players.get('h1')!;b.x=0;b.z=-12;a.x=0;a.z=2;other.x=6;other.z=2;tick(r,61);assert.equal(b.attack,'lance');const hp=a.health;assert.equal(hp,100);a.hunter.activate(true);a.hunter.reviveProgress=2;tick(r,34);assert(a.health<100);assert.equal(a.hunter.reviveProgress,0);assert.equal(other.health,100);
 const safe=team(2,false),s=bossStage(safe),p=safe.players.get('h0')!,q=safe.players.get('h1')!;s.x=0;s.z=-12;p.x=0;p.z=2;q.x=6;q.z=2;tick(safe,61);p.x=4;tick(safe,34);assert.equal(p.health,100);
 const hidden=team(2,false),h=bossStage(hidden);for(const p of hidden.players.values())p.hunter.activate(true);tick(hidden,61);assert.equal(h.attack,null);
});

test('melee and projectiles damage boss, cover blocks shots, AI damage budget cannot finish it; human kill grants victory/XP',()=>{
 const r=team(2,false),b=bossStage(r),p=r.players.get('h0')!;b.x=0;b.z=10;p.x=0;p.z=7.3;r.action(p.id,'melee');tick(r,1);assert.equal(b.health,b.maxHealth-25);p.x=0;p.z=4;r.input(p.id,{x:0,z:0,ax:0,az:1,revive:false});r.action(p.id,'fire');tick(r,6);assert.equal(b.health,b.maxHealth-50);
 b.x=-7;b.z=-10;p.x=-7;p.z=0;p.fireCooldown=0;r.input(p.id,{x:0,z:0,ax:0,az:-1,revive:false});r.action(p.id,'fire');tick(r,12);assert.equal(b.health,b.maxHealth-50);
 const cap=new Boss(0,10,1,5);for(let i=0;i<1000;i++)cap.damage(25,true);assert.equal(cap.health,cap.maxHealth*.65);assert.equal(cap.aiDamage,cap.maxHealth*.35);cap.health=1;cap.damage(99,true);assert.equal(cap.health,1);
 b.x=0;b.z=10;b.health=1;p.x=0;p.z=7.3;p.meleeCooldown=0;p.progression.pending=0;const xp=p.progression.xp;r.action(p.id,'melee');tick(r,1);assert.equal(r.phase,'victory');assert(p.progression.level>1||p.progression.xp>xp);r.restart(r.host);assert.equal(r.boss,null);assert.equal(r.phase,'lobby');assert.equal(p.progression.level,1);assert.equal(p.progression.xp,0);
});

// Deterministic ordinary player inputs: no forced health, cooldown or damage changes.
function driveHumans(r:Room){for(const p of r.players.values())if(!p.ai&&!p.downed&&p.connected){while(p.progression.pending)r.upgrade(p.id,p.health<55?'health':'damage');const rescue=[...r.players.values()].find(o=>!o.ai&&o.downed&&o.connected&&o.id!==p.id);if((rescue||p.health<60)&&p.hunter.cooldown===0)r.action(p.id,'cloak');
 const targets=r.enemies.filter(e=>e.health>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));const target=targets[0]??(r.boss&&r.boss.health>0?r.boss:null),escape=r.dangerGoal(p);let goal=escape??rescue??target;let dx=0,dz=0;
 const healing=p.hunter.remaining>0&&(p.health<85||!!rescue);if(target&&!healing&&!escape){const d=Math.hypot(p.x-target.x,p.z-target.z);if(d<=3&&p.meleeCooldown===0)r.action(p.id,'melee');if(d>3&&p.fireCooldown===0)r.action(p.id,'fire');}
 if(goal){const d=Math.hypot(goal.x-p.x,goal.z-p.z),stop=escape?.3:rescue?1.4:5;const clear=!arenaObstacles.some(o=>segmentHit(p.x,p.z,goal.x,goal.z,o)!==null)&&!(r.target.health>0&&segmentHit(p.x,p.z,goal.x,goal.z,{...r.target,w:1.1,d:1.1})!==null);if(d>stop||(!clear&&!escape&&!rescue)){const path=r.navigate(p,goal);while(path.length&&Math.hypot(path[0].x-p.x,path[0].z-p.z)<.35)path.shift();const next=path[0];if(next){const len=Math.hypot(next.x-p.x,next.z-p.z)||1;dx=(next.x-p.x)/len;dz=(next.z-p.z)/len;}}}
 const aim=target??goal;r.input(p.id,{x:dx,z:dz,ax:aim?aim.x-p.x:0,az:aim?aim.z-p.z:1,revive:!!rescue&&Math.hypot(rescue.x-p.x,rescue.z-p.z)<=1.8});}}

test('ordinary simulated humans complete waves and boss with 1H5AI, 2H4AI and human-only teams; restart and defeat reset',()=>{
 for(const [humans,ai] of [[1,true],[2,true],[2,false],[6,false]] as const){const r=team(humans,ai);let sawBoss=false,sawPhase2=false;for(let i=0;i<16000&&r.phase==='playing';i++){driveHumans(r);r.tick(.05);sawBoss ||=!!r.boss;sawPhase2 ||=r.boss?.phase===2;}
 console.log(`boss simulation ${humans}H/${ai?6-humans:0}AI: ${r.phase} at ${r.time.toFixed(1)}s, AI boss damage ${r.boss?.aiDamage.toFixed(1)}/${r.boss?.maxHealth}`);assert.equal(r.phase,'victory');assert(sawBoss&&sawPhase2);assert(r.boss!.aiDamage<=r.boss!.maxHealth*.35+1e-6);assert([...r.players.values()].filter(p=>p.ai).every(p=>p.progression.level===r.players.get(r.host)!.progression.level));r.restart(r.host);assert.equal(r.boss,null);for(const p of r.players.values())r.ready(p.id,true);r.start(r.host);for(const p of r.players.values()){p.downed=true;p.health=0;}r.tick(.05);assert.equal(r.phase,'defeat');r.restart(r.host);assert.equal(r.boss,null);
 }
});

test('AI dodge warnings and can revive a downed human during the boss encounter; human-only host reassignment remains',()=>{
 const r=team(2),b=bossStage(r),a=r.players.get('h0')!,h=r.players.get('h1')!,bots=[...r.players.values()].filter(p=>p.ai);b.x=0;b.z=-12;a.x=0;a.z=2;a.health=0;a.downed=true;h.x=12;h.z=0;bots[0].x=1;bots[0].z=2;for(const bot of bots.slice(1)){bot.x=-12;bot.z=0;}tick(r,61);assert(!a.downed);assert.equal(a.health,50);assert.equal(r.host,h.id);assert(!r.players.get(r.host)!.ai);
 const bot=bots[0];b.attack='pulse';b.zones=[{kind:'circle',x:bot.x,z:bot.z,radius:3.5}];b.remaining=1.8;b.telegraphDuration=1.8;const hp=bot.health;tick(r,38);assert.equal(bot.health,hp);assert(!inZone(bot,{kind:'circle',x:1,z:2,radius:3.5},.5));
});

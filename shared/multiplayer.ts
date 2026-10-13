import type { Upgrade } from '../client/src/progression';
import type { EnemyKind } from '../client/src/waves';
export const PROTOCOL=9;
export const ROOM_LIMIT=6;
export type Input={x:number;z:number;ax:number;az:number;revive:boolean};
export type ClientMessage=
 | {type:'create';name:string;protocol:number}
 | {type:'join';code:string;name:string;protocol:number}
 | {type:'resume';id:string;token:string;code:string}
 | {type:'ready';ready:boolean}
 | {type:'start'}|{type:'restart'}|{type:'leave'}
 | {type:'input';input:Input}
 | {type:'action';action:'melee'|'fire'|'cloak'}
 | {type:'upgrade';upgrade:Upgrade};
export type PlayerView={id:string;name:string;x:number;z:number;ax:number;az:number;health:number;maxHealth:number;downed:boolean;ready:boolean;cloak:number;cloakCooldown:number;meleeCooldown:number;fireCooldown:number;reviveProgress:number;reviveTarget:string|null;level:number;xp:number;threshold:number;pending:number;damage:number;cooldownDuration:number;hit:number;healed:number;attackFlash:number;connected:boolean};
export type EnemyView={id:string;kind:EnemyKind;x:number;z:number;health:number;maxHealth:number;hit:number};
export type Snapshot={type:'snapshot';code:string;host:string;phase:'lobby'|'playing'|'victory'|'defeat';time:number;wave:number;waveDelay:number;players:PlayerView[];enemies:EnemyView[];shots:{id:string;x:number;z:number;owner:string}[];pickups:{id:string;x:number;z:number}[];target:{health:number;x:number;z:number;hit:number};npc:{downed:boolean;x:number;z:number};notice:string};
export type ServerMessage=Snapshot|{type:'welcome';id:string;protocol:number;resumeToken?:string}|{type:'error';message:string};
export const arenaObstacles=[{x:-7,z:-5,w:5,d:3},{x:7,z:-6,w:3,d:6},{x:-8,z:7,w:4,d:4},{x:7,z:7,w:6,d:3}];

export type Upgrade='damage'|'health'|'cloak';
export class Progression{
 level=1;xp=0;pending=0;attackDamage=25;maxHealth=100;cloakCooldown=15;
 get threshold(){return 100+(this.level-1)*50;}
 get paused(){return this.pending>0;}
 award(amount:number){this.xp+=amount;while(this.xp>=this.threshold){this.xp-=this.threshold;this.level++;this.pending++;}}
 effect(upgrade:Upgrade){
  if(upgrade==='damage')return `Attack damage ${this.attackDamage} → ${this.attackDamage+10} (+10 per hit)`;
  if(upgrade==='health')return `Maximum HP ${this.maxHealth} → ${this.maxHealth+25} (+25 maximum and current HP)`;
  return `Cloak cooldown ${this.cloakCooldown}s → ${Math.max(6,this.cloakCooldown-3)}s (−3s, minimum 6s)`;
 }
 choose(upgrade:Upgrade){if(!this.paused)return false;if(upgrade==='damage')this.attackDamage+=10;else if(upgrade==='health')this.maxHealth+=25;else this.cloakCooldown=Math.max(6,this.cloakCooldown-3);this.pending--;return true;}
 reset(){this.level=1;this.xp=0;this.pending=0;this.attackDamage=25;this.maxHealth=100;this.cloakCooldown=15;}
}

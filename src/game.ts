export type Vec = { x: number; y: number; z: number };
export type Input = { move: number; port: boolean; starboard: boolean };
export type Phase = 'ready' | 'playing' | 'sinking' | 'won' | 'lost';
export type EffectKind = 'splash' | 'breach' | 'underwater' | 'fire';
export type Effect = Vec & { id: number; kind: EffectKind; age: number; duration: number };
export type Submarine = Vec & { id: number; vx: number; cooldown: number; dead: boolean; deathAge: number };
export type Projectile = Vec & { id: number; kind: 'charge' | 'torpedo'; vx: number; vz: number; wet: boolean; age: number; fuse: number };
export type Particle = Vec & { vx: number; vy: number; vz: number; age: number; life: number; size: number; kind: 'spray' | 'bubble' | 'spark' | 'debris' | 'smoke' };
export const WORLD = { halfWidth: 380, halfBreadth: 108, depth: 300 };
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export function segmentDistance(a: Vec, b: Vec, p: Vec): number {
  const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z;
  const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz || 1),0,1);
  return Math.hypot(a.x+dx*t-p.x,a.y+dy*t-p.y,a.z+dz*t-p.z);
}
export class Game {
  phase: Phase = 'ready';
  time = 0;
  ship = { x: 0, y: 0, z: 0, vx: 0, deathAge: 0 };
  subs: Submarine[] = [];
  projectiles: Projectile[] = [];
  effects: Effect[] = [];
  particles: Particle[] = [];
  sounds: EffectKind[] = [];
  cooldown = [0, 0];
  fuseDepth = 160;
  shots = 0;
  kills = 0;
  shake = 0;
  clearTime = 0;
  private serial = 0;
  private seed: number;
  constructor(seed = 1876) { this.seed=seed; this.populate(); }
  random() { this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0; return this.seed/4294967296; }
  private populate() {
    this.subs = [-280,-140,30,180,290].map((x,i)=>({id:this.serial++,x,y:0,z:-[90,160,230,110,210][i],vx:(i%2 ? -1:1)*(19+i*3),cooldown:7+i*2.1,dead:false,deathAge:0}));
  }
  start() { if(this.phase==='ready') this.phase='playing'; }
  get alive() { return this.subs.filter(s=>!s.dead).length; }
  launch(side: -1 | 1) {
    const slot=side===-1?0:1;
    if(this.phase!=='playing'||this.cooldown[slot]>0) return;
    this.cooldown[slot]=0.85; this.shots++;
    this.projectiles.push({id:this.serial++,kind:'charge',x:this.ship.x+side*40,y:0,z:22,vx:this.ship.vx*0.55+side*51,vz:80,wet:false,age:0,fuse:this.fuseDepth});
  }
  burst(kind: EffectKind, p: Vec) {
    this.effects.push({...p,id:this.serial++,kind,age:0,duration:kind==='fire'?3:2.2});
    this.sounds.push(kind);
    if(kind!=='splash') this.shake=Math.max(this.shake,kind==='fire'?10:4);
    const count=kind==='fire'?65:kind==='underwater'?48:32;
    for(let i=0;i<count;i++) {
      const a=this.random()*Math.PI*2, speed=15+this.random()*65;
      let type: Particle['kind']=kind==='underwater'?'bubble':kind==='fire'?(i%3===0?'smoke':i%4===0?'debris':'spark'):'spray';
      this.particles.push({...p,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed*.6,vz:kind==='underwater'?(this.random()-.25)*90:35+this.random()*120,age:0,life:1+this.random()*2.5,size:type==='smoke'?9+this.random()*10:1+this.random()*3,kind:type});
    }
    if(this.particles.length>800) this.particles.splice(0,this.particles.length-800);
  }
  destroySub(s: Submarine) {
    if(s.dead) return;
    s.dead=true; s.deathAge=0; this.kills++;
    this.burst('underwater',s);
    for(let i=0;i<14;i++) this.particles.push({...s,vx:(this.random()-.5)*65,vy:(this.random()-.5)*40,vz:(this.random()-.5)*70,age:0,life:5,size:2+this.random()*5,kind:'debris'});
  }
  private detonate(p: Projectile) {
    this.burst('underwater',p);
    for(const s of this.subs) if(!s.dead && Math.hypot(s.x-p.x,s.y-p.y,(s.z-p.z)*1.1)<62) this.destroySub(s);
  }
  step(dt: number, input: Input) {
    if(this.phase==='ready'||this.phase==='lost'||this.phase==='won') return;
    this.time+=dt; this.shake*=Math.exp(-dt*5);
    for(let i=0;i<2;i++) this.cooldown[i]=Math.max(0,this.cooldown[i]-dt);
    if(this.phase==='playing') {
      this.ship.vx+=(clamp(input.move,-1,1)*100-this.ship.vx)*(1-Math.exp(-dt*3));
      this.ship.x=clamp(this.ship.x+this.ship.vx*dt,-325,325);
      if(Math.abs(this.ship.x)>=325) this.ship.vx=0;
      if(input.port) this.launch(-1); if(input.starboard) this.launch(1);
      if(this.alive===0) { this.clearTime+=dt; if(this.clearTime>3 && !this.projectiles.some(p=>p.kind==='torpedo')) this.phase='won'; }
    } else {
      this.ship.deathAge+=dt; this.ship.vx*=Math.exp(-dt); this.ship.x+=this.ship.vx*dt;
      this.ship.z-=dt*(7+this.ship.deathAge*8);
      if(this.ship.deathAge>5) this.phase='lost';
    }
    for(const s of this.subs) {
      if(s.dead) { s.deathAge+=dt; s.z-=dt*(8+s.deathAge*3); s.x+=s.vx*dt*.2; continue; }
      s.x+=s.vx*dt;
      if(Math.abs(s.x)>330) { s.x=clamp(s.x,-330,330); s.vx*=-1; }
      s.cooldown-=dt;
      if(s.cooldown<=0 && this.phase==='playing' && this.alive>0) {
        const travel=-s.z/76;
        const target=clamp(this.ship.x+this.ship.vx*travel*.55,-330,330);
        this.projectiles.push({id:this.serial++,kind:'torpedo',x:s.x,y:s.y,z:s.z+12,vx:clamp((target-s.x)/travel,-85,85),vz:76,wet:true,age:0,fuse:0});
        s.cooldown=8+this.random()*5;
      }
    }
    const keep: Projectile[]=[];
    for(const p of this.projectiles) {
      const prev={x:p.x,y:p.y,z:p.z}; p.age+=dt;
      if(p.kind==='charge') {
        if(p.wet) { p.vx*=Math.exp(-dt*2.5); p.vz+=(-48-p.vz)*(1-Math.exp(-dt*2)); }
        else p.vz-=120*dt;
        p.x+=p.vx*dt; p.z+=p.vz*dt;
        if(!p.wet&&p.z<=0) { p.wet=true; p.vx*=.4; p.vz*=.3; this.burst('splash',{...p,z:0}); }
        const hit=this.subs.find(s=>!s.dead&&segmentDistance(prev,p,s)<26);
        if(p.wet&&(hit||p.z<=-p.fuse)) { this.detonate(p); continue; }
      } else {
        p.x+=p.vx*dt; p.z+=p.vz*dt;
        if(p.z>=-7) {
          if(this.phase==='playing' && Math.abs(p.x-this.ship.x)<49) {
            this.phase='sinking'; this.burst('fire',{...this.ship,z:10}); this.burst('splash',this.ship);
          } else this.burst('breach',{...p,z:0});
          continue;
        }
      }
      if(p.age<18&&Math.abs(p.x)<450&&p.z>-350) keep.push(p);
    }
    this.projectiles=keep;
    for(const e of this.effects) e.age+=dt;
    this.effects=this.effects.filter(e=>e.age<e.duration);
    for(const p of this.particles) {
      p.age+=dt;
      if(p.kind==='bubble') { p.vz+=(28-p.vz)*dt; p.vx*=Math.exp(-dt*1.5); }
      else if(p.kind==='smoke') { p.vz=24; p.size+=dt*5; }
      else { p.vz-=dt*(p.z<0?14:120); p.vx*=Math.exp(-dt*(p.z<0?1.7:.2)); }
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
      if(p.kind==='spray'&&p.z<0) p.age=p.life;
      if(p.kind==='bubble'&&p.z>0) p.age=p.life;
    }
    this.particles=this.particles.filter(p=>p.age<p.life);
  }
}

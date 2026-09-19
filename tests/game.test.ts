import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, segmentDistance } from '../src/game.ts';
const idle={move:0,port:false,starboard:false};
function advance(g:Game,seconds:number,input=idle) { for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120,input); }
function quietGame(){const g=new Game();g.start();g.subs.forEach(s=>{s.cooldown=999;s.vx=0;});return g;}
test('briefing freezes simulation; movement accelerates and remains within the ocean',()=>{
  const g=new Game();advance(g,2,{...idle,move:1});assert.equal(g.ship.x,0);g.start();advance(g,2,{...idle,move:1});assert.ok(g.ship.x>100);advance(g,5,{...idle,move:1});assert.ok(g.ship.x<=325);
});
test('both launchers have independent reloads',()=>{
  const g=quietGame();g.launch(-1);g.launch(-1);g.launch(1);assert.equal(g.projectiles.length,2);assert.equal(g.shots,2);assert.deepEqual(g.sounds,['charge-launch','charge-launch']);advance(g,1);g.launch(-1);assert.equal(g.shots,3);
});
test('charges arc above the ship, splash once, decelerate underwater and detonate at the selected depth',()=>{
  const g=quietGame();g.subs.forEach(s=>s.x=-330);g.fuseDepth=90;g.launch(1);advance(g,.4);assert.ok(g.projectiles[0].z>22);advance(g,1.5);assert.ok(g.projectiles[0].wet);assert.ok(Math.abs(g.projectiles[0].vx)<15);assert.equal(g.sounds.filter(s=>s==='charge-splash').length,1);advance(g,4);assert.equal(g.projectiles.length,0);assert.ok(g.sounds.includes('charge-miss'));
});
test('charge impact destroys a submarine and the wreck sinks; scoring cannot duplicate',()=>{
  const g=quietGame(),s=g.subs[0];s.x=0;s.z=-90;
  g.projectiles.push({id:999,kind:'charge',x:0,y:0,z:-67,vx:0,vz:-48,wet:true,age:0,fuse:230});
  advance(g,.05);assert.ok(s.dead);assert.equal(g.kills,1);assert.deepEqual(g.sounds,['sub-hit']);const depth=s.z;advance(g,1);assert.ok(s.z<depth);g.destroySub(s);assert.equal(g.kills,1);
});
test('torpedo miss creates a surface eruption without damaging the ship',()=>{
  const g=quietGame();g.projectiles.push({id:999,kind:'torpedo',x:200,y:0,z:-8,vx:0,vz:76,wet:true,age:0,fuse:0});advance(g,.1);assert.equal(g.phase,'playing');assert.ok(g.sounds.includes('torpedo-surface'));assert.equal(g.projectiles.length,0);
});
test('a torpedo hit triggers fire, flooding, sinking, and mission defeat',()=>{
  const g=quietGame();g.projectiles.push({id:999,kind:'torpedo',x:0,y:0,z:-8,vx:0,vz:76,wet:true,age:0,fuse:0});advance(g,.1);assert.equal(g.phase,'sinking');assert.deepEqual(g.sounds,['ship-hit']);advance(g,5.1);assert.equal(g.phase,'lost');assert.ok(g.ship.z<-100);
});
test('destroying all contacts wins after the wreck animation',()=>{
  const g=quietGame();for(const s of g.subs)g.destroySub(s);assert.equal(g.alive,0);advance(g,3.1);assert.equal(g.phase,'won');
});
test('swept collision catches a projectile crossing a target between updates',()=>{
  assert.equal(segmentDistance({x:-100,y:0,z:-90},{x:100,y:0,z:-90},{x:0,y:0,z:-90}),0);
});
test('particle and projectile populations stay bounded under sustained combat',()=>{
  const g=quietGame();advance(g,90,{...idle,port:true,starboard:true});assert.ok(g.particles.length<=800);assert.ok(g.projectiles.length<30);assert.ok(g.effects.length<50);
});

test('a fuse explosion hitting multiple submarines emits one hit cue and no miss cue',()=>{
  const g=quietGame();g.subs.forEach((s,i)=>{s.x=i<2?0:300;s.z=-90;});
  g.projectiles.push({id:999,kind:'charge',x:0,y:0,z:-89,vx:0,vz:-48,wet:true,age:0,fuse:90});
  advance(g,.05);assert.equal(g.kills,2);assert.deepEqual(g.sounds,['sub-hit']);
});
test('rejected launches and purely visual effects do not emit sounds',()=>{
  const g=new Game();g.launch(1);assert.deepEqual(g.sounds,[]);
  g.burst('splash',g.ship);g.burst('underwater',g.ship);assert.deepEqual(g.sounds,[]);
  g.start();g.launch(1);g.launch(1);assert.deepEqual(g.sounds,['charge-launch']);
});

import './style.css';
import { Game, type Input } from './game.ts';
import { Renderer } from './render.ts';
import { AudioEngine } from './audio.ts';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header class="masthead"><a class="brand" href="./" aria-label="Depthwatch home"><span class="brand-icon">⌖</span> DEPTHWATCH<span class="edition">NAVAL OPERATIONS</span></a><div class="header-right"><span class="connection"><i></i> LOCAL COMMAND</span><button id="sound" class="icon-button" aria-pressed="false">Sound off</button><button id="pause" class="icon-button" disabled>Pause <kbd>P</kbd></button></div></header>
<main>
  <section class="mission-heading"><div><div class="eyebrow">OPERATION 001 / NORTH ATLANTIC</div><h1>Silent waters. <em>Hostile depths.</em></h1><p>One destroyer. Five contacts. Keep the surface yours.</p></div><div class="mission-state"><span class="status-dot"></span><span id="status">AWAITING COMMAND</span></div></section>
  <section class="game-shell" aria-label="Naval combat game">
    <div class="scene-meta"><span><i class="live-dot"></i> TACTICAL VIEW <span class="muted">/ ISOMETRIC</span></span><span>47°36′N &nbsp; 22°14′W</span></div>
    <div class="readouts"><div><span>VESSEL</span><strong id="hull">DD-07 <small>READY</small></strong></div><div><span>HOSTILE CONTACTS</span><strong><b id="contacts">05</b><small>/ 05</small></strong></div><div><span>CHARGES FIRED</span><strong id="shots">00</strong></div><div><span>MISSION TIME</span><strong id="time">00:00</strong></div></div>
    <canvas id="ocean" aria-label="Isometric ocean battlefield. Use A and D to move, Q and E to launch depth charges, and 1, 2, 3 to select detonation depth."></canvas>
    <div class="scene-bottom"><span><i class="legend-ship"></i> FRIENDLY <i class="legend-sub"></i> SUBMARINE <i class="legend-charge"></i> ORDNANCE</span><span>DEPTH RANGE <b>0—300 M</b></span></div>
    <div id="overlay" class="overlay"><div class="briefing"><div class="eyebrow" id="overlay-label">CAPTAIN’S BRIEFING</div><h2 id="overlay-title">The sea is quiet.<br>It won’t stay that way.</h2><p id="overlay-copy">Five submarines are hunting your destroyer. Keep moving, lead your targets, and send depth charges into their path. A single torpedo hit will sink your ship.</p><div id="brief-controls" class="brief-controls"><span><kbd>A</kbd><kbd>D</kbd> Navigate</span><span><kbd>Q</kbd><kbd>E</kbd> Launch</span><span><kbd>1</kbd>–<kbd>3</kbd> Fuse depth</span></div><button id="start" class="primary">Take command <span>↗</span></button><span class="brief-note" id="brief-note">SPACE fires both launchers · Touch controls available below</span></div></div>
  </section>
  <section class="console" aria-label="Ship controls"><div class="console-group helm"><div class="control-label">01 <span>HELM</span></div><div class="button-pair"><button data-hold="left" aria-label="Steer left"><span>←</span> Port <kbd>A</kbd></button><button data-hold="right" aria-label="Steer right">Starboard <span>→</span><kbd>D</kbd></button></div></div><div class="console-group fuse"><div class="control-label">02 <span>DETONATION DEPTH</span></div><div class="depth-buttons" role="group" aria-label="Detonation depth"><button data-depth="90" aria-pressed="false">90 <small>M</small><kbd>1</kbd></button><button data-depth="160" aria-pressed="true">160 <small>M</small><kbd>2</kbd></button><button data-depth="230" aria-pressed="false">230 <small>M</small><kbd>3</kbd></button></div></div><div class="console-group weapons"><div class="control-label">03 <span>DEPTH CHARGES</span><span id="reload">LAUNCHERS READY</span></div><div class="button-pair"><button data-hold="port" class="launch">↙ Port launcher <kbd>Q</kbd></button><button data-hold="starboard" class="launch">Starboard launcher ↗ <kbd>E</kbd></button></div></div></section>
  <footer><span><span class="tip-mark">↳</span> <span id="tip">Aim ahead of moving contacts. Charges slow down as they enter the water.</span></span><span>DD-07 / <b>DEPTHWATCH</b></span></footer>
</main>`;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let game=new Game();
const renderer=new Renderer(el<HTMLCanvasElement>('ocean'));
const audio=new AudioEngine();
let paused=false, last=0, accumulator=0;
const keys=new Set<string>(),held=new Set<string>();
const overlay=el('overlay'), start=el<HTMLButtonElement>('start'),pause=el<HTMLButtonElement>('pause');
let shownPhase=game.phase;
function clearInput(){keys.clear();held.clear();}
function setDepth(depth:number){game.fuseDepth=depth;document.querySelectorAll<HTMLButtonElement>('[data-depth]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.depth)===depth)));}
function showOverlay(label:string,title:string,copy:string,button:string) {
  el('overlay-label').textContent=label;el('overlay-title').textContent=title;el('overlay-copy').textContent=copy;start.innerHTML=button+' <span>↗</span>';overlay.hidden=false;start.focus();
}
function togglePause(){
  if(game.phase!=='playing'&&game.phase!=='sinking')return;
  paused=!paused;clearInput();pause.innerHTML=paused?'Resume <kbd>P</kbd>':'Pause <kbd>P</kbd>';
  if(paused)showOverlay('COMMAND ON HOLD','A moment of calm.','The battle is paused. Your ship and all ordnance will wait for your return.','Resume mission');
  else overlay.hidden=true;
}
start.addEventListener('click',()=>{
  if(paused){togglePause();return;}
  if(game.phase==='won'||game.phase==='lost'){game=new Game();setDepth(160);}
  game.start();shownPhase=game.phase;overlay.hidden=true;pause.disabled=false;clearInput();el('brief-controls').hidden=false;el('brief-note').hidden=false;start.blur();
});
pause.addEventListener('click',togglePause);
el('sound').addEventListener('click',async()=>{try{const enabled=await audio.toggle();el('sound').textContent=enabled?'Sound on':'Sound off';el('sound').setAttribute('aria-pressed',String(enabled));}catch{el('sound').textContent='Audio unavailable';}});
document.querySelectorAll<HTMLButtonElement>('[data-depth]').forEach(b=>b.addEventListener('click',()=>setDepth(Number(b.dataset.depth))));
document.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(b.dataset.hold!);});
  const release=()=>held.delete(b.dataset.hold!);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
});
window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if([' ','arrowleft','arrowright','a','d','q','e','1','2','3','p','escape'].includes(key)) {
    if(key===' ' && (e.target instanceof HTMLButtonElement) && (overlay.hidden===false || e.target===pause || e.target===el('sound')))return;
    e.preventDefault();if(!e.repeat){if(key==='p'||key==='escape')togglePause();if(['1','2','3'].includes(key))setDepth([90,160,230][Number(key)-1]);}keys.add(key);
  }
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{clearInput();if(!paused&&(game.phase==='playing'||game.phase==='sinking'))togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(!paused&&(game.phase==='playing'||game.phase==='sinking'))togglePause();}});
new ResizeObserver(()=>renderer.resize()).observe(el('ocean'));renderer.resize();
function updateUI(){
  el('contacts').textContent=String(game.alive).padStart(2,'0');el('shots').textContent=String(game.shots).padStart(2,'0');
  el('time').textContent=`${String(Math.floor(game.time/60)).padStart(2,'0')}:${String(Math.floor(game.time%60)).padStart(2,'0')}`;
  el('hull').innerHTML=`DD-07 <small>${game.phase==='sinking'||game.phase==='lost'?'LOST':game.phase==='ready'?'READY':'OPERATIONAL'}</small>`;
  el('status').textContent=paused?'MISSION PAUSED':game.phase==='ready'?'AWAITING COMMAND':game.phase==='won'?'SECTOR SECURED':game.phase==='lost'?'VESSEL LOST':game.phase==='sinking'?'CRITICAL HIT':'ENGAGEMENT ACTIVE';
  const threats=game.projectiles.filter(p=>p.kind==='torpedo'&&p.z>-90).length;
  el('tip').textContent=threats?'Incoming torpedoes near the surface. Change course now.':'Aim ahead of moving contacts. Charges slow down as they enter the water.';
  el('tip').classList.toggle('warning',threats>0);
  el('reload').textContent=game.cooldown.some(c=>c>0)?'RELOADING':'LAUNCHERS READY';
  document.querySelectorAll<HTMLButtonElement>('.launch').forEach((b,i)=>{b.style.setProperty('--reload',`${(1-game.cooldown[i]/.85)*100}%`);});
  if(game.phase!==shownPhase){shownPhase=game.phase;if(game.phase==='won'||game.phase==='lost'){
    clearInput();pause.disabled=true;el('brief-controls').hidden=true;el('brief-note').hidden=true;
    showOverlay(game.phase==='won'?'MISSION COMPLETE':'MISSION ENDED',game.phase==='won'?'The surface is yours.':'Lost to the deep.',`${game.kills} of 5 submarines neutralized. ${game.shots} depth charges fired in ${Math.floor(game.time)} seconds. ${game.phase==='won'?'The North Atlantic passage is secure.':'Keep changing course and watch for the orange torpedo markers.'}`,'Deploy again');
  }}
}
function frame(now:number){
  const dt=Math.min((now-last)/1000||0,0.1);last=now;
  if(!paused){accumulator+=dt;const input:Input={move:Number(keys.has('d')||keys.has('arrowright')||held.has('right'))-Number(keys.has('a')||keys.has('arrowleft')||held.has('left')),port:keys.has('q')||keys.has(' ')||held.has('port'),starboard:keys.has('e')||keys.has(' ')||held.has('starboard')};
    while(accumulator>=1/120){game.step(1/120,input);accumulator-=1/120;}
    for(const sound of game.sounds.splice(0))audio.play(sound);
  }else accumulator=0;
  renderer.draw(game);updateUI();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

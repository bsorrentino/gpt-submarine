import { Game, WORLD, type Vec, type Submarine } from './game.ts';
type Point = [number, number];
export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width=1200; height=860; scale=1; ox=0; oy=0;
  constructor(canvas: HTMLCanvasElement) { this.canvas=canvas; this.ctx=canvas.getContext('2d')!; }
  resize() {
    const box=this.canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    this.width=box.width; this.height=box.height;
    this.canvas.width=Math.round(box.width*dpr); this.canvas.height=Math.round(box.height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.scale=Math.min(box.width/1040,box.height/830); this.ox=box.width/2; this.oy=(box.height-830*this.scale)/2+265*this.scale;
  }
  project(x:number,y:number,z:number): Point { return [this.ox+(x-y)*.866*this.scale,this.oy+((x+y)*.5-z)*this.scale]; }
  polygon(points: Vec[], fill:string, stroke?:string) {
    const c=this.ctx;c.beginPath(); points.forEach((p,i)=>{const [x,y]=this.project(p.x,p.y,p.z);if(i===0)c.moveTo(x,y);else c.lineTo(x,y);});c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
  }
  line(a:Vec,b:Vec,color:string,width=1) { const c=this.ctx; c.beginPath();c.moveTo(...this.project(a.x,a.y,a.z));c.lineTo(...this.project(b.x,b.y,b.z));c.strokeStyle=color;c.lineWidth=width*this.scale;c.stroke(); }
  ring(p:Vec,r:number,color:string,width=1) { const c=this.ctx;c.beginPath();for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;const q=this.project(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,p.z);if(i===0)c.moveTo(...q);else c.lineTo(...q);}c.strokeStyle=color;c.lineWidth=width*this.scale;c.stroke(); }
  box(x:number,y:number,z:number,w:number,d:number,h:number,top:string,front:string,side:string) {
    const a={x:x-w/2,y:y-d/2,z},b={x:x+w/2,y:y-d/2,z},cc={x:x+w/2,y:y+d/2,z},dd={x:x-w/2,y:y+d/2,z};
    this.polygon([dd,cc,{...cc,z:z+h},{...dd,z:z+h}],front);
    this.polygon([b,cc,{...cc,z:z+h},{...b,z:z+h}],side);
    this.polygon([{...a,z:z+h},{...b,z:z+h},{...cc,z:z+h},{...dd,z:z+h}],top,'#b9d5d52a');
  }
  text(text:string,p:Vec,color='#87b6bf',size=10) {const c=this.ctx;c.font=`${size*this.scale}px "Courier New", monospace`;c.fillStyle=color;c.fillText(text,...this.project(p.x,p.y,p.z));}
  vessel(g:Game) {
    const s=g.ship,c=this.ctx,t=g.time,dead=s.deathAge>0;
    const z=s.z+Math.sin(t*1.8)*1.3;
    c.save();
    if(dead){const pivot=this.project(s.x,s.y,z);c.translate(...pivot);c.rotate(Math.min(s.deathAge*.15,.7));c.translate(-pivot[0],-pivot[1]);}
    const map=(x:number,y:number,h:number):Vec=>({x:s.x+x,y:s.y+y,z:z+h});
    const outline=[[-57,0],[-39,-14],[35,-14],[54,-8],[57,0],[43,14],[-38,14]];
    const top=outline.map(([x,y])=>map(x,y,10)),bottom=outline.map(([x,y])=>map(x*.85,y*.7,-8));
    for(let i=0;i<outline.length;i++){let j=(i+1)%outline.length;this.polygon([bottom[i],bottom[j],top[j],top[i]],i<3?'#263d47':'#506974','#aec3bb40');}
    this.polygon(top,'#a3b1ae','#d9e5d0');
    this.line(map(-39,14,1),map(41,14,1),'#e6b76c',2);
    // Deck fittings, bridge windows, smokestack and articulated launchers.
    this.box(s.x-4,0,z+11,34,21,15,'#d0d8c6','#788f92','#5c747d');
    this.box(s.x-7,0,z+26,23,17,9,'#dce2cf','#a7b7b1','#6f8c94');
    for(let x=-15;x<3;x+=6)this.box(s.x+x,9,z+28,4,1,4,'#122e3e','#163b49','#163b49');
    this.box(s.x+17,-2,z+12,10,11,18,'#324b55','#657d80','#46606b');
    this.line(map(-4,0,34),map(-4,0,65),'#e0dfc9',2);
    const ra=Math.sin(t*2.4)*13;
    this.line(map(-4-ra,-Math.cos(t*2.4)*8,60),map(-4+ra,Math.cos(t*2.4)*8,60),'#9ce4d4',3);
    this.line(map(-4,0,53),map(14,0,41),'#7a989b',.8);
    for(const side of [-1,1]) {
      this.box(s.x+side*35,0,z+11,13,12,7,'#d4d5bb','#7d9090','#526e76');
      this.line(map(side*35,0,18),map(side*48,0,29),'#526775',6);
      this.line(map(side*35,0,20),map(side*48,0,31),'#b7c6bd',2);
    }
    for(let x=-35;x<40;x+=12){this.line(map(x,14,10),map(x,14,15),'#d0dcca',.8);}
    this.line(map(-36,14,15),map(38,14,15),'#d0dcca',.8);
    if(!dead){
      for(let i=0;i<5;i++){const spread=12+i*5;this.line({x:s.x+65+i*10,y:-spread,z:-1},{x:s.x+69+i*10,y:spread,z:-1},`rgba(156,229,225,${.18-i*.025})`,2);}
      c.save();c.setLineDash([3,5]);this.line({x:s.x,y:0,z:-15},{x:s.x,y:0,z:-g.fuseDepth},'#8bdfcb38');c.restore();
      this.ring({x:s.x,y:0,z:-g.fuseDepth},19,'#a0e6c45a');
    }
    c.restore();
  }
  submarine(s:Submarine,g:Game) {
    const c=this.ctx; const z=s.z, split=Math.min(s.deathAge*5,20);
    const center=this.project(s.x,s.y,z);c.save();c.translate(...center);c.rotate(Math.PI/6+(s.dead?Math.min(s.deathAge*.17,.75):0));c.scale(this.scale,this.scale);
    const grad=c.createLinearGradient(0,-10,0,11);grad.addColorStop(0,s.dead?'#647c75':'#a0b6a0');grad.addColorStop(.4,'#657f79');grad.addColorStop(1,'#294e58');
    c.fillStyle=grad;c.strokeStyle='#b5c7a47a';c.lineWidth=1;
    if(s.dead){for(const dir of [-1,1]){c.beginPath();c.ellipse(dir*(17+split),dir*split*.2,22,10,0,0,Math.PI*2);c.fill();c.stroke();}}
    else {c.beginPath();c.ellipse(0,0,43,11,0,0,Math.PI*2);c.fill();c.stroke();}
    c.fillStyle='#839b89';c.fillRect(-7,-18,15,11);c.fillStyle='#b4c2a0';c.fillRect(-5,-19,11,3);
    c.strokeStyle='#bed1b1';c.beginPath();c.moveTo(0,-18);c.lineTo(0,-27);c.lineTo(6,-27);c.stroke();
    c.strokeStyle='#c6d6ad88';c.beginPath();c.moveTo(-27,-1);c.lineTo(28,-1);c.stroke();
    const tail=s.vx>0?-1:1;c.strokeStyle='#8caea5';c.lineWidth=2;c.beginPath();c.moveTo(tail*45,-Math.sin(g.time*18)*9);c.lineTo(tail*45,Math.sin(g.time*18)*9);c.stroke();
    c.restore();
    if(!s.dead){this.text(`U-${String(s.id+1).padStart(2,'0')}  /  ${Math.round(-z)} M`,{x:s.x-31,y:0,z:z-28},'#a9c6b0',10);for(let i=0;i<4;i++){let offset=(g.time*18+i*14)%65;let p=this.project(s.x-tail*-1*(49+offset),s.y,z+Math.sin(i)*3);c.beginPath();c.arc(...p,Math.max(.5,2-offset/50)*this.scale,0,Math.PI*2);c.strokeStyle='#8dded047';c.stroke();}}
  }
  draw(g:Game) {
    const c=this.ctx;c.clearRect(0,0,this.width,this.height);c.save();
    if(g.shake>.1)c.translate(Math.sin(g.time*91)*g.shake*this.scale,Math.cos(g.time*77)*g.shake*.5*this.scale);
    const w=WORLD.halfWidth,b=WORLD.halfBreadth,d=WORLD.depth;
    const a={x:-w,y:-b,z:0},bb={x:w,y:-b,z:0},cc={x:w,y:b,z:0},dd={x:-w,y:b,z:0};
    // A transparent ocean section exposes the combat volume without changing projection.
    this.polygon([{...a,z:-d},{...bb,z:-d},{...cc,z:-d},{...dd,z:-d}],'#0a2a37','#275462');
    this.polygon([a,bb,{...bb,z:-d},{...a,z:-d}],'#10364477','#34677655');
    this.polygon([a,dd,{...dd,z:-d},{...a,z:-d}],'#0b364777','#34677655');
    for(let x=-360;x<=360;x+=60)this.line({x,y:-b,z:-d},{x,y:b,z:-d},'#46717825');
    for(let y=-90;y<=90;y+=45)this.line({x:-w,y,z:-d},{x:w,y,z:-d},'#46717825');
    for(let z=-50;z>=-300;z-=50){this.line({x:w,y:b,z},{x:w,y:-b,z},'#56899a29');this.text(`${-z} m`,{x:w+10,y:b,z},'#5d8b99',10);}
    // Fine suspended sediment and shafts of light.
    for(let i=0;i<65;i++){const x=Math.sin(i*73)*360,y=Math.cos(i*41)*100,z=-15-((i*37+g.time*2)%275);const p=this.project(x,y,z);c.fillStyle='#93cecb28';c.fillRect(p[0],p[1],this.scale,this.scale);}
    for(const s of [...g.subs].sort((a,b)=>b.z-a.z))if(s.z>-340)this.submarine(s,g);
    for(const p of g.projectiles){
      const pos=this.project(p.x,p.y,p.z);c.save();c.translate(...pos);c.scale(this.scale,this.scale);
      c.rotate(p.kind==='charge'?p.age*(p.wet?1:5):Math.atan2(p.vx*.5-p.vz,p.vx*.866)+Math.PI/2);
      if(p.kind==='charge'){c.fillStyle='#e3b26b';c.strokeStyle='#f6d899';c.lineWidth=1;c.fillRect(-5,-7,10,14);c.strokeRect(-5,-7,10,14);c.fillStyle='#7e7760';c.fillRect(-6,-4,12,2);c.fillRect(-6,3,12,2);}
      else {c.fillStyle='#ffbd8a';c.beginPath();c.moveTo(0,-10);c.lineTo(4,-3);c.lineTo(3,8);c.lineTo(-3,8);c.lineTo(-4,-3);c.closePath();c.fill();c.strokeStyle='#b5ebe7aa';c.beginPath();c.moveTo(0,11);c.lineTo(0,31);c.stroke();}c.restore();
      if(p.kind==='torpedo') {this.ring({x:p.x,y:p.y,z:0},10+Math.sin(g.time*6)*3,'#f1a27855');}
    }
    this.polygon([a,bb,cc,dd],'#2b9caa13','#71c3c77a');
    for(let i=0;i<32;i++){const x=-345+(i%8)*96,y=-85+Math.floor(i/8)*54;const z=Math.sin(g.time*1.5+i)*1.5;this.line({x,y,z},{x:x+18+Math.sin(i)*8,y:y+2,z},'#91e0d133',1.2);}
    this.polygon([dd,cc,{...cc,z:-d},{...dd,z:-d}],'#0d587010','#508a9855');
    this.polygon([bb,cc,{...cc,z:-d},{...bb,z:-d}],'#0d587013','#508a9855');
    this.vessel(g);
    for(const e of g.effects){const t=e.age/e.duration;const p=this.project(e.x,e.y,e.z);
      if(e.kind==='underwater'||e.kind==='fire'||e.kind==='breach') {
        const radius=(e.kind==='fire'?80:60)*this.scale;
        const glow=c.createRadialGradient(...p,0,...p,radius*(.3+t));
        glow.addColorStop(0,e.kind==='underwater'?`rgba(189,249,220,${(1-t)*.65})`:`rgba(255,224,155,${1-t})`);glow.addColorStop(.35,e.kind==='underwater'?`rgba(78,187,175,${(1-t)*.4})`:`rgba(255,113,51,${(1-t)*.8})`);glow.addColorStop(1,'transparent');c.fillStyle=glow;c.beginPath();c.arc(...p,radius*(.3+t),0,Math.PI*2);c.fill();
        this.ring(e,8+t*95,`rgba(171,231,221,${(1-t)*.5})`,2*(1-t));
      }
      if(e.kind!=='underwater'){for(let i=0;i<3;i++)this.ring({...e,z:0},5+t*85+i*7,`rgba(201,242,227,${(1-t)*.45})`,2*(1-t));}
    }
    for(const p of g.particles){const pos=this.project(p.x,p.y,p.z),alpha=1-p.age/p.life;c.globalAlpha=alpha;
      c.fillStyle=p.kind==='smoke'?'#26333b':p.kind==='spark'?'#ffc173':p.kind==='debris'?'#91a29a':'#b9ece3';c.beginPath();c.arc(...pos,Math.max(.3,p.size*this.scale*(p.kind==='bubble'?1+p.age*.6:1)),0,Math.PI*2);if(p.kind==='bubble'){c.strokeStyle='#a6e9d6';c.lineWidth=this.scale;c.stroke();}else c.fill();
    }c.globalAlpha=1;
    this.text('NORTH ATLANTIC / SECTOR 07',{x:-w,y:-b,z:30},'#74949b',10);
    this.text('SEA LEVEL',{x:w+12,y:-b,z:0},'#8cc4c4',10);
    this.text('ABYSSAL FLOOR',{x:-w,y:b,z:-d-24},'#577e89',10);
    c.restore();
  }
}

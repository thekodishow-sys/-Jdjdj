(function(){
'use strict';

const W=540,H=960,TAU=Math.PI*2,SAVE='astropyrg_rebuild_v1';
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
canvas.width=W; canvas.height=H;

const ZONES=[
 {from:0,to:3000,id:'city',name:'ДВОР / ГОРОД'},
 {from:3000,to:8000,id:'roofs',name:'КРЫШИ'},
 {from:8000,to:13000,id:'clouds',name:'ОБЛАКА'},
 {from:13000,to:20000,id:'atmo',name:'АТМОСФЕРА'},
 {from:20000,to:35000,id:'orbit',name:'ОРБИТА'},
 {from:35000,to:50000,id:'moon',name:'ЛУНА'},
 {from:50000,to:80000,id:'mars',name:'МАРС'},
 {from:80000,to:95000,id:'asteroid',name:'АСТЕРОИДЫ'},
 {from:95000,to:100000,id:'deep',name:'ДАЛЬНИЙ КОСМОС'},
 {from:100000,to:1e12,id:'beyond',name:'НЕИЗВЕДАННОЕ'}
];

function zoneFor(m){for(const z of ZONES) if(m>=z.from&&m<z.to)return z;return ZONES[ZONES.length-1];}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function rnd(a,b){return a+Math.random()*(b-a);}
function irnd(a,b){return Math.floor(rnd(a,b+1));}
function lerp(a,b,t){return a+(b-a)*t;}
function rects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function load(){
 try{
  const r=JSON.parse(localStorage.getItem(SAVE)||'{}');
  return {
   best:r.best||0,coins:r.coins||0,hearts:Math.max(0,Math.min(3,r.hearts==null?3:r.hearts)),
   inventory:Object.assign({magnet:0,shield:0,jetpack:0},r.inventory||{}),
   sound:r.sound!==false
  };
 }catch(e){return {best:0,coins:0,hearts:3,inventory:{magnet:0,shield:0,jetpack:0},sound:true};}
}
let store=load();
function persist(){localStorage.setItem(SAVE,JSON.stringify(store));}

class Sfx{
 constructor(){this.ac=null;}
 init(){if(!this.ac)try{this.ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} if(this.ac&&this.ac.state==='suspended')this.ac.resume();}
 tone(f,d=.06,type='sine',gain=.025,end=0){if(!store.sound)return;this.init();if(!this.ac)return;const a=this.ac,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,a.currentTime);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),a.currentTime+d);g.gain.setValueAtTime(gain,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+d);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+d);}
 jump(){this.tone(250,.07,'square',.018,360)}
 land(){this.tone(105,.045,'triangle',.02,80)}
 coin(){this.tone(690,.07,'sine',.025,970)}
 hurt(){this.tone(115,.14,'sawtooth',.032,65)}
 click(){this.tone(330,.035,'square',.015,420)}
 spring(){this.tone(360,.12,'square',.024,780)}
 zone(){this.tone(460,.25,'sine',.02,900)}
}
const sfx=new Sfx();

let scene='menu',t=0,last=performance.now(),menuFloat=0,devUnlocked=false,logoTaps=0;
let player,platforms=[],coins=[],particles=[],hazards=[],cameraY=-760,highestY=0,lastX=W/2;
let height=0,maxPlatformId=0,landedIds=new Set(),inputDir=0,pointerDown=false,power={magnet:0,shield:false,jet:0};
let gameOverReason='',flash=0,shake=0,zoneBanner=0,zoneBannerText='',zoneId='city';
let buttons=[];

function resetRun(startHeight){
 height=startHeight||0; maxPlatformId=0; landedIds=new Set(); cameraY=-760; platforms=[];coins=[];particles=[];hazards=[];
 highestY=0;lastX=W/2;power={magnet:0,shield:false,jet:0};gameOverReason='';flash=0;shake=0;zoneBanner=0;zoneId=zoneFor(height).id;
 store.hearts=3;persist();
 const ground={id:0,x:170,y:0,w:200,h:24,type:'base',vx:0,visited:true};
 platforms.push(ground);
 highestY=0;lastX=270;
 for(let i=0;i<11;i++)spawnPlatform();
 player={x:W/2-28,y:-76,prevY:-76,w:56,h:76,vx:0,vy:-900,tilt:0,alive:true,invuln:0};
}

function difficulty(){
 const x=Math.min(1,height/1200);
 return {gapMin:92+x*22,gapMax:122+x*30,maxDx:145+x*35,moving:.05+x*.12,breaking:.02+x*.08,ice:.015+x*.06,spring:.035};
}
function spawnPlatform(){
 const d=difficulty();
 highestY-=rnd(d.gapMin,d.gapMax);
 let x=clamp(lastX+rnd(-d.maxDx,d.maxDx),60,W-60);
 lastX=x;
 let type='normal',r=Math.random();
 if(height>25&&r<d.moving)type='moving';
 else if(height>55&&r<d.moving+d.breaking)type='break';
 else if(height>90&&r<d.moving+d.breaking+d.ice)type='ice';
 else if(r>1-d.spring)type='spring';
 const w=type==='moving'?112:type==='break'?118:132;
 const p={id:++maxPlatformId,x:x-w/2,y:highestY,w:w,h:18,type:type,vx:type==='moving'?(Math.random()<.5?-1:1)*rnd(42,66):0,visited:false,dead:false};
 platforms.push(p);
 if(Math.random()<.58) coins.push({x:x,y:highestY-38,r:11,t:rnd(0,TAU),taken:false});
 if(Math.random()<.018&&height>20) hazards.push(makeHazard(highestY-rnd(40,110)));
}
function makeHazard(y){
 const z=zoneFor(height).id,fromLeft=Math.random()<.5;
 return {x:fromLeft?-70:W+70,y:y,w:64,h:32,vx:(fromLeft?1:-1)*rnd(95,145),kind:(z==='city'||z==='roofs'||z==='clouds')?'bird':(z==='mars'||z==='asteroid'||z==='deep'||z==='beyond')?'meteor':'drone',dead:false};
}

function worldToScreenY(y){return y-cameraY;}
function screenToWorldY(y){return y+cameraY;}

function update(dt){
 t+=dt;menuFloat+=dt;
 if(scene!=='play')return;
 if(!player||!player.alive)return;
 player.prevY=player.y;
 player.invuln=Math.max(0,player.invuln-dt);
 let move=inputDir*285;
 player.vx=lerp(player.vx,move,clamp(dt*10,0,1));
 if(inputDir===0)player.vx*=Math.pow(.08,dt);
 player.x+=player.vx*dt;
 if(player.x+player.w<0)player.x=W; if(player.x>W)player.x=-player.w;
 const jetActive=power.jet>0;
 if(jetActive){power.jet-=dt;player.vy=-480;if(Math.random()<.6)addParticle(player.x+player.w/2,player.y+player.h, '#ffb64a',rnd(-30,30),rnd(80,190),rnd(2,5),.5);}
 else{player.vy+=2150*dt;player.y+=player.vy*dt;}
 if(jetActive)player.y+=player.vy*dt;

 // one-way platforms: collide only while descending and only when feet cross the top plane.
 if(player.vy>0){
  const prevBottom=player.prevY+player.h,curBottom=player.y+player.h;
  let hit=null,bestY=Infinity;
  for(const p of platforms){
   if(p.dead)continue;
   if(prevBottom<=p.y+3&&curBottom>=p.y&&player.x+player.w-10>p.x&&player.x+10<p.x+p.w){
    if(p.y<bestY){bestY=p.y;hit=p;}
   }
  }
  if(hit){
   player.y=hit.y-player.h;
   if(!hit.visited){hit.visited=true;landedIds.add(hit.id);height+=1;store.best=Math.max(store.best,height);persist();checkZone();}
   if(hit.type==='spring'){player.vy=-1160;sfx.spring();burst(player.x+player.w/2,hit.y,'#ffd44e',14);}
   else{player.vy=-900;sfx.land();burst(player.x+player.w/2,hit.y,'rgba(255,255,255,.85)',5);}
   if(hit.type==='break'){hit.dead=true;burst(hit.x+hit.w/2,hit.y,'#f5a66c',10);}
   if(hit.type==='ice')player.vx*=1.22;
  }
 }

 for(const p of platforms){
  if(p.dead)continue;
  if(p.type==='moving'){p.x+=p.vx*dt;if(p.x<18||p.x+p.w>W-18){p.vx*=-1;p.x=clamp(p.x,18,W-18-p.w);}}
 }
 for(const c of coins){
  c.t+=dt*5;
  if(c.taken)continue;
  if(power.magnet>0){
   const dx=player.x+player.w/2-c.x,dy=player.y+player.h/2-c.y,dist=Math.hypot(dx,dy);
   if(dist<190){c.x+=dx*dt*5;c.y+=dy*dt*5;}
  }
  const box={x:c.x-c.r,y:c.y-c.r,w:c.r*2,h:c.r*2};
  if(rects(player,box)){c.taken=true;store.coins++;persist();sfx.coin();burst(c.x,c.y,'#ffd449',8);}
 }
 power.magnet=Math.max(0,power.magnet-dt);

 for(const h of hazards){
  if(h.dead)continue;
  h.x+=h.vx*dt;
  if(h.kind==='meteor')h.y+=70*dt;
  if((h.x<-140||h.x>W+140||worldToScreenY(h.y)>H+180)){h.dead=true;continue;}
  if(player.invuln<=0&&rects(player,h)){
   h.dead=true;
   if(power.shield){power.shield=false;burst(player.x+player.w/2,player.y+player.h/2,'#7be7ff',18);shake=.25;}
   else damage('столкновение');
  }
 }
 if(Math.random()<dt*(height>200?0.12:0.035))hazards.push(makeHazard(cameraY+rnd(160,700)));

 const target=player.y-410;
 if(target<cameraY)cameraY=lerp(cameraY,target,clamp(dt*4.6,0,1));
 while(highestY>cameraY-520)spawnPlatform();

 platforms=platforms.filter(p=>!p.dead&&worldToScreenY(p.y)<H+260);
 coins=coins.filter(c=>!c.taken&&worldToScreenY(c.y)<H+240);
 hazards=hazards.filter(h=>!h.dead);

 for(const q of particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=320*dt;}
 particles=particles.filter(q=>q.life>0);
 if(worldToScreenY(player.y)>H+170)fall();
 flash=Math.max(0,flash-dt);shake=Math.max(0,shake-dt);zoneBanner=Math.max(0,zoneBanner-dt);
}

function checkZone(){
 const z=zoneFor(height);
 if(z.id!==zoneId){zoneId=z.id;zoneBanner=2.2;zoneBannerText=z.name;sfx.zone();flash=.2;}
}
function damage(reason){
 store.hearts=Math.max(0,store.hearts-1);persist();sfx.hurt();shake=.35;flash=.18;player.invuln=1.1;
 if(store.hearts<=0){endRun(reason);return;}
 player.vy=-630;player.vx*=-.6;
}
function fall(){
 if(store.hearts>1){
  store.hearts--;persist();sfx.hurt();shake=.3;
  const safe=platforms.filter(p=>!p.dead&&p.visited).sort((a,b)=>a.y-b.y)[0]||platforms[0];
  player.x=clamp(safe.x+safe.w/2-player.w/2,20,W-player.w-20);player.y=safe.y-player.h-4;player.prevY=player.y;player.vy=-820;cameraY=player.y-520;player.invuln=1.4;
 }else{store.hearts=0;persist();endRun('падение');}
}
function endRun(reason){player.alive=false;gameOverReason=reason;scene='gameover';buttons=[];buildGameOverButtons();}
function addParticle(x,y,color,vx,vy,r,life){particles.push({x:x,y:y,color:color,vx:vx,vy:vy,r:r,life:life,max:life});}
function burst(x,y,color,n){for(let i=0;i<n;i++)addParticle(x+rnd(-8,8),y+rnd(-4,4),color,rnd(-90,90),rnd(-150,-25),rnd(1.5,4),rnd(.35,.7));}

function usePower(k){
 if(scene!=='play'||!player.alive||store.inventory[k]<=0)return;
 store.inventory[k]--;persist();sfx.click();
 if(k==='magnet')power.magnet=20;
 if(k==='shield')power.shield=true;
 if(k==='jetpack')power.jet=5.5;
}

function draw(){
 ctx.save();
 if(shake>0)ctx.translate(rnd(-5,5)*shake/.35,rnd(-5,5)*shake/.35);
 if(scene==='menu')drawMenu();
 else if(scene==='shop')drawShop();
 else if(scene==='dev')drawDev();
 else {drawGame(); if(scene==='gameover')drawGameOver();}
 ctx.restore();
 if(flash>0){ctx.fillStyle='rgba(255,255,255,'+Math.min(.55,flash*2.5)+')';ctx.fillRect(0,0,W,H);}
}

function skyGradient(top,bottom){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
function starfield(alpha){
 ctx.save();ctx.globalAlpha=alpha;
 for(let i=0;i<88;i++){const x=(i*97.31)%W,y=(i*173.17+(cameraY*.035))%H;const yy=(y+H)%H;ctx.fillStyle=i%11===0?'#9fd8ff':'#fff';ctx.beginPath();ctx.arc(x,yy,i%13===0?1.8:.9,0,TAU);ctx.fill();}
 ctx.restore();
}
function cloud(x,y,s,a){ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y,55*s,19*s,0,0,TAU);ctx.ellipse(x-28*s,y-6*s,28*s,24*s,0,0,TAU);ctx.ellipse(x+20*s,y-11*s,34*s,30*s,0,0,TAU);ctx.fill();ctx.restore();}
function drawBackground(){
 const z=zoneFor(height),p=(cameraY*.12)%H;
 if(z.id==='city'){skyGradient('#48bff5','#ffd99a');ctx.fillStyle='rgba(255,238,160,.9)';ctx.beginPath();ctx.arc(440,135,58,0,TAU);ctx.fill();for(let i=0;i<6;i++)cloud((i*123+80+(cameraY*.02))%660-60,150+i*92,1,.32);drawCity(0.22,'#8fa6b3',120);drawCity(.38,'#314b68',40);}
 else if(z.id==='roofs'){skyGradient('#223a78','#f08b73');for(let i=0;i<5;i++)cloud((i*151+cameraY*.025)%690-70,110+i*116,.8,.2);drawCity(.18,'#65718c',170);drawCity(.34,'#1d2944',45);ctx.fillStyle='rgba(255,210,90,.8)';ctx.beginPath();ctx.arc(430,120,40,0,TAU);ctx.fill();}
 else if(z.id==='clouds'){skyGradient('#49bdf7','#bfeaff');for(let i=0;i<12;i++)cloud((i*117+cameraY*.018)%700-80,60+(i*79+(cameraY*.04))%840,1+rnd(-.15,.15),.42);}
 else if(z.id==='atmo'){skyGradient('#071b50','#53a9ef');starfield(.22);ctx.fillStyle='#2468a8';ctx.beginPath();ctx.ellipse(W/2,H+250,900,420,0,Math.PI,TAU);ctx.fill();ctx.fillStyle='rgba(130,220,255,.35)';ctx.beginPath();ctx.ellipse(W/2,H+240,930,440,0,Math.PI,TAU);ctx.strokeStyle='rgba(135,225,255,.5)';ctx.lineWidth=18;ctx.stroke();}
 else if(z.id==='orbit'){skyGradient('#02040d','#071633');starfield(1);drawPlanet(W+40,H+120,260,'#1a6cb6','#4bd1ff','#eafcff');}
 else if(z.id==='moon'){skyGradient('#02040c','#111a2d');starfield(.9);drawPlanet(435,145,76,'#cfd4df','#fff','#737a88');ctx.fillStyle='#aaa';ctx.beginPath();ctx.ellipse(W/2,H+170,760,250,0,Math.PI,TAU);ctx.fill();}
 else if(z.id==='mars'){skyGradient('#17070b','#4c1717');starfield(.8);drawPlanet(430,140,72,'#c14f2f','#f59a5e','#6f261d');ctx.fillStyle='#7b2f22';ctx.beginPath();ctx.ellipse(W/2,H+180,780,270,0,Math.PI,TAU);ctx.fill();}
 else if(z.id==='asteroid'){skyGradient('#010208','#0b1020');starfield(1);for(let i=0;i<10;i++){const x=(i*83+cameraY*.02)%650-50,y=(i*149+cameraY*.07)%1000;drawRock(x,y,10+(i%4)*6,.25);}}
 else {skyGradient('#010208','#12072b');starfield(1);const rg=ctx.createRadialGradient(120,260,10,120,260,230);rg.addColorStop(0,'rgba(94,62,220,.22)');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);const rg2=ctx.createRadialGradient(430,600,10,430,600,250);rg2.addColorStop(0,'rgba(0,190,255,.16)');rg2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg2;ctx.fillRect(0,0,W,H);}
}
function drawCity(par,color,base){
 ctx.save();ctx.fillStyle=color;const shift=(cameraY*par)%80;
 for(let i=-1;i<8;i++){const x=i*82+shift,h=120+((i*53)%160+160)%160;ctx.fillRect(x,H-h-base,72,h+base);ctx.fillStyle='rgba(255,224,115,.72)';for(let yy=H-h-base+22;yy<H-base-12;yy+=34)for(let xx=x+12;xx<x+62;xx+=22)ctx.fillRect(xx,yy,9,13);ctx.fillStyle=color;}
 ctx.restore();
}
function drawPlanet(x,y,r,c1,c2,c3){const g=ctx.createRadialGradient(x-r*.25,y-r*.25,r*.05,x,y,r);g.addColorStop(0,c3);g.addColorStop(.45,c2);g.addColorStop(1,c1);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
function drawRock(x,y,r,a){ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);ctx.fillStyle='#736a68';ctx.beginPath();ctx.moveTo(-r*.8,-r*.2);ctx.lineTo(-r*.2,-r);ctx.lineTo(r*.8,-r*.5);ctx.lineTo(r,r*.4);ctx.lineTo(.1,r);ctx.lineTo(-r*.9,r*.5);ctx.closePath();ctx.fill();ctx.restore();}

function drawPlatform(p){
 const y=worldToScreenY(p.y); if(y<-80||y>H+60)return;
 ctx.save();ctx.translate(p.x,y);
 let top='#6ce78c',edge='#276d4a',glow='rgba(130,255,170,.25)';
 const z=zoneFor(height).id;
 if(z==='roofs'){top='#e1d7cc';edge='#6b5761';glow='rgba(255,220,190,.2)'}
 if(z==='clouds'){top='#f7fcff';edge='#9fd7ef';glow='rgba(255,255,255,.35)'}
 if(z==='atmo'){top='#7ce4ff';edge='#315c91';glow='rgba(80,210,255,.35)'}
 if(z==='orbit'){top='#7895c7';edge='#273657';glow='rgba(96,170,255,.25)'}
 if(z==='moon'){top='#d4d4dc';edge='#666b78';glow='rgba(255,255,255,.18)'}
 if(z==='mars'){top='#d66b45';edge='#6e2d27';glow='rgba(255,130,80,.22)'}
 if(z==='asteroid'||z==='deep'||z==='beyond'){top='#706f86';edge='#2f3044';glow='rgba(140,120,255,.18)'}
 if(p.type==='moving'){top='#64c9ff';edge='#27577f'} if(p.type==='ice'){top='#bdf5ff';edge='#4a93b7'} if(p.type==='break'){top='#efa170';edge='#754235'} if(p.type==='spring'){top='#79ef94';edge='#2d6b45'}
 ctx.shadowColor=glow;ctx.shadowBlur=16;roundRect(0,0,p.w,18,8,edge);ctx.shadowBlur=0;roundRect(0,-5,p.w,15,8,top);
 ctx.fillStyle='rgba(255,255,255,.42)';roundRect(10,-2,p.w-20,4,2);
 if(p.type==='break'){ctx.strokeStyle='#6c3c35';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(p.w*.42,-4);ctx.lineTo(p.w*.52,9);ctx.lineTo(p.w*.62,-3);ctx.stroke();}
 if(p.type==='moving'){ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.moveTo(16,7);ctx.lineTo(26,1);ctx.lineTo(26,13);ctx.fill();ctx.beginPath();ctx.moveTo(p.w-16,7);ctx.lineTo(p.w-26,1);ctx.lineTo(p.w-26,13);ctx.fill();}
 if(p.type==='spring'){ctx.strokeStyle='#ffd84b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(p.w/2-18,-6);ctx.lineTo(p.w/2-10,-19);ctx.lineTo(p.w/2,-6);ctx.lineTo(p.w/2+10,-19);ctx.lineTo(p.w/2+18,-6);ctx.stroke();}
 ctx.restore();
}
function roundRect(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}

function drawAstronaut(){
 const sx=player.x+player.w/2,sy=worldToScreenY(player.y)+player.h/2;
 ctx.save();ctx.translate(sx,sy);const tilt=clamp(player.vx/450,-.26,.26);ctx.rotate(tilt);
 if(power.shield){ctx.strokeStyle='rgba(93,225,255,.75)';ctx.lineWidth=4;ctx.shadowColor='#5be2ff';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(0,0,54+Math.sin(t*6)*2,0,TAU);ctx.stroke();ctx.shadowBlur=0;}
 if(power.jet>0){for(let i=0;i<2;i++){const x=i?14:-14;const g=ctx.createLinearGradient(x,38,x,82);g.addColorStop(0,'#fff5a5');g.addColorStop(.4,'#ff9a35');g.addColorStop(1,'rgba(255,70,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-7,34);ctx.lineTo(x+7,34);ctx.lineTo(x+rnd(-7,7),74+rnd(0,14));ctx.closePath();ctx.fill();}}
 // backpack
 ctx.fillStyle='#304967';ctx.beginPath();ctx.roundRect(-34,-10,68,52,18);ctx.fill();
 ctx.fillStyle='#f5f8ff';ctx.beginPath();ctx.roundRect(-30,-8,60,60,22);ctx.fill();
 const stretch=clamp(player.vy/900,-1,1);
 // legs
 ctx.strokeStyle='#edf4ff';ctx.lineWidth=15;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,38);ctx.lineTo(-18-stretch*5,62);ctx.moveTo(13,38);ctx.lineTo(18+stretch*5,62);ctx.stroke();
 ctx.strokeStyle='#243b5a';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(-20-stretch*5,65);ctx.lineTo(-10-stretch*4,65);ctx.moveTo(10+stretch*4,65);ctx.lineTo(20+stretch*5,65);ctx.stroke();
 // arms
 ctx.strokeStyle='#f5f8ff';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(-38,16-stretch*9);ctx.moveTo(25,0);ctx.lineTo(38,16+stretch*9);ctx.stroke();
 // torso accents
 ctx.fillStyle='#d6e4f6';ctx.beginPath();ctx.roundRect(-15,13,30,22,7);ctx.fill();
 ctx.fillStyle='#4c6f94';ctx.beginPath();ctx.roundRect(-8,18,16,4,2);ctx.fill();
 ctx.fillStyle='#ffb33e';ctx.beginPath();ctx.arc(0,5,5,0,TAU);ctx.fill();
 // helmet
 ctx.shadowColor='rgba(120,220,255,.45)';ctx.shadowBlur=12;ctx.fillStyle='#f7fbff';ctx.beginPath();ctx.arc(0,-24,31,0,TAU);ctx.fill();ctx.shadowBlur=0;
 ctx.strokeStyle='#263b59';ctx.lineWidth=5;ctx.stroke();
 const visor=ctx.createLinearGradient(-22,-39,20,-8);visor.addColorStop(0,'#b8f0ff');visor.addColorStop(.38,'#3fa9dc');visor.addColorStop(1,'#102c54');ctx.fillStyle=visor;ctx.beginPath();ctx.roundRect(-22,-38,44,28,14);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.65)';ctx.beginPath();ctx.ellipse(-9,-31,9,4,-.35,0,TAU);ctx.fill();
 ctx.fillStyle='#ff754e';ctx.beginPath();ctx.arc(20,-20,4,0,TAU);ctx.fill();
 ctx.restore();
}
function drawCoin(c){
 const y=worldToScreenY(c.y);if(y<-50||y>H+50)return;ctx.save();ctx.translate(c.x,y);ctx.rotate(Math.sin(c.t)*.35);const sx=.65+.35*Math.abs(Math.cos(c.t));ctx.scale(sx,1);ctx.shadowColor='rgba(255,210,50,.7)';ctx.shadowBlur=12;ctx.fillStyle='#ffc82f';ctx.beginPath();ctx.arc(0,0,c.r,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff09b';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#c88c11';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('★',0,1);ctx.restore();
}
function drawHazard(h){
 const y=worldToScreenY(h.y); if(y<-80||y>H+100)return;ctx.save();ctx.translate(h.x+h.w/2,y+h.h/2);
 if(h.kind==='bird'){ctx.strokeStyle='#26384c';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.arc(-14,2,17,Math.PI*1.1,Math.PI*1.8);ctx.arc(14,2,17,Math.PI*1.2,Math.PI*1.9);ctx.stroke();}
 else if(h.kind==='drone'){ctx.fillStyle='#354c6d';ctx.beginPath();ctx.roundRect(-24,-11,48,22,8);ctx.fill();ctx.strokeStyle='#6fe6ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-35,-13);ctx.lineTo(35,-13);ctx.stroke();ctx.fillStyle='#ff5d6b';ctx.beginPath();ctx.arc(0,0,5,0,TAU);ctx.fill();}
 else{ctx.rotate(t*2);drawRock(0,0,22,1);ctx.fillStyle='rgba(255,126,55,.45)';ctx.beginPath();ctx.moveTo(-18,-6);ctx.lineTo(-52,0);ctx.lineTo(-18,7);ctx.fill();}
 ctx.restore();
}
function drawParticles(){for(const q of particles){const y=worldToScreenY(q.y);ctx.globalAlpha=clamp(q.life/q.max,0,1);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,y,q.r,0,TAU);ctx.fill();ctx.globalAlpha=1;}}
function drawGame(){
 drawBackground();
 for(const p of platforms)drawPlatform(p);
 for(const c of coins)if(!c.taken)drawCoin(c);
 for(const h of hazards)if(!h.dead)drawHazard(h);
 drawParticles();
 drawAstronaut();
 drawHud();
 if(zoneBanner>0){ctx.save();ctx.globalAlpha=Math.min(1,zoneBanner*2);ctx.textAlign='center';ctx.font='900 28px Arial';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillText(zoneBannerText,W/2,210);ctx.restore();}
}
function drawHud(){
 ctx.save();ctx.fillStyle='rgba(5,20,37,.84)';ctx.beginPath();ctx.roundRect(18,18,W-36,78,24);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.15)';ctx.stroke();
 ctx.fillStyle='#fff';ctx.font='900 25px Arial';ctx.fillText(height+' м',35,52);ctx.fillStyle='#9fd9ff';ctx.font='700 12px Arial';ctx.fillText(zoneFor(height).name,35,77);
 ctx.fillStyle='#ff7892';ctx.font='800 20px Arial';ctx.fillText('♥ '+store.hearts,320,56);ctx.fillStyle='#ffd34c';ctx.fillText('● '+store.coins,414,56);
 ctx.restore();
 drawPowerButton(92,894,'🚀',store.inventory.jetpack,'jetpack',power.jet>0);
 drawPowerButton(218,894,'🧲',store.inventory.magnet,'magnet',power.magnet>0);
 drawPowerButton(344,894,'🛡',store.inventory.shield,'shield',power.shield);
 ctx.save();ctx.fillStyle='rgba(5,20,37,.72)';ctx.beginPath();ctx.arc(474,894,36,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.font='28px Arial';ctx.textAlign='center';ctx.fillText('Ⅱ',474,903);ctx.restore();
}
function drawPowerButton(x,y,ico,count,key,active){
 ctx.save();ctx.fillStyle=active?'rgba(65,190,245,.9)':'rgba(5,20,37,.74)';ctx.beginPath();ctx.arc(x,y,38,0,TAU);ctx.fill();ctx.strokeStyle=active?'#b9f4ff':'rgba(255,255,255,.18)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='24px Arial';ctx.textAlign='center';ctx.fillText(ico,x,y-2);ctx.font='700 13px Arial';ctx.fillText(String(count),x,y+24);ctx.restore();
}

function drawMenu(){
 skyGradient('#4bc3f4','#ffd99f');drawCity(.18,'#9eb0b7',120);drawCity(.32,'#344d69',40);
 ctx.save();ctx.textAlign='center';ctx.font='900 52px Arial';ctx.strokeStyle='#173754';ctx.lineWidth=10;ctx.strokeText('АСТРОПРЫГ',W/2,100);ctx.fillStyle='#fff';ctx.fillText('АСТРОПРЫГ',W/2,100);ctx.font='800 14px Arial';ctx.fillStyle='#234d69';ctx.fillText('ВЕРТИКАЛЬНОЕ ПРИКЛЮЧЕНИЕ',W/2,132);ctx.restore();
 const yy=292+Math.sin(menuFloat*2.3)*10;drawMenuAstronaut(W/2,yy);
 card(32,420,W-64,122,'rgba(255,255,255,.82)');
 ctx.fillStyle='#153a55';ctx.font='800 20px Arial';ctx.fillText('РЕКОРД',58,453);ctx.font='900 32px Arial';ctx.fillText(store.best+' м',58,488);ctx.font='800 20px Arial';ctx.fillText('МОНЕТЫ',310,453);ctx.font='900 32px Arial';ctx.fillStyle='#d18e09';ctx.fillText('● '+store.coins,310,488);
 button(70,575,400,82,'ИГРАТЬ',()=>{sfx.click();resetRun(0);scene='play';buttons=[];});
 button(70,675,190,66,'МАГАЗИН',()=>{sfx.click();scene='shop';buttons=[];buildShopButtons();},'#244b68',18);
 button(280,675,190,66,'ЗВУК '+(store.sound?'ВКЛ':'ВЫКЛ'),()=>{store.sound=!store.sound;persist();sfx.click();buttons=[];},'#244b68',16);
 if(devUnlocked)button(150,765,240,58,'DEV ЛОКАЦИИ',()=>{scene='dev';buttons=[];buildDevButtons();},'#4f3c73',16);
 ctx.fillStyle='#244b68';ctx.font='13px Arial';ctx.textAlign='center';ctx.fillText('Удерживай левую или правую половину экрана',W/2,866);ctx.fillText('Прыжок автоматический • платформы односторонние',W/2,888);
 buttons.push({x:130,y:42,w:280,h:90,cb:()=>{logoTaps++;if(logoTaps>=5){devUnlocked=true;logoTaps=0;}}});
}
function drawMenuAstronaut(x,y){
 const fake=player;player={x:x-28,y:y-38,w:56,h:76,vx:Math.sin(menuFloat)*50,vy:-100};const oldCam=cameraY;cameraY=0;drawAstronaut();cameraY=oldCam;player=fake;
 ctx.save();ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.ellipse(x,y+74,78,16,0,0,TAU);ctx.fill();ctx.restore();
}
function drawShop(){
 skyGradient('#071525','#102c45');starfield(.65);
 ctx.fillStyle='#fff';ctx.font='900 36px Arial';ctx.textAlign='center';ctx.fillText('МАГАЗИН',W/2,72);
 ctx.fillStyle='#ffd34c';ctx.font='800 21px Arial';ctx.fillText('● '+store.coins+' монет',W/2,110);
 shopCard(36,160,'🚀','РЕАКТИВНЫЙ РАНЕЦ','5 секунд управляемого подъёма',120,'jetpack');
 shopCard(36,315,'🧲','МАГНИТ','20 секунд притягивает монеты',80,'magnet');
 shopCard(36,470,'🛡','ЩИТ','Поглощает одно столкновение',100,'shield');
 button(150,735,240,64,'НАЗАД',()=>{sfx.click();scene='menu';buttons=[];},'#244b68',18);
}
function shopCard(x,y,ico,title,desc,price,key){
 card(x,y,W-72,126,'rgba(255,255,255,.08)');ctx.fillStyle='#fff';ctx.font='32px Arial';ctx.textAlign='left';ctx.fillText(ico,x+24,y+50);ctx.font='800 18px Arial';ctx.fillText(title,x+76,y+37);ctx.fillStyle='#9fc0d6';ctx.font='14px Arial';ctx.fillText(desc,x+76,y+63);ctx.fillStyle='#7fe4a0';ctx.font='700 13px Arial';ctx.fillText('в инвентаре: '+store.inventory[key],x+76,y+91);
 button(x+W-72-128,y+78,105,38,price+' ●',()=>{if(store.coins>=price){store.coins-=price;store.inventory[key]++;persist();sfx.coin();}else sfx.hurt();},'#d28b13',14);
}
function drawDev(){
 skyGradient('#090d19','#19102d');starfield(1);ctx.fillStyle='#fff';ctx.font='900 30px Arial';ctx.textAlign='center';ctx.fillText('DEV: ПРОВЕРКА ЛОКАЦИЙ',W/2,70);
 ctx.fillStyle='#9fb6d8';ctx.font='14px Arial';ctx.fillText('Только для теста. Выбирает высоту и запускает игру.',W/2,104);
 const vals=[0,3000,8000,13000,20000,35000,50000,80000,95000,100000];
 vals.forEach((v,i)=>{const col=i%2,row=Math.floor(i/2),x=42+col*250,y=150+row*92;card(x,y,208,66,'rgba(255,255,255,.08)');ctx.fillStyle='#fff';ctx.font='800 17px Arial';ctx.textAlign='center';ctx.fillText(v.toLocaleString('ru-RU')+' м',x+104,y+28);ctx.fillStyle='#8ecbff';ctx.font='11px Arial';ctx.fillText(zoneFor(v).name,x+104,y+49);buttons.push({x:x,y:y,w:208,h:66,cb:()=>{resetRun(v);scene='play';buttons=[];}});});
 button(150,760,240,60,'НАЗАД',()=>{scene='menu';buttons=[];},'#31445f',18);
}
function drawGameOver(){
 ctx.fillStyle='rgba(3,10,20,.78)';ctx.fillRect(0,0,W,H);card(44,230,W-88,390,'rgba(11,28,47,.96)');
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='900 36px Arial';ctx.fillText('ПОЛЁТ ОКОНЧЕН',W/2,296);ctx.fillStyle='#a9c7df';ctx.font='16px Arial';ctx.fillText(gameOverReason,W/2,330);
 ctx.fillStyle='#fff';ctx.font='900 46px Arial';ctx.fillText(height+' м',W/2,400);ctx.fillStyle='#ffd34c';ctx.font='800 19px Arial';ctx.fillText('Рекорд '+store.best+' м  •  ● '+store.coins,W/2,440);
}
function buildGameOverButtons(){
 buttons=[];
 buttons.push({x:95,y:475,w:350,h:66,cb:()=>{store.hearts=3;persist();resetRun(0);scene='play';buttons=[];}});
 buttons.push({x:145,y:555,w:250,h:56,cb:()=>{store.hearts=3;persist();scene='menu';buttons=[];}});
}
function drawGameOverButtons(){
 buttonVisual(95,475,350,66,'ЕЩЁ РАЗ','#ff7a3c',22);buttonVisual(145,555,250,56,'В МЕНЮ','#31445f',18);
}
const oldDrawGameOver=drawGameOver;
drawGameOver=function(){oldDrawGameOver();drawGameOverButtons();};

function card(x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,22);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=2;ctx.stroke();}
function button(x,y,w,h,label,cb,color,size){
 buttonVisual(x,y,w,h,label,color||'#ff7a3c',size||22);buttons.push({x:x,y:y,w:w,h:h,cb:cb});
}
function buttonVisual(x,y,w,h,label,color,size){
 ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.roundRect(x+4,y+6,w,h,20);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,20);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.font='900 '+size+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x+w/2,y+h/2+1);ctx.textBaseline='alphabetic';
}
function buildShopButtons(){buttons=[];}
function buildDevButtons(){buttons=[];}

function handleDown(x,y){
 sfx.init();
 if(scene==='play'){
  if(y>850){
   if(Math.hypot(x-92,y-894)<48){usePower('jetpack');return;}
   if(Math.hypot(x-218,y-894)<48){usePower('magnet');return;}
   if(Math.hypot(x-344,y-894)<48){usePower('shield');return;}
   if(Math.hypot(x-474,y-894)<48){scene='menu';persist();buttons=[];return;}
  }
  pointerDown=true;inputDir=x<W/2?-1:1;return;
 }
 for(let i=buttons.length-1;i>=0;i--){const b=buttons[i];if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){b.cb();return;}}
}
function handleMove(x,y){if(scene==='play'&&pointerDown)inputDir=x<W/2?-1:1;}
function handleUp(){pointerDown=false;inputDir=0;}
function pos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=pos(e);handleDown(p.x,p.y);});
canvas.addEventListener('pointermove',e=>{if(pointerDown){const p=pos(e);handleMove(p.x,p.y);}});
window.addEventListener('pointerup',handleUp);
window.addEventListener('pointercancel',handleUp);
window.addEventListener('keydown',e=>{if(scene==='play'){if(e.key==='ArrowLeft')inputDir=-1;if(e.key==='ArrowRight')inputDir=1;}});
window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')inputDir=0;});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pointerDown=false;inputDir=0;persist();}});

function frame(now){
 const dt=Math.min(.034,(now-last)/1000||.016);last=now;
 buttons=[];
 update(dt);
 draw();
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__ASTROPYRG_READY__=true;
document.getElementById('boot').style.display='none';
})();
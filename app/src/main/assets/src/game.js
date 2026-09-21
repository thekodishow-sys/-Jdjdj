/* АстроПрыг — playable vertical slice. Phaser 3.90 */
const W=540,H=960,SAVE='astropyrg-save-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const defaultSave=()=>({height:0,record:0,coins:0,hearts:3,inventory:{jetpack:0,magnet:0,shield:0,spring:0},checkpoint:0});
function loadSave(){try{return {...defaultSave(),...JSON.parse(localStorage.getItem(SAVE)||'{}')}}catch{return defaultSave()}}
function writeSave(s){localStorage.setItem(SAVE,JSON.stringify(s))}

class BootScene extends Phaser.Scene{
  constructor(){super('Boot')}
  create(){this.makeTextures();this.scene.start('Menu')}
  makeTextures(){
    const g=this.make.graphics({x:0,y:0,add:false});
    // astronaut
    g.clear();g.fillStyle(0xffffff).fillRoundedRect(18,22,60,76,25);g.fillStyle(0xd9f4ff).fillRoundedRect(28,8,40,37,16);g.lineStyle(5,0x20304c).strokeRoundedRect(28,8,40,37,16);g.fillStyle(0x2e8bd8).fillRoundedRect(34,14,28,21,10);g.fillStyle(0xff8f3d).fillCircle(48,25,5);g.fillStyle(0x20304c).fillRoundedRect(8,40,16,43,8).fillRoundedRect(72,40,16,43,8);g.fillStyle(0x20304c).fillRoundedRect(24,92,20,16,8).fillRoundedRect(52,92,20,16,8);g.fillStyle(0x6d7d94).fillRoundedRect(36,52,24,30,6);g.generateTexture('astronaut',96,112);
    // platform grass
    g.clear();g.fillStyle(0x6d4938).fillRoundedRect(0,8,120,22,9);g.fillStyle(0x56c95f).fillRoundedRect(0,0,120,13,8);g.fillStyle(0x95ea72).fillRect(8,0,18,5).fillRect(54,0,22,5).fillRect(92,0,16,5);g.generateTexture('platform',120,32);
    // moving platform
    g.clear();g.fillStyle(0x41506b).fillRoundedRect(0,5,105,22,8);g.fillStyle(0x87d8ff).fillRoundedRect(5,0,95,10,6);g.fillStyle(0xffffff).fillCircle(20,17,4).fillCircle(85,17,4);g.generateTexture('platformMove',105,30);
    // spring
    g.clear();g.lineStyle(5,0xf3d54e);for(let i=0;i<4;i++){g.lineBetween(6+i*10,28-i*6,16+i*10,22-i*6);g.lineBetween(16+i*10,22-i*6,26+i*10,28-i*6)}g.fillStyle(0xff7e4a).fillRoundedRect(0,30,65,10,4);g.generateTexture('spring',65,40);
    // coin
    g.clear();g.fillStyle(0xffc928).fillCircle(20,20,18);g.lineStyle(4,0xffed7a).strokeCircle(20,20,14);g.fillStyle(0xfff3a5).fillCircle(15,14,4);g.generateTexture('coin',40,40);
    // city cloud
    g.clear();g.fillStyle(0xffffff,0.85).fillCircle(34,28,25).fillCircle(62,23,31).fillCircle(91,30,23).fillRoundedRect(28,28,72,24,12);g.generateTexture('cloud',125,58);
    g.destroy();
  }
}

class MenuScene extends Phaser.Scene{
  constructor(){super('Menu')}
  create(){
    const s=loadSave();
    this.cameras.main.setBackgroundColor('#9adfff');
    const bg=this.add.graphics(); bg.fillGradientStyle(0x9adfff,0x9adfff,0xffd797,0xffd797,1).fillRect(0,0,W,H);
    for(let i=0;i<8;i++) this.add.image(Phaser.Math.Between(20,W-20),Phaser.Math.Between(70,500),'cloud').setAlpha(.55).setScale(Phaser.Math.FloatBetween(.6,1.3));
    const skyline=this.add.graphics(); skyline.fillStyle(0x65708b); for(let x=-20;x<W;x+=58){let h=Phaser.Math.Between(130,280);skyline.fillRect(x,H-h,54,h); skyline.fillStyle(0xffe78b);for(let yy=H-h+24;yy<H-30;yy+=35)for(let xx=x+10;xx<x+45;xx+=18)skyline.fillRect(xx,yy,8,12);skyline.fillStyle(0x65708b)}
    this.add.text(W/2,145,'АСТРОПРЫГ',{fontFamily:'Arial Black',fontSize:'52px',color:'#ffffff',stroke:'#20304c',strokeThickness:10}).setOrigin(.5).setAngle(-2);
    this.add.image(W/2,300,'astronaut').setScale(1.7).setAngle(5);
    this.card(60,440,420,180);this.add.text(90,470,`Высота  ${s.height} м\nРекорд   ${s.record} м`,{fontSize:'28px',color:'#20304c',fontStyle:'bold',lineSpacing:12});this.add.text(355,472,`❤ ${s.hearts}\n● ${s.coins}`,{fontSize:'28px',color:'#20304c',fontStyle:'bold',lineSpacing:12});
    this.bigButton(90,650,360,92,s.height>0?'ПРОДОЛЖИТЬ':'СТАРТG,()=>this.scene.start('Game'));
    this.smallButton(90,765,170,70,'УСИЛЕНИЯ',()=>this.scene.start('Shop'));
    this.smallButton(280,765,170,70,'DEV',()=>this.scene.start('Game',{dev:true}));
    this.add.text(W/2,875,'Вертикальный срез • первые 100 м',{fontSize:'18px',color:'#20304c'}).setOrigin(.5);
  }
  card(x,y,w,h){const g=this.add.graphics();g.fillStyle(0xffffff,.82).fillRoundedRect(x,y,w,h,28);g.lineStyle(3,0xffffff,.9).strokeRoundedRect(x,y,w,h,28)}
  bigButton(x,y,w,h,label,cb){const b=this.add.rectangle(x+w/2,y+h/2,w,h,0xff7b3a).setStrokeStyle(6,0xffffff).setInteractive({useHandCursor:true});this.add.text(b.x,b.y,label,{fontSize:'34px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);b.on('pointerdown',cb)}
  smallButton(x,y,w,h,label,cb){const b=this.add.rectangle(x+w/2,y+h/2,w,h,0x20304c).setStrokeStyle(4,0xffffff).setInteractive({useHandCursor:true});this.add.text(b.x,b.y,label,{fontSize:'20px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);b.on('pointerdown',cb)}
}

class ShopScene extends Phaser.Scene{
  constructor(){super('Shop')}
  create(){this.s=loadSave();this.cameras.main.setBackgroundColor('#0c1a30');this.add.text(W/2,70,'УСИЛЕНИЯ',{fontSize:'42px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);this.add.text(W/2,120,`Монеты: ${this.s.coins}`,{fontSize:'24px',color:'#ffd04a'}).setOrigin(.5);
    const items=[['jetpack','🚀 Реактивный ранец',500],['magnet','🧲 Магнит монет',250],['shield','🛡 Щит',350],['spring','⚡ Супер-пружина',200]];
    items.forEach((it,i)=>this.item(45,180+i*145,450,118,...it));
    this.button(W/2,840,260,70,'НАЗАД',()=>this.scene.start('Menu'));
  }
  item(x,y,w,h,key,label,price){const r=this.add.rectangle(x+w/2,y+h/2,w,h,0x152944).setStrokeStyle(2,0x4c6c95);this.add.text(x+24,y+18,label,{fontSize:'23px',fontStyle:'bold',color:'#fff'});this.add.text(x+24,y+58,`В инвентаре: ${this.s.inventory[key]||0}`,{fontSize:'18px',color:'#9ec7ff'});const b=this.add.rectangle(x+w-86,y+h/2,140,62,0xffa42f).setInteractive({useHandCursor:true});this.add.text(b.x,b.y,`${price} ●`,{fontSize:'21px',fontStyle:'bold',color:'#20304c'}).setOrigin(.5);b.on('pointerdown',()=>{if(this.s.coins>=price){this.s.coins-=price;this.s.inventory[key]=(this.s.inventory[key]||0)+1;writeSave(this.s);this.scene.restart()}})}
  button(x,y,w,h,label,cb){const b=this.add.rectangle(x,y,w,h,0x2a66ad).setInteractive({useHandCursor:true});this.add.text(x,y,label,{fontSize:'22px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);b.on('pointerdown',cb)}
}

class GameScene extends Phaser.Scene{
  constructor(){super('Game')}
  init(data){this.dev=!!data.dev}
  create(){
    this.s=loadSave();this.heightM=this.s.height||0;this.lastPlatformId=this.heightM;this.alive=true;this.magnetUntil=0;this.shieldActive=false;this.jetUntil=0;
    this.physics.world.setBounds(0,-100000,W,101000);
    this.buildBackground();
    this.platforms=this.physics.add.staticGroup();this.coins=this.physics.add.group({allowGravity:false});this.springs=this.physics.add.staticGroup();
    this.player=this.physics.add.sprite(W/2,H-170,'astronaut').setScale(.72).setBodySize(55,92).setBounce(0).setCollideWorldBounds(true);this.player.body.setGravityY(920);
    this.generateInitial();
    this.physics.add.collider(this.player,this.platforms,(p,plat)=>this.land(p,plat));
    this.physics.add.collider(this.player,this.springs,()=>this.springHit());
    this.physics.add.overlap(this.player,this.coins,(_,c)=>this.collectCoin(c));
    this.keys=this.input.keyboard.createCursorKeys();this.input.on('pointerdown',p=>this.pointerX=p.x);this.input.on('pointermove',p=>{if(p.isDown)this.pointerX=p.x});this.input.on('pointerup',()=>this.pointerX=null);
    this.makeHUD();if(this.dev)this.makeDev();
    this.jump();
  }
  buildBackground(){
    const g=this.add.graphics().setScrollFactor(0);g.fillGradientStyle(0x8fd5ff,0x8fd5ff,0xffe0a8,0xffe0a8,1).fillRect(0,0,W,H);
    const city=this.add.graphics().setScrollFactor(.15);city.fillStyle(0x93a2b5);for(let x=-30;x<W+60;x+=70){const h=Phaser.Math.Between(180,330);city.fillRect(x,H-h,65,h)}
    this.clouds=[];for(let i=0;i<8;i++){let c=this.add.image(Phaser.Math.Between(0,W),Phaser.Math.Between(50,700),'cloud').setAlpha(.55).setScale(Phaser.Math.FloatBetween(.7,1.4)).setScrollFactor(.07);this.clouds.push(c)}
  }
  generateInitial(){
    const baseY=H-90;for(let i=0;i<32;i++){const y=baseY-i*112;const x=i===0?W/2:Phaser.Math.Between(85,W-85);const moving=i>10&&i%7===0;const tex=moving?'platformMove':'platform';let p=this.platforms.create(x,y,tex);p.setData('id',Math.max(0,this.heightM+i));p.refreshBody(); if(moving){p.setData('moving',true);p.setData('dir',i%2?1:-1)}
      if(i>0&&Phaser.Math.Between(0,100)<55){let c=this.coins.create(x,y-58,'coin').setScale(.72);c.setData('baseY',y-58)}
      if(i>6&&i%11===0){let sp=this.springs.create(x,y-24,'spring').setScale(.8);sp.refreshBody()}
    }
  }
  jump(){if(!this.alive)return;this.player.setVelocityY(-690)}
  land(p,plat){if(!this.alive||p.body.velocity.y<=0)return;const id=plat.getData('id');if(id>this.lastPlatformId){this.lastPlatformId=id;this.heightM+=1;this.s.height=this.heightM;this.s.record=Math.max(this.s.record,this.heightM);if(this.heightM%20===0)this.s.checkpoint=this.heightM;writeSave(this.s);this.heightText.setText(`${this.heightM} м`);this.recordText.setText(`рекорд ${this.s.record}`)}this.jump();this.cameras.main.shake(40,.0025)}
  springHit(){if(this.player.body.velocity.y>0){this.player.setVelocityY(-980);this.cameras.main.shake(90,.006)}}
  collectCoin(c){c.destroy();this.s.coins++;writeSave(this.s);this.coinText.setText(`${this.s.coins}`);this.tweens.add({targets:this.coinText,scale:1.25,duration:90,yoyo:true})}
  makeHUD(){
    const panel=this.add.rectangle(270,52,500,72,0x0d1b30,.72).setScrollFactor(0).setDepth(20);this.heightText=this.add.text(30,28,`${this.heightM} м`,{fontSize:'28px',fontStyle:'bold',color:'#fff'}).setScrollFactor(0).setDepth(21);this.recordText=this.add.text(30,61,`рекорд ${this.s.record}`,{fontSize:'15px',color:'#a8c4e8'}).setScrollFactor(0).setDepth(21);this.heartText=this.add.text(328,34,`❤ ${this.s.hearts}`,{fontSize:'22px',color:'#ff7b86'}).setScrollFactor(0).setDepth(21);this.coinText=this.add.text(430,34,`${this.s.coins}`,{fontSize:'22px',color:'#ffd348'}).setScrollFactor(0).setDepth(21);
    this.add.text(406,72,'●',{fontSize:'18px',color:'#ffd348'}).setScrollFactor(0).setDepth(21);
    const inv=[['jetpack','🚀',70],['magnet','🧲',145],['shield','🛡',220]];inv.forEach(([key,ico,x])=>{const b=this.add.rectangle(x,H-58,62,62,0x0c1a30,.84).setStrokeStyle(2,0xffffff,.5).setScrollFactor(0).setDepth(30).setInteractive();const t=this.add.text(x,H-60,`${ico}\n${this.s.inventory[key]||0}`,{fontSize:'17px',align:'center',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(31);b.on('pointerdown',()=>this.usePower(key,t))});
    const menu=this.add.text(W-20,H-32,'☰',{fontSize:'30px',color:'#fff'}).setOrigin(1,.5).setScrollFactor(0).setDepth(31).setInteractive();menu.on('pointerdown',()=>this.scene.start('Menu'));
  }
  usePower(key,label){if((this.s.inventory[key]||0)<=0||!this.alive)return;this.s.inventory[key]--;writeSave(this.s);label.setText(`${key==='jetpack'?'🚀':key==='magnet'?'🧲':'🛡'}\n${this.s.inventory[key]||0}`);if(key==='jetpack'){this.jetUntil=this.time.now+5500;this.player.setTint(0xffdd88)}if(key==='magnet'){this.magnetUntil=this.time.now+20000}if(key==='shield'){this.shieldActive=true;this.player.setTint(0x77ddff)}}
  makeDev(){const vals=[0,10,25,50,75,100];vals.forEach((v,i)=>{const b=this.add.text(10,120+i*38,`${v}m`,{fontSize:'16px',backgroundColor:'#0009',padding:{x:8,y:4},color:'#fff'}).setScrollFactor(0).setDepth(50).setInteractive();b.on('pointerdown',()=>{this.heightM=v;this.s.height=v;this.s.record=Math.max(this.s.record,v);writeSave(this.s);this.heightText.setText(`${v} м`)})});const grant=this.add.text(10,360,'+1000●\n+powers',{fontSize:'15px',backgroundColor:'#0009',padding:{x:8,y:6},color:'#fff'}).setScrollFactor(0).setDepth(50).setInteractive();grant.on('pointerdown',()=>{this.s.coins+=1000;for(const k of Object.keys(this.s.inventory))this.s.inventory[k]+=3;writeSave(this.s);this.scene.restart({dev:true})})}
  update(t){if(!this.alive)return;let vx=0;if(this.keys.left.isDown)vx=-260;if(this.keys.right.isDown)vx=260;if(this.pointerX!=null)vx=clamp((this.pointerX-this.player.x)*4,-280,280);this.player.setVelocityX(vx);
    if(t<this.jetUntil){this.player.setVelocityY(-510);this.player.body.setGravityY(0);this.heightM+=this.game.loop.delta/1000*4;this.heightText.setText(`${Math.floor(this.heightM)} м`)}else{if(this.player.body.gravity.y===0){this.player.clearTint();this.player.body.setGravityY(920);this.s.height=Math.floor(this.heightM);this.s.record=Math.max(this.s.record,this.s.height);writeSave(this.s)}}
    if(t<this.magnetUntil){this.coins.children.iterate(c=>{if(c&&c.active){const d=Phaser.Math.Distance.Between(this.player.x,this.player.y,c.x,c.y);if(d<180){this.physics.moveToObject(c,this.player,340)}}})}
    this.platforms.children.iterate(p=>{if(p&&p.getData('moving')){let x=p.x+p.getData('dir')*1.1;if(x<70||x>W-70)p.setData('dir',-p.getData('dir'));p.x=x;p.refreshBody()}});
    if(this.player.y<this.cameras.main.scrollY+H*.42)this.cameras.main.scrollY=this.player.y-H*.42;
    if(this.player.y>this.cameras.main.scrollY+H+140)this.fail();
  }
  fail(){if(!this.alive)return;this.alive=false;this.s.hearts=Math.max(0,this.s.hearts-1);this.s.height=Math.floor(this.heightM);writeSave(this.s);this.heartText.setText(`❤ ${this.s.hearts}`);this.player.setVelocity(0,0);this.player.body.enable=false;const shade=this.add.rectangle(W/2,H/2,W,H,0x07111f,.72).setScrollFactor(0).setDepth(100);this.add.text(W/2,H/2-90,'ПАДЕНИЕ',{fontSize:'44px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(101);this.add.text(W/2,H/2-30,`Высота: ${Math.floor(this.heightM)} м`,{fontSize:'24px',color:'#cfe7ff'}).setOrigin(.5).setScrollFactor(0).setDepth(101);const retry=this.add.rectangle(W/2,H/2+65,330,78,0xff7b3a).setScrollFactor(0).setDepth(101).setInteractive();this.add.text(W/2,H/2+65,this.s.hearts>0?'ПРОДОЛЖИТЬ':'РЕКЛАМА → +1 ❤',{fontSize:'23px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(102);retry.on('pointerdown',()=>{if(this.s.hearts===0)this.s.hearts=1;writeSave(this.s);this.scene.restart({dev:this.dev})});const exit=this.add.text(W/2,H/2+140,'В меню',{fontSize:'22px',color:'#fff'}).setOrigin(.5).setScrollFactor(0).setDepth(102).setInteractive();exit.on('pointerdown',()=>this.scene.start('Menu'))}
}

new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#8fd5ff',physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[BootScene,MenuScene,ShopScene,GameScene]});

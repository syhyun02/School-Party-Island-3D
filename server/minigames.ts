import {validAvatar} from '../shared/presentation.js';
import {randomInt} from 'node:crypto';
import {type Actor,type GameId,type Input,type MiniState,type MiniResult,jumpHeight,tileColor,barAngle} from '../shared/minigames.js';
const rng=()=>randomInt(0,1_000_000)/1_000_000;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function createMini(game:GameId,ids:string[],random= rng,avatars:number[]=[]):MiniState {
 return {game,elapsed:0,duration:60,angle:0,safe:Math.floor(random()*4),cycle:0,collapsed:false,hazards:[],nextHazard:1,photo:0,flashUntil:0,done:false,
 actors:ids.map((id,i)=>({id,avatar:validAvatar(avatars[i])?avatars[i]:i%4,x:Math.cos(i*Math.PI/2)*3.4,z:Math.sin(i*Math.PI/2)*3.4,hp:3,points:0,outAt:null,jumpAt:-10,actionAt:-10,hitAt:-10,dx:0,dz:-1,progress:0,lane:(i-1.5)*.6,speed:0,boosts:1,pickup:0,finishAt:null,input:{x:0,z:0},inputAt:-10,hits:0}))};
}
export function setInput(m:MiniState,id:string,input:Input){
 const a=m.actors.find(p=>p.id===id);
 if(!a||!input||!Number.isFinite(input.x)||!Number.isFinite(input.z)||m.done)return;
 const x=clamp(input.x,-1,1),z=clamp(input.z,-1,1),len=Math.max(1,Math.hypot(x,z));
 a.input={x:x/len,z:z/len};a.inputAt=m.elapsed;
}
export function action(m:MiniState,id:string){
 const a=m.actors.find(p=>p.id===id);if(!a||a.outAt!==null||m.done)return;
 const cooldown=m.game==='kart'?3:m.game==='photo'||m.game==='robot'?1.6:1;
 if(m.elapsed-a.actionAt<cooldown)return;
 if(m.game==='kart'){if(a.boosts<=0||a.finishAt!==null)return;a.boosts--;}
 if(m.game==='meteor')return;
 a.actionAt=m.elapsed;
 if(m.game==='color'||m.game==='lighthouse')a.jumpAt=m.elapsed;
}
function damage(m:MiniState,a:Actor){if(a.outAt!==null||m.elapsed-a.hitAt<1)return false;a.hp--;a.hits++;a.hitAt=m.elapsed;if(a.hp<=0)a.outAt=m.elapsed;return true;}
export function stepMini(m:MiniState,dt:number,random=rng){
 if(m.done)return;
 dt=clamp(dt,0,.1);m.elapsed=Math.min(m.duration,m.elapsed+dt);const t=m.elapsed;
 m.angle=barAngle(t);
 if(m.game==='color'){
 const cycle=Math.floor(t/7.5);
 if(cycle!==m.cycle){m.cycle=cycle;m.safe=Math.floor(random()*4);}
 m.collapsed=t%7.5>=6;
 }
 for(const a of m.actors){
 if(a.outAt!==null||a.finishAt!==null)continue;
 const input=t-a.inputAt<.35?a.input:{x:0,z:0};
 if(m.game==='kart'){
 a.lane=clamp(a.lane+input.x*dt*3,-2.6,2.6);
 const offroad=Math.abs(a.lane)>1.65;
 const target=offroad?1.6:input.z>.3?3.0:t-a.actionAt<1.2?10:6.2;
 a.speed+=(target-a.speed)*Math.min(1,dt*3);
 a.progress+=a.speed*dt;
 const checkpoint=Math.floor(a.progress/14);
 if(checkpoint>a.pickup){a.pickup=checkpoint;if(Math.abs(a.lane)<.9)a.boosts=Math.min(3,a.boosts+1);}
 const angle=a.progress/7;
 a.x=Math.cos(angle)*(7+a.lane);a.z=Math.sin(angle)*(7+a.lane);
 if(a.progress>=Math.PI*28)a.finishAt=t;
 continue;
 }
 if(m.game!=='lighthouse'){
 const moving=Math.hypot(input.x,input.z)>.1;
 if(moving){const len=Math.hypot(input.x,input.z);a.dx=input.x/len;a.dz=input.z/len;}
 const dash=(m.game==='photo'||m.game==='robot')&&t-a.actionAt<.3;
 a.x+=(dash?a.dx*10:input.x*4)*dt;a.z+=(dash?a.dz*10:input.z*4)*dt;
 if(m.game==='color'){a.x=clamp(a.x,-4.85,4.85);a.z=clamp(a.z,-4.85,4.85);}
 else {const r=Math.hypot(a.x,a.z);if(r>4.7){a.x*=4.7/r;a.z*=4.7/r;}}
 }
 if(m.game==='color'&&m.collapsed&&tileColor(a.x,a.z)!==m.safe&&jumpHeight(a,t)<.25){a.hp=0;a.outAt=t;}
 if(m.game==='lighthouse'){
 const diff=Math.abs(Math.atan2(Math.sin(m.angle-Math.atan2(a.z,a.x)),Math.cos(m.angle-Math.atan2(a.z,a.x))));
 if(diff<.14&&jumpHeight(a,t)<.6)damage(m,a);
 }
 }
 if(m.game==='photo'||m.game==='robot'){
 for(let i=0;i<m.actors.length;i++)for(let j=i+1;j<m.actors.length;j++){
 const a=m.actors[i],b=m.actors[j];if(a.outAt!==null||b.outAt!==null)continue;
 let dx=b.x-a.x,dz=b.z-a.z;const d=Math.hypot(dx,dz);if(d>=.85)continue;
 if(d<.001){dx=1;dz=0;}else{dx/=d;dz/=d;}
 const ad=t-a.actionAt<.3,bd=t-b.actionAt<.3;
 if(m.game==='robot'){
 if(ad&&a.dx*dx+a.dz*dz>.2&&damage(m,b))a.points++;
 if(bd&&b.dx*-dx+b.dz*-dz>.2&&damage(m,a))b.points++;
 }
 const push=(.85-d)/2;
 a.x-=dx*push;a.z-=dz*push;b.x+=dx*push;b.z+=dz*push;
 }
 }
 if(m.game==='meteor'){
 if(t>=m.nextHazard){
 const target=m.actors[Math.floor(random()*m.actors.length)];
 m.hazards.push({id:Math.round(t*1000),x:clamp(target.x+(random()-.5)*3,-4,4),z:clamp(target.z+(random()-.5)*3,-4,4),at:t+1.6,resolved:false});
 m.nextHazard=t+Math.max(.45,1.3-t*.013);
 }
 for(const h of m.hazards)if(!h.resolved&&t>=h.at){h.resolved=true;for(const a of m.actors)if(Math.hypot(a.x-h.x,a.z-h.z)<1.25)damage(m,a);}
 m.hazards=m.hazards.filter(h=>t<h.at+.6);
 }
 if(m.game==='photo'&&Math.floor(t/10)>m.photo){m.photo=Math.floor(t/10);m.flashUntil=t+.5;for(const a of m.actors)a.points+=Math.max(0,Math.round(100*(1-Math.hypot(a.x,a.z)/5)));}
 if(t>=m.duration)m.done=true;
}
export function results(m:MiniState,multiplier=1):MiniResult[]{
 const value=(a:Actor)=>m.game==='photo'?a.points:m.game==='robot'?a.hp*1000+a.points:m.game==='kart'?(a.finishAt!==null?10000-a.finishAt:a.progress):a.hp*1000+(a.outAt??m.duration);
 const sorted=[...m.actors].sort((a,b)=>value(b)-value(a));
 return sorted.map((a,i)=>{
 const rank=sorted.findIndex(b=>value(b)===value(a))+1;
 const normalized=sorted.length===1?0:Math.round((rank-1)*3/(sorted.length-1));
 return {id:a.id,rank,value:value(a),coins:[20,15,10,5][normalized],score:Math.round([100,70,50,30][normalized]*multiplier)};
 });
}

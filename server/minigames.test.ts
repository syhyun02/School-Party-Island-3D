import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMini,stepMini,setInput,action,results} from './minigames.js';
import {gameIds,tileColor} from '../shared/minigames.js';
const advance=(m:ReturnType<typeof createMini>,seconds:number)=>{for(let i=0;i<Math.ceil(seconds/.05);i++)stepMini(m,.05,()=>.1);};
test('all six games end at 60 seconds and produce results for all four players',()=>{
 for(const game of gameIds){const m=createMini(game,['a','b','c','d']);advance(m,60.1);assert.equal(m.done,true,game);assert.equal(results(m).length,4);const t=m.elapsed;stepMini(m,.1);assert.equal(m.elapsed,t);}
});
test('server rejects invalid input, normalizes diagonals, expires stale input',()=>{
 const m=createMini('photo',['a']),a=m.actors[0];a.x=0;a.z=0;
 setInput(m,'a',{x:Infinity,z:1});assert.deepEqual(a.input,{x:0,z:0});
 setInput(m,'a',{x:999,z:999});assert.ok(Math.hypot(a.input.x,a.input.z)<=1.00001);
 advance(m,.2);assert.ok(Math.hypot(a.x,a.z)<=.81);
 advance(m,.5);const x=a.x;advance(m,.3);assert.equal(a.x,x);
});
test('unsafe color falls while safe color survives; jump only delays falling',()=>{
 const m=createMini('color',['a','b','c'],()=>0);m.safe=tileColor(0,0);m.elapsed=5.95;
 Object.assign(m.actors[0],{x:0,z:0});Object.assign(m.actors[1],{x:2,z:0});Object.assign(m.actors[2],{x:2,z:0,jumpAt:5.7});
 stepMini(m,.1);assert.equal(m.actors[0].outAt,null);assert.notEqual(m.actors[1].outAt,null);assert.equal(m.actors[2].outAt,null);
 advance(m,.6);assert.notEqual(m.actors[2].outAt,null);
});
test('meteor warns before impact, hits once and kills after three separated hits',()=>{
 const m=createMini('meteor',['a']),a=m.actors[0];m.nextHazard=100;
 for(let i=0;i<3;i++){m.hazards.push({id:i,x:a.x,z:a.z,at:m.elapsed+.2,resolved:false});advance(m,.1);assert.equal(a.hp,3-i);advance(m,.15);assert.equal(a.hp,2-i);advance(m,1);}
 assert.notEqual(a.outAt,null);
});
test('kart needs two laps, rewards pickup, braking/offroad slow down, boosts are finite',()=>{
 const m=createMini('kart',['a']),a=m.actors[0];a.lane=0;action(m,'a');assert.equal(a.boosts,0);action(m,'a');assert.equal(a.boosts,0);
 advance(m,9);assert.ok(a.progress>Math.PI*14);assert.equal(a.finishAt,null);assert.ok(a.boosts>0);
 advance(m,10);assert.notEqual(a.finishAt,null);assert.ok(a.progress>=Math.PI*28);
 const slow=createMini('kart',['a']),normal=createMini('kart',['a']);slow.actors[0].lane=2.5;normal.actors[0].lane=0;
 advance(slow,10);advance(normal,10);assert.ok(slow.actors[0].progress<normal.actors[0].progress/2);
 const brake=createMini('kart',['a']);for(let i=0;i<100;i++){setInput(brake,'a',{x:0,z:1});stepMini(brake,.05);}assert.ok(brake.actors[0].speed<3.1);
});
test('photo awards closer player more at capture and respects dash cooldown',()=>{
 const m=createMini('photo',['a','b']);m.actors[0].x=0;m.actors[0].z=0;m.actors[1].x=4;m.actors[1].z=0;
 m.elapsed=9.95;stepMini(m,.1);assert.equal(m.actors[0].points,100);assert.equal(m.actors[1].points,20);assert.equal(m.photo,1);
 action(m,'a');const t=m.actors[0].actionAt;advance(m,.2);action(m,'a');assert.equal(m.actors[0].actionAt,t);
});
test('robot dash damages opponent once during immunity, ordinary contact does not',()=>{
 const m=createMini('robot',['a','b']);const [a,b]=m.actors;Object.assign(a,{x:0,z:0,dx:1,dz:0});Object.assign(b,{x:.8,z:0});
 stepMini(m,.05);assert.equal(b.hp,3);
 action(m,'a');stepMini(m,.05);assert.equal(b.hp,2);assert.equal(a.points,1);
 b.x=a.x+.5;b.z=a.z;stepMini(m,.05);assert.equal(b.hp,2);
});
test('shared ties and 3-player normalized ranking; round five multiplies points',()=>{
 const m=createMini('photo',['a','b','c']);m.actors[0].points=100;m.actors[1].points=50;m.actors[2].points=10;
 assert.deepEqual(results(m).map(r=>r.score),[100,50,30]);assert.equal(results(m,1.5)[0].score,150);
 m.actors[1].points=100;assert.deepEqual(results(m).map(r=>r.rank),[1,1,3]);
});
test('lighthouse jumping avoids collision and cooldown prevents repeated jumps',()=>{
 const m=createMini('lighthouse',['a']),a=m.actors[0];m.elapsed=1;action(m,'a');advance(m,.2);const t=a.jumpAt;action(m,'a');assert.equal(a.jumpAt,t);
 const angle=(m.elapsed+.05)*1.5+(m.elapsed+.05)**2*.018;a.x=Math.cos(angle)*3.4;a.z=Math.sin(angle)*3.4;stepMini(m,.05);assert.equal(a.hp,3);
});

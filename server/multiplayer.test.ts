import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io,type Socket} from 'socket.io-client';
test('four sockets: authoritative game input, host guard, rejoin and token protection',{timeout:15000},async()=>{
 const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:'3109'},stdio:'pipe'});
 const sockets:Socket[]=[];let output='';child.stderr.on('data',d=>output+=d);
 try{
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:3109/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}
 assert.ok(ready,output);
 const states:any[]=[];const tokens:string[]=[];
 for(let i=0;i<4;i++){const s=io('http://127.0.0.1:3109',{transports:['websocket']});sockets.push(s);s.on('state',r=>states[i]=r);const ack:any=await new Promise(resolve=>s.on('connect',()=>s.emit('join',{name:'user'+i,classId:i+1,avatar:3-i},resolve)));tokens.push(ack.token);}
 await new Promise(r=>setTimeout(r,150));assert.equal(states[0].players.length,4);
 assert.deepEqual(states[0].players.map((p:any)=>p.avatar),[3,2,1,0]);
 const rejected:any=await new Promise(r=>sockets[1].emit('avatar',99,r));assert.ok(rejected.error);
 const changed:any=await new Promise(r=>sockets[1].emit('avatar',1,r));assert.equal(changed.ok,true);
 await new Promise(r=>setTimeout(r,100));assert.equal(states[0].players[1].avatar,1);
 sockets[1].emit('start','photo');await new Promise(r=>setTimeout(r,150));assert.equal(states[0].phase,'lobby');
 sockets[0].emit('start','photo');await new Promise(r=>setTimeout(r,150));assert.equal(states[0].mini.game,'photo');assert.equal(states[0].phase,'miniReady');
 assert.deepEqual(states[0].mini.actors.map((a:any)=>a.avatar),[3,1,1,0]);
 const before=states[0].mini.actors[0].x;sockets[0].emit('input',{x:-1,z:0});sockets[0].emit('action');await new Promise(r=>setTimeout(r,100));assert.equal(states[0].mini.elapsed,0);assert.equal(states[0].mini.actors[0].x,before);
 const locked:any=await new Promise(r=>sockets[0].emit('avatar',0,r));assert.ok(locked.error);
 await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('countdown did not finish')),4500);const listener=(r:any)=>{if(r.phase==='mini'){clearTimeout(timer);sockets[0].off('state',listener);resolve();}};sockets[0].on('state',listener);});
 const x=states[0].mini.actors[0].x;sockets[0].emit('input',{x:-1,z:0,points:999999});sockets[0].emit('action');await new Promise(r=>setTimeout(r,200));assert.ok(states[0].mini.actors[0].x<x);assert.equal(states[0].mini.actors[0].points,0);
 sockets[0].emit('start','kart');await new Promise(r=>setTimeout(r,100));assert.equal(states[0].mini.game,'photo');
 const extra=io('http://127.0.0.1:3109');sockets.push(extra);await new Promise<void>(r=>extra.on('connect',r));
 const denied:any=await new Promise(r=>extra.emit('join',{name:'duplicate',classId:1,token:tokens[1]},r));assert.ok(denied.error);
 sockets[1].disconnect();await new Promise(r=>setTimeout(r,100));
 const restored:any=await new Promise(r=>extra.emit('join',{name:'rejoin',classId:1,token:tokens[1],avatar:0},r));assert.equal(restored.token,tokens[1]);
 await new Promise(r=>setTimeout(r,100));assert.equal(states[0].players.length,4);assert.equal(states[0].mini.actors.length,4);assert.equal(states[0].players[1].avatar,1);assert.equal(states[0].mini.actors[1].avatar,1);
 }finally{sockets.forEach(s=>s.disconnect());child.kill();await new Promise<void>(r=>child.once('exit',()=>r()));}
});

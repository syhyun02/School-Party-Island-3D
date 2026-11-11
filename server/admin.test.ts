import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {io,type Socket} from 'socket.io-client';
import {questions} from './quiz.js';
const sleep=(n:number)=>new Promise(r=>setTimeout(r,n));
test('authenticated teacher controls, CSRF, private quiz scoring and session invalidation',{timeout:25000},async()=>{
 const password=randomBytes(24).toString('hex'),port=3110,base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:String(port),ADMIN_PASSWORD:password},stdio:'pipe'});const sockets:Socket[]=[];
 try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break;}}catch{}await sleep(40);}assert.ok(ready);
 assert.equal((await fetch(base+'/api/admin/status')).status,401);
 assert.equal((await fetch(base+'/api/admin/results.csv')).status,401);
 assert.equal((await fetch(base+'/api/admin/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:'start'})})).status,401);
 const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
 assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];assert.match(login.headers.get('set-cookie')!,/HttpOnly/);assert.match(login.headers.get('set-cookie')!,/SameSite=Strict/);const {csrf}=await login.json() as any;
 const headers={'Content-Type':'application/json',Cookie:cookie,'x-csrf-token':csrf};
 const control=(command:string)=>fetch(base+'/api/admin/control',{method:'POST',headers,body:JSON.stringify({command})});
 assert.equal((await fetch(base+'/api/admin/control',{method:'POST',headers:{...headers,'x-csrf-token':'wrong'},body:'{"command":"start"}'})).status,403);
 assert.equal((await fetch(base+'/api/admin/control',{method:'POST',headers:{...headers,Origin:'https://attacker.invalid'},body:'{"command":"start"}'})).status,403);
 const s=io(base);sockets.push(s);let state:any,quiz:any;s.on('state',v=>state=v);s.on('quiz',v=>quiz=v);
 const identity:any=await new Promise(r=>s.on('connect',()=>s.emit('join',{name:'검증학생',classId:1},r)));
 assert.notEqual(identity.id,identity.token);await sleep(100);assert.ok(!JSON.stringify(state).includes(identity.token));
 s.emit('start');await sleep(100);assert.equal(state.phase,'lobby');
 s.emit('quiz:practice');await sleep(100);assert.ok(quiz);assert.equal(quiz.answer,undefined);
 const beforePause=quiz.expires;
 await control('pause');await sleep(80);
 const blocked:any=await new Promise(r=>s.emit('quiz:answer',{nonce:quiz.nonce,choice:0},r));assert.ok(blocked.error);
 await control('resume');await sleep(80);assert.ok(quiz.expires>beforePause);
 const q=questions.find(q=>q.question===quiz.question)!;
 const practice:any=await new Promise(r=>s.emit('quiz:answer',{nonce:quiz.nonce,choice:q.answer},r));assert.equal(practice.points,0);
 await control('start');await sleep(100);assert.equal(state.phase,'board');
 await control('pause');const frozen=state.now;await sleep(150);s.emit('roll');await sleep(150);assert.equal(state.players[0].dice,0);
 assert.equal((await control('resume')).status,200);
 // Exercise actual quiz-tile scoring without a test-only server mutation API.
 let scored=false;
 for(let attempt=0;attempt<45&&!scored;attempt++){
 quiz=undefined;s.emit('roll');await sleep(120);const move=state.players[0].lastMove;assert.ok(move);assert.equal(move.to,state.players[0].position);assert.equal(move.dice,state.players[0].dice);s.emit('roll');await sleep(70);assert.equal(state.players[0].lastMove.id,move.id);
 if(quiz){assert.ok(quiz.opens>Date.now());const early:any=await new Promise(r=>s.emit('quiz:answer',{nonce:quiz.nonce,choice:0},r));assert.ok(early.error);await sleep(Math.max(0,quiz.opens-Date.now()+20));const answer=questions.find(q=>q.question===quiz.question)!.answer;
 const result:any=await new Promise(r=>s.emit('quiz:answer',{nonce:quiz.nonce,choice:answer},r));assert.equal(result.points,10);
 const duplicate:any=await new Promise(r=>s.emit('quiz:answer',{nonce:quiz.nonce,choice:answer},r));assert.ok(duplicate.error);await sleep(100);assert.equal(state.players[0].quizScore,10);scored=true;
 }else{await control('end');await control('reset');await control('start');await sleep(30);}
 }
 assert.ok(scored,'expected one quiz landing across 45 random rolls');
 const report=await fetch(base+'/api/admin/status',{headers});const stats:any=await report.json();assert.equal(stats.connected,1);assert.equal(stats.rooms[0].players[0].quizScore,10);
 const csv=await fetch(base+'/api/admin/results.csv',{headers});assert.equal(csv.status,200);assert.match(await csv.text(),/검증학생/);
 await control('end');await sleep(100);assert.equal(state.phase,'results');
 const logout=await fetch(base+'/api/admin/logout',{method:'POST',headers});assert.equal(logout.status,200);assert.equal((await fetch(base+'/api/admin/status',{headers})).status,401);
 for(let i=0;i<5;i++)assert.equal((await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"password":"incorrect"}'})).status,401);
 assert.equal((await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"password":"incorrect"}'})).status,429);
 }finally{sockets.forEach(s=>s.disconnect());child.kill();await new Promise<void>(r=>child.once('exit',()=>r()));}
});

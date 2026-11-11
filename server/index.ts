import express from 'express';
import {createServer} from 'node:http';
import {randomInt,randomUUID} from 'node:crypto';
import {Server} from 'socket.io';
import {resolve} from 'node:path';
import {installAuth} from './auth.js';
import {makeQuiz,publicQuiz,answerQuiz,type Quiz} from './quiz.js';
import {validAvatar,moveDuration,type MoveEvent} from '../shared/presentation.js';
import {land,tiles} from './game.js';
import {createMini,stepMini,setInput,action,results} from './minigames.js';
import {gameIds,gameNames,type GameId,type MiniState,type MiniResult} from '../shared/minigames.js';
const app=express(),http=createServer(app),io=new Server(http,{maxHttpBufferSize:16384});
app.use(express.json({limit:'8kb'}));
const protect=installAuth(app);
app.use(express.static('dist'));
app.get('/admin',(_,res)=>res.sendFile(resolve('dist/index.html')));
app.get('/health',(_,r)=>r.json({ok:true}));
type Player={id:string;name:string;avatar:number;lastMove?:MoveEvent;classId:number;position:number;coins:number;stars:number;score:number;quizScore:number;dice:number;connected:boolean};
type Room={id:string;players:Player[];phase:string;round:number;until:number;message:string;started:number;mini?:MiniState;results?:MiniResult[];practice:boolean;queue:GameId[]};
const rooms:Room[]=[];
let pausedAt:number|null=null;
const teacherManaged=!!process.env.ADMIN_PASSWORD;
const quizzes=new Map<string,Quiz>();
const socketsByPlayer=new Map<string,string>();
const sessions=new Map<string,{room:Room;p:Player}>();
function emit(r:Room){io.to(r.id).emit('state',{...r,now:pausedAt??Date.now(),tiles,paused:pausedAt!==null,teacherManaged});}
function deliverQuiz(p:Player,practice=false,delay=0){const q=makeQuiz(Date.now(),practice,delay);quizzes.set(p.id,q);const socketId=socketsByPlayer.get(p.id);if(socketId)io.to(socketId).emit('quiz',publicQuiz(q));}
function roll(r:Room,p:Player){const from=p.position,coins=p.coins,stars=p.stars;p.dice=randomInt(1,7);const type=land(p,p.dice);p.lastMove={id:randomUUID(),at:Date.now(),from,to:p.position,dice:p.dice,tile:type,coins:p.coins-coins,stars:p.stars-stars};if(type==='quiz')deliverQuiz(p,false,moveDuration(p.lastMove));r.message=p.name+' : '+p.dice+'칸 이동';}
function startParty(r:Room){r.practice=false;r.round=1;r.queue=[...gameIds];for(let i=5;i>0;i--){const j=randomInt(i+1);[r.queue[i],r.queue[j]]=[r.queue[j],r.queue[i]];}for(const p of r.players){p.coins=10;p.stars=0;p.score=0;p.quizScore=0;p.position=0;quizzes.delete(p.id);}board(r);}
function contribution(p:Player){return p.score+p.quizScore+p.stars*30+Math.min(p.coins,50);}
app.get('/api/admin/status',protect,(_,res)=>{
 const players=rooms.flatMap(r=>r.players);
 res.json({paused:pausedAt!==null,connected:players.filter(p=>p.connected).length,rooms:rooms.map(r=>({id:r.id,phase:r.phase,round:r.round,players:r.players.map(p=>({...p,total:contribution(p)}))})),
 classes:Array.from({length:8},(_,i)=>{const members=players.filter(p=>p.classId===i+1);return {classId:i+1,count:members.length,connected:members.filter(p=>p.connected).length,average:members.length?members.reduce((sum,p)=>sum+contribution(p),0)/members.length:0};})});
});
app.post('/api/admin/control',protect,(req,res)=>{
 const command=req.body?.command;
 if(!['start','pause','resume','end','reset'].includes(command))return void res.status(400).json({error:'알 수 없는 명령입니다.'});
 const now=Date.now();
 if(command==='pause'&&pausedAt===null)pausedAt=now;
 if(command==='resume'&&pausedAt!==null){const shift=now-pausedAt;for(const r of rooms){r.until+=shift;for(const p of r.players)if(p.lastMove)p.lastMove.at+=shift;}for(const q of quizzes.values())if(!q.answered){q.expires+=shift;q.opens+=shift;}pausedAt=null;for(const r of rooms)for(const p of r.players){const q=quizzes.get(p.id),sid=socketsByPlayer.get(p.id);if(q&&!q.answered&&sid)io.to(sid).emit('quiz',publicQuiz(q));}}
 if(command==='start'){if(pausedAt!==null)return void res.status(409).json({error:'일시정지를 먼저 해제해 주세요.'});for(const r of rooms)if(r.phase==='lobby'&&r.players.some(p=>p.connected))startParty(r);}
 if(command==='reset'){for(const r of rooms)if(r.phase==='results'){r.phase='lobby';r.message='새 모험을 기다리고 있어요';r.results=undefined;r.mini=undefined;}}
 if(command==='end'){pausedAt=null;quizzes.clear();for(const r of rooms){r.phase='results';r.message='교사가 경기를 종료했습니다.';r.mini=undefined;}}
 rooms.forEach(emit);res.json({ok:true});
});
app.get('/api/admin/results.csv',protect,(_,res)=>{
 const cell=(v:unknown)=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 const rows=[['학급','닉네임','미니게임','퀴즈','별','코인','기여점수'],...rooms.flatMap(r=>r.players.map(p=>[p.classId,p.name,p.score,p.quizScore,p.stars,p.coins,contribution(p)]))];
 res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="island-results.csv"');res.send('﻿'+rows.map(row=>row.map(cell).join(',')).join('\r\n'));
});
function board(r:Room){r.phase='board';r.mini=undefined;r.until=Date.now()+45000;r.message='모두 주사위를 굴려 주세요!';r.players.forEach(p=>{p.dice=0;p.lastMove=undefined;});}
function mini(r:Room,game:GameId){r.phase='miniReady';r.started=Date.now();r.until=r.started+3000;r.mini=createMini(game,r.players.map(p=>p.id),undefined,r.players.map(p=>p.avatar));r.message=gameNames[game];r.results=undefined;}
io.on('connection',s=>{
 let session:{room:Room;p:Player}|undefined;
 let participantToken='';
 s.on('join',(data,ack)=>{
 const reply=typeof ack==='function'?ack:()=>{};
 if(session)return reply({token:participantToken,id:session.p.id});
 if(!data||typeof data.name!=='string'||!Number.isInteger(data.classId)||data.classId<1||data.classId>8)return reply({error:'닉네임과 학급을 확인해 주세요.'});
 if(data.avatar!==undefined&&!validAvatar(data.avatar))return reply({error:'캐릭터 선택을 확인해 주세요.'});
 const old=typeof data.token==='string'?sessions.get(data.token):undefined;
 if(old){if(old.p.connected)return reply({error:'이미 접속 중인 참가자입니다.'});session=old;participantToken=data.token;}
 else{
 let room=rooms.find(r=>r.phase==='lobby'&&r.players.length<4&&!r.players.some(p=>p.classId===data.classId))??rooms.find(r=>r.phase==='lobby'&&r.players.length<4);
 if(!room){room={id:randomUUID().slice(0,6),players:[],phase:'lobby',round:1,until:0,message:'친구들을 기다리는 중',started:0,practice:false,queue:[]};rooms.push(room);}
 const p:Player={id:randomUUID(),name:data.name.trim().slice(0,12)||'탐험가',avatar:data.avatar??room.players.length%4,classId:data.classId,position:0,coins:10,stars:0,score:0,quizScore:0,dice:0,connected:true};
 room.players.push(p);session={room,p};participantToken=randomUUID();sessions.set(participantToken,session);
 }
 session.p.connected=true;socketsByPlayer.set(session.p.id,s.id);s.join(session.room.id);reply({token:participantToken,id:session.p.id});emit(session.room);const q=quizzes.get(session.p.id);if(q&&!q.answered&&q.expires>(pausedAt??Date.now()))s.emit('quiz',publicQuiz(q));
 });
 s.on('avatar',(avatar,ack)=>{const reply=typeof ack==='function'?ack:()=>{};if(!session||session.room.phase!=='lobby'||pausedAt!==null||!validAvatar(avatar))return reply({error:'대기실에서만 캐릭터를 선택할 수 있습니다.'});session.p.avatar=avatar;reply({ok:true});emit(session.room);});
 const host=()=>session&&session.room.players.find(p=>p.connected)===session.p;
 s.on('start',(game:unknown)=>{
 if(pausedAt!==null||!session||!host()||session.room.phase!=='lobby')return;
 const r=session.room;
 if(typeof game==='string'&&gameIds.includes(game as GameId)){r.practice=true;mini(r,game as GameId);}
 else if((game===undefined||game===null)&&!teacherManaged){startParty(r);}
 emit(r);
 });
 s.on('lobby',()=>{if(pausedAt===null&&session&&host()&&(!teacherManaged||session.room.practice)&&['miniResults','results'].includes(session.room.phase)){const r=session.room;r.phase='lobby';r.mini=undefined;r.results=undefined;r.message='다음 게임을 골라 주세요';emit(r);}});
 s.on('roll',()=>{if(pausedAt!==null||!session)return;const {room:r,p}=session;if(r.phase!=='board'||p.dice||Date.now()>r.until-20000)return;roll(r,p);emit(r);});
 s.on('quiz:practice',()=>{if(pausedAt!==null||!session||session.room.phase!=='lobby')return;const q=quizzes.get(session.p.id);if(q&&!q.answered&&q.expires>Date.now())return;deliverQuiz(session.p,true);});
 s.on('quiz:answer',(data,ack)=>{if(typeof ack!=='function')return;if(pausedAt!==null||!session)return ack({error:'지금은 답변할 수 없습니다.'});const q=quizzes.get(session.p.id);
 if(!q||!['board','lobby'].includes(session.room.phase))return ack({error:'진행 중인 문제가 없습니다.'});
 const result=answerQuiz(q,data?.nonce,data?.choice,Date.now());if(!result)return ack({error:'답변 시간이 지났거나 이미 제출한 문제입니다.'});
 session.p.quizScore+=result.points;ack(result);emit(session.room);
 });
 s.on('input',(input)=>{if(pausedAt===null&&session?.room.phase==='mini'&&session.room.mini)setInput(session.room.mini,session.p.id,input);});
 const act=()=>{if(pausedAt===null&&session?.room.phase==='mini'&&session.room.mini)action(session.room.mini,session.p.id);};
 s.on('action',act);s.on('jump',act);
 s.on('disconnect',()=>{if(session){session.p.connected=false;socketsByPlayer.delete(session.p.id);if(session.room.mini)setInput(session.room.mini,session.p.id,{x:0,z:0});emit(session.room);}});
});
let last=Date.now(),tick=0;
setInterval(()=>{const now=Date.now(),dt=Math.min(.1,(now-last)/1000);last=now;tick++;
 if(pausedAt!==null)return;
 for(const r of rooms){
 if(r.phase==='board'&&now>=r.until-20000){for(const p of r.players)if(!p.dice)roll(r,p);}
 if(r.phase==='board'&&now>=r.until){const waiting=r.players.map(p=>quizzes.get(p.id)).filter(q=>q&&!q.answered&&q.expires>now);if(waiting.length)r.until=Math.max(...waiting.map(q=>q!.expires));else{for(const p of r.players)quizzes.delete(p.id);mini(r,r.queue[r.round-1]);}}
 if(r.phase==='miniReady'&&now>=r.until){r.phase='mini';r.started=now;r.until=now+60000;}
 if(r.phase==='mini'&&r.mini){
 stepMini(r.mini,dt);
 // Simulation uses elapsed time, so a stalled server never skips collision checks.
 r.until=now+(r.mini.duration-r.mini.elapsed)*1000;
 if(r.mini.done){
 r.results=results(r.mini,r.round===5&&!r.practice?1.5:1);
 if(!r.practice)for(const result of r.results){const p=r.players.find(p=>p.id===result.id)!;p.coins+=result.coins;p.score+=result.score;}
 r.phase='miniResults';r.until=now+10000;r.message=r.practice?'연습 결과 · 코인과 학급 점수는 누적하지 않습니다':'미니게임 결과';
 }
 }
 if(r.phase==='miniResults'&&!r.practice&&now>=r.until){if(r.round===5){r.phase='results';r.message='섬 탐험 완료!';}else{r.round++;board(r);}}
 if(tick%2===0&&r.players.some(p=>p.connected))emit(r);
 }
},50);
http.listen(Number(process.env.PORT)||3001,'0.0.0.0');

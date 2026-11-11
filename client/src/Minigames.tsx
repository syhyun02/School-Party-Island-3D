import {memo,useEffect,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {Socket} from 'socket.io-client';
import {gameNames,instructions,palette,colorNames,jumpHeight,tileColor,barAngle,type MiniState,type Actor,type Hazard} from '../../shared/minigames';
import {Character,ArenaDecor,Block} from './World';
import {Kart,RobotChassis,RaceDecor} from './Vehicles';
import {StaticBatch} from './StaticBatch';
import {control,currentInput} from './controls';
const colors=['#ffb338','#a59bff','#64d6bc','#ff839f'];
function Box({position,size,color}:{position:[number,number,number];size:[number,number,number];color:string}){
 return <Block at={position} size={size} color={color} radius={.08}/>;
}
type Time={current:number};
// Server snapshots arrive ~20 times a second; everything below animates every frame between them.
const cooldowns:Record<string,number>={kart:3,photo:1.6,robot:1.6};
function Racer({a,index,game,elapsed,time,self,running}:{a:Actor;index:number;game:string;elapsed:number;time:Time;self:boolean;running:boolean}){
 const ref=useRef<THREE.Group>(null!),speed=useRef(a.speed);speed.current=a.speed;
 const track=useRef({seen:a,fromX:a.x,fromZ:a.z,fromRot:0,at:0,last:0,span:50});
 // Own character: simulated locally from live input so it responds on the very next frame, then eased back to the server's verdict.
 const mine=useRef({x:a.x,z:a.z,dx:a.dx,dz:a.dz,lane:a.lane,actionAt:-10,jumpAt:-10,actions:control.actions,idle:0});
 const lap=useRef(a.progress),lane=useRef(a.lane);
 const [localWalk,setLocalWalk]=useState(false);
 const active=self&&a.outAt===null&&a.finishAt===null;
 useFrame((_,dt)=>{
 const now=performance.now(),t=track.current,g=ref.current,p=mine.current,clock=time.current;
 dt=Math.min(dt,.1);
 if(game==='kart'){
 // Progress only ever moves forward at a known speed, so advance it locally and nudge it toward where the server should be by now.
 if(t.seen!==a){t.seen=a;t.at=now;}
 const live=running&&a.finishAt===null,ahead=lap.current+(live?a.speed*dt:0),target=a.progress+(live?a.speed*Math.min(.25,(now-t.at)/1000):0);
 lap.current=Math.abs(target-ahead)>3?target:ahead+(target-ahead)*Math.min(1,dt*4);
 if(active){
 const input=running?currentInput():{x:0,z:0};
 p.lane=THREE.MathUtils.clamp(p.lane+input.x*dt*3,-2.6,2.6);
 p.idle=input.x?0:p.idle+dt;
 const gap=a.lane-p.lane,allow=p.idle>.5?0:.6;
 if(Math.abs(gap)>allow)p.lane+=Math.sign(gap)*(Math.abs(gap)-allow)*Math.min(1,dt*8);
 lane.current=p.lane;
 }else lane.current+=(a.lane-lane.current)*Math.min(1,dt*12);
 const angle=lap.current/7;
 g.position.set(Math.cos(angle)*(7+lane.current),0,Math.sin(angle)*(7+lane.current));g.rotation.y=-angle;
 return;
 }
 if(active){
 const input=running?currentInput():{x:0,z:0};
 if(p.actions!==control.actions){
 p.actions=control.actions;
 if(running&&game!=='meteor'&&clock-Math.max(a.actionAt,p.actionAt)>=(cooldowns[game]??1)){p.actionAt=clock;if(game==='color'||game==='lighthouse')p.jumpAt=clock;}
 }
 const moving=Math.hypot(input.x,input.z)>.1;
 if(moving!==localWalk)setLocalWalk(moving);
 if(game==='lighthouse'){p.x=a.x;p.z=a.z;}
 else{
 if(moving){const len=Math.hypot(input.x,input.z);p.dx=input.x/len;p.dz=input.z/len;}
 const dash=(game==='photo'||game==='robot')&&clock-Math.max(a.actionAt,p.actionAt)<.3;
 p.x+=(dash?p.dx*10:input.x*4)*dt;p.z+=(dash?p.dz*10:input.z*4)*dt;
 if(game==='color'){p.x=THREE.MathUtils.clamp(p.x,-4.85,4.85);p.z=THREE.MathUtils.clamp(p.z,-4.85,4.85);}
 else{const r=Math.hypot(p.x,p.z);if(r>4.7){p.x*=4.7/r;p.z*=4.7/r;}}
 // The server trails the local position by the network delay; tolerate that lead, correct anything beyond it (pushes, hits).
 p.idle=moving||dash?0:p.idle+dt;
 const gx=a.x-p.x,gz=a.z-p.z,gap=Math.hypot(gx,gz),allow=p.idle>.5?0:1;
 if(gap>3){p.x=a.x;p.z=a.z;}
 else if(gap>allow){const pull=(gap-allow)/gap*Math.min(1,dt*8);p.x+=gx*pull;p.z+=gz*pull;}
 }
 const jumpAt=clock-p.jumpAt<.8?p.jumpAt:a.jumpAt;
 g.position.set(p.x,jumpHeight({...a,jumpAt},clock),p.z);
 g.rotation.y=Math.atan2(p.dx,p.dz);
 t.seen=a;t.fromX=p.x;t.fromZ=p.z;t.fromRot=g.rotation.y;t.at=t.last=now;
 return;
 }
 if(t.seen!==a){t.seen=a;t.fromX=g.position.x;t.fromZ=g.position.z;t.fromRot=g.rotation.y;t.span=Math.max(40,Math.min(200,now-t.last));t.last=t.at=now;}
 const far=Math.hypot(a.x-t.fromX,a.z-t.fromZ)>4,k=far?1:Math.min(1,(now-t.at)/t.span);
 const rot=Math.atan2(a.dx,a.dz),turn=Math.atan2(Math.sin(rot-t.fromRot),Math.cos(rot-t.fromRot));
 const y=a.outAt!==null?THREE.MathUtils.lerp(g.position.y,-1.7,Math.min(1,dt*15)):jumpHeight(a,clock);
 g.position.set(t.fromX+(a.x-t.fromX)*k,y,t.fromZ+(a.z-t.fromZ)*k);
 g.rotation.y=t.fromRot+turn*k;
 });
 const robot=game==='robot',kart=game==='kart';
 return <group ref={ref} position={[a.x,0,a.z]}><mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,0]}><ringGeometry args={[.5,.58,24]}/><meshBasicMaterial color={colors[index]}/></mesh>
 {kart&&<Kart index={a.avatar} speed={speed} boosting={elapsed-a.actionAt<1.2}/>}
 {robot&&<RobotChassis index={a.avatar} dashing={elapsed-a.actionAt<.3}/>}
 <group position={[0,kart?.4:0,0]} scale={.85}><Character index={a.avatar} robot={robot} walking={active?localWalk:Math.hypot(a.input.x,a.input.z)>.1}/></group>
 {robot&&Array.from({length:a.hp},(_,i)=><group key={i} position={[(i-1)*.35,1.8,0]}><mesh><sphereGeometry args={[.2,8,8]}/><meshStandardMaterial color={colors[a.avatar]}/></mesh><Box position={[0,-.35,0]} size={[.015,.7,.015]} color="#fff"/></group>)}
 {elapsed-a.actionAt<.3&&(game==='photo'||robot)&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.06,0]}><ringGeometry args={[.45,.7,16]}/><meshBasicMaterial color="#fff6a1" side={THREE.DoubleSide}/></mesh>}
 </group>;
}
function Meteor({h,time}:{h:Hazard;time:Time}){
 const rock=useRef<THREE.Mesh>(null!);
 useFrame(()=>{rock.current.position.y=h.resolved?.4:Math.max(.4,(h.at-time.current)*6);});
 return <group position={[h.x,0,h.z]}>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,0]}><ringGeometry args={[1.05,1.25,24]}/><meshBasicMaterial color={h.resolved?'#ffc36d':'#ff536c'} side={THREE.DoubleSide}/></mesh>
 <mesh ref={rock}><icosahedronGeometry args={[h.resolved?.7:.55,0]}/><meshStandardMaterial color="#d78257" emissive="#7b2317"/></mesh>
 </group>;
}
function SpinBar({time}:{time:Time}){
 const bar=useRef<THREE.Group>(null!);
 useFrame(()=>{bar.current.rotation.y=-barAngle(time.current);});
 return <><group ref={bar} position={[0,.6,0]}><Box position={[2.5,0,0]} size={[5,.22,.28]} color="#ff715d"/></group><mesh position={[0,.8,0]}><cylinderGeometry args={[.35,.5,1.6,12]}/><meshStandardMaterial color="#fff0d3"/></mesh></>;
}
const ColorTiles=memo(function ColorTiles({safe,collapsed}:{safe:number;collapsed:boolean}){
 return <>{Array.from({length:25},(_,i)=>{const x=(i%5)*2-4,z=Math.floor(i/5)*2-4,c=tileColor(x,z);return <Box key={i} position={[x,collapsed&&c!==safe?-4:-.2,z]} size={[1.94,.4,1.94]} color={palette[c]}/>;})}</>;
});
// Parts of each arena that never move: merged into one mesh and never re-rendered.
const Arena=memo(function Arena({game,low}:{game:string;low:boolean}){
 const dark=game==='meteor'||game==='robot';
 if(game==='color')return null;
 return <StaticBatch bakeKey={game+low}>
 {game==='kart'?<>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.25,0]}><circleGeometry args={[10.5,64]}/><meshStandardMaterial color="#80bd92"/></mesh>
 <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><ringGeometry args={[5.35,8.65,96]}/><meshStandardMaterial color="#566a73"/></mesh>
 {[5.35,7,8.65].map(r=><mesh key={r} rotation={[-Math.PI/2,0,0]} position={[0,.015,0]}><ringGeometry args={[r-.035,r+.035,96]}/><meshBasicMaterial color="#f8ebc1"/></mesh>)}
 <Box position={[7,.03,0]} size={[3.3,.04,.35]} color="#fff"/>
 {Array.from({length:6},(_,i)=>{const a=(i+1)*14/7;return <mesh key={i} position={[Math.cos(a)*7,.4,Math.sin(a)*7]} rotation={[0,a,Math.PI/4]}><octahedronGeometry args={[.25]}/><meshStandardMaterial color="#b5ff61" emissive="#5e8d20"/></mesh>;})}
 <RaceDecor low={low}/>
 </>:<mesh position={[0,-.25,0]} receiveShadow><cylinderGeometry args={[5.4,5.6,.5,48]}/><meshStandardMaterial color={dark?'#53647e':game==='photo'?'#e9b8c9':'#ead5b6'}/></mesh>}
 {game==='photo'&&<>{[1,2.5,4].map((r,i)=><mesh key={r} rotation={[-Math.PI/2,0,0]} position={[0,.01+i*.01,0]}><ringGeometry args={[r-.06,r,48]}/><meshBasicMaterial color="#fff4d7"/></mesh>)}<group position={[0,1,-5]}><Box position={[0,.5,0]} size={[1,.6,.5]} color="#354f65"/><Box position={[0,-.4,0]} size={[.12,1.5,.12]} color="#536f79"/></group></>}
 {game==='robot'&&Array.from({length:12},(_,i)=><Box key={i} position={[Math.cos(i*Math.PI/6)*5.25,.5,Math.sin(i*Math.PI/6)*5.25]} size={[.35,1,.35]} color="#61d6d0"/>)}
 </StaticBatch>;
});
export function MiniScene({mini:m,low=false,running=false,playerId=''}:{mini:MiniState;low?:boolean;running?:boolean;playerId?:string}){
 const {camera}=useThree();
 useEffect(()=>{camera.position.set(0,m.game==='kart'?22:17,m.game==='kart'?18:13);camera.lookAt(0,0,0);},[camera,m.game]);
 // Local estimate of the server's game clock, eased toward each snapshot so motion never steps backwards.
 const time=useRef(m.elapsed),anchor=useRef({elapsed:m.elapsed,at:performance.now()});
 if(anchor.current.elapsed!==m.elapsed)anchor.current={elapsed:m.elapsed,at:performance.now()};
 useFrame((_,dt)=>{
 const target=anchor.current.elapsed+(running?Math.min(.25,(performance.now()-anchor.current.at)/1000):0),next=time.current+(running?dt:0);
 time.current=Math.abs(target-next)>.3?target:next+(target-next)*.15;
 });
 return <><ArenaDecor game={m.game} low={low}/><Arena game={m.game} low={low}/>
 {m.game==='color'&&<ColorTiles safe={m.safe} collapsed={m.collapsed}/>}
 {m.game==='lighthouse'&&<SpinBar time={time}/>}
 {m.game==='meteor'&&m.hazards.map(h=><Meteor key={h.id} h={h} time={time}/>)}
 {m.game==='photo'&&m.elapsed<m.flashUntil&&<pointLight position={[0,5,0]} intensity={120} color="white"/>}
 {m.actors.map((a,i)=><Racer key={a.id} a={a} index={i} game={m.game} elapsed={m.elapsed} time={time} self={a.id===playerId} running={running}/>)}
 </>;
}
export function MiniControls({mini:m,id,socket}:{mini:MiniState;id:string;socket:Socket}){
 const pad=useRef<HTMLDivElement>(null);
 const [knob,setKnob]=useState({x:0,z:0});
 const a=m.actors.find(p=>p.id===id)!;
 // Changes are sent the moment they happen; the timer only keeps the server's 350ms input expiry alive.
 const send=()=>socket.emit('input',currentInput());
 const act=()=>{control.actions++;socket.emit('action');};
 useEffect(()=>{
 const down=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key)){e.preventDefault();if(e.key===' '){if(!e.repeat)act();}else if(!control.keys.has(e.key)){control.keys.add(e.key);send();}}};
 const up=(e:KeyboardEvent)=>{if(control.keys.delete(e.key))send();};
 const reset=()=>{control.keys.clear();control.stick={x:0,z:0};setKnob({x:0,z:0});send();};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',reset);
 const timer=setInterval(send,50);
 return()=>{clearInterval(timer);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',reset);reset();};
 },[socket,m.game]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/42,z=(e.clientY-r.top-r.height/2)/42,len=Math.max(1,Math.hypot(x,z));control.stick={x:x/len,z:z/len};setKnob(control.stick);send();};
 const reset=()=>{control.stick={x:0,z:0};setKnob(control.stick);send();};
 const actionLabel=m.game==='kart'?'부스터':m.game==='photo'?'대시':m.game==='robot'?'돌진':'점프';
 return <><div className="mini-instructions"><b>{gameNames[m.game]}</b><span>{instructions[m.game]}</span>
 {m.game==='color'&&<strong style={{background:palette[m.safe],color:'#243841'}}>안전: {colorNames[m.safe]} · {m.collapsed?'발판 붕괴!':Math.ceil(6-m.elapsed%7.5)+'초'}</strong>}
 {m.game==='photo'&&<strong>다음 촬영 {Math.ceil(10-m.elapsed%10)}초 · {a.points}점</strong>}
 {m.game==='kart'&&<strong>{a.finishAt!==null?'완주!':Math.min(2,Math.floor(a.progress/(Math.PI*14))+1)+' / 2 바퀴'} · 부스터 {a.boosts}개</strong>}
 {['robot','meteor','lighthouse'].includes(m.game)&&<strong>{'♥'.repeat(a.hp)} {m.game==='robot'?'명중 '+a.points+'회':''}</strong>}
 </div>
 {a.outAt!==null?<div className="eliminated">탈락 · 친구들의 경기를 관전 중</div>:a.finishAt!==null?<div className="eliminated">완주! {a.finishAt.toFixed(2)}초</div>:<>
 {m.game!=='lighthouse'&&<div aria-label="이동 조이스틱" className="joystick" ref={pad} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))move(e);}} onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}><span style={{transform:'translate('+knob.x*36+'px,'+knob.z*36+'px)'}}>✥</span></div>}
 {m.game!=='meteor'&&<button className="primary mini-action" disabled={m.elapsed-a.actionAt<(m.game==='kart'?3:['photo','robot'].includes(m.game)?1.6:1)||(m.game==='kart'&&a.boosts===0)} onPointerDown={act}>{actionLabel}<small>SPACE</small></button>}
 </>}</>;
}

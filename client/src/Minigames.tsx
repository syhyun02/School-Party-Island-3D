import {memo,useEffect,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {Socket} from 'socket.io-client';
import {gameNames,instructions,palette,colorNames,jumpHeight,tileColor,barAngle,type MiniState,type Actor,type Hazard} from '../../shared/minigames';
import {Character,ArenaDecor,Block} from './World';
import {Kart,RobotChassis,RaceDecor} from './Vehicles';
import {StaticBatch} from './StaticBatch';
const colors=['#ffb338','#a59bff','#64d6bc','#ff839f'];
function Box({position,size,color}:{position:[number,number,number];size:[number,number,number];color:string}){
 return <Block at={position} size={size} color={color} radius={.08}/>;
}
type Time={current:number};
// Server snapshots arrive ~20 times a second; everything below animates every frame between them.
function Racer({a,index,game,elapsed,time}:{a:Actor;index:number;game:string;elapsed:number;time:Time}){
 const ref=useRef<THREE.Group>(null!),speed=useRef(a.speed);speed.current=a.speed;
 const track=useRef({seen:a,fromX:a.x,fromZ:a.z,fromRot:0,at:0,last:0,span:50});
 useFrame((_,dt)=>{
 const now=performance.now(),t=track.current,g=ref.current;
 if(t.seen!==a){t.seen=a;t.fromX=g.position.x;t.fromZ=g.position.z;t.fromRot=g.rotation.y;t.span=Math.max(40,Math.min(200,now-t.last));t.last=t.at=now;}
 const far=Math.hypot(a.x-t.fromX,a.z-t.fromZ)>4,k=far?1:Math.min(1,(now-t.at)/t.span);
 const rot=game==='kart'?-a.progress/7:Math.atan2(a.dx,a.dz),turn=Math.atan2(Math.sin(rot-t.fromRot),Math.cos(rot-t.fromRot));
 const y=a.outAt!==null?THREE.MathUtils.lerp(g.position.y,-1.7,Math.min(1,dt*15)):jumpHeight(a,time.current);
 g.position.set(t.fromX+(a.x-t.fromX)*k,y,t.fromZ+(a.z-t.fromZ)*k);
 g.rotation.y=t.fromRot+turn*k;
 });
 const robot=game==='robot',kart=game==='kart';
 return <group ref={ref} position={[a.x,0,a.z]}><mesh rotation={[-Math.PI/2,0,0]} position={[0,.03,0]}><ringGeometry args={[.5,.58,24]}/><meshBasicMaterial color={colors[index]}/></mesh>
 {kart&&<Kart index={a.avatar} speed={speed} boosting={elapsed-a.actionAt<1.2}/>}
 {robot&&<RobotChassis index={a.avatar} dashing={elapsed-a.actionAt<.3}/>}
 <group position={[0,kart?.4:0,0]} scale={.85}><Character index={a.avatar} robot={robot} walking={Math.hypot(a.input.x,a.input.z)>.1}/></group>
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
export function MiniScene({mini:m,low=false,running=false}:{mini:MiniState;low?:boolean;running?:boolean}){
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
 {m.actors.map((a,i)=><Racer key={a.id} a={a} index={i} game={m.game} elapsed={m.elapsed} time={time}/>)}
 </>;
}
export function MiniControls({mini:m,id,socket}:{mini:MiniState;id:string;socket:Socket}){
 const keys=useRef(new Set<string>()),stick=useRef({x:0,z:0}),pad=useRef<HTMLDivElement>(null);
 const [knob,setKnob]=useState({x:0,z:0});
 const a=m.actors.find(p=>p.id===id)!;
 useEffect(()=>{
 const down=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key)){e.preventDefault();keys.current.add(e.key);if(e.key===' '&&!e.repeat)socket.emit('action');}};
 const up=(e:KeyboardEvent)=>keys.current.delete(e.key);
 const reset=()=>{keys.current.clear();stick.current={x:0,z:0};setKnob({x:0,z:0});socket.emit('input',{x:0,z:0});};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',reset);
 const timer=setInterval(()=>{const k=keys.current;socket.emit('input',{x:stick.current.x+(k.has('ArrowRight')||k.has('d')?1:0)-(k.has('ArrowLeft')||k.has('a')?1:0),z:stick.current.z+(k.has('ArrowDown')||k.has('s')?1:0)-(k.has('ArrowUp')||k.has('w')?1:0)});},50);
 return()=>{clearInterval(timer);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',reset);reset();};
 },[socket,m.game]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)/42,z=(e.clientY-r.top-r.height/2)/42,len=Math.max(1,Math.hypot(x,z));stick.current={x:x/len,z:z/len};setKnob(stick.current);};
 const reset=()=>{stick.current={x:0,z:0};setKnob(stick.current);socket.emit('input',stick.current);};
 const actionLabel=m.game==='kart'?'부스터':m.game==='photo'?'대시':m.game==='robot'?'돌진':'점프';
 return <><div className="mini-instructions"><b>{gameNames[m.game]}</b><span>{instructions[m.game]}</span>
 {m.game==='color'&&<strong style={{background:palette[m.safe],color:'#243841'}}>안전: {colorNames[m.safe]} · {m.collapsed?'발판 붕괴!':Math.ceil(6-m.elapsed%7.5)+'초'}</strong>}
 {m.game==='photo'&&<strong>다음 촬영 {Math.ceil(10-m.elapsed%10)}초 · {a.points}점</strong>}
 {m.game==='kart'&&<strong>{a.finishAt!==null?'완주!':Math.min(2,Math.floor(a.progress/(Math.PI*14))+1)+' / 2 바퀴'} · 부스터 {a.boosts}개</strong>}
 {['robot','meteor','lighthouse'].includes(m.game)&&<strong>{'♥'.repeat(a.hp)} {m.game==='robot'?'명중 '+a.points+'회':''}</strong>}
 </div>
 {a.outAt!==null?<div className="eliminated">탈락 · 친구들의 경기를 관전 중</div>:a.finishAt!==null?<div className="eliminated">완주! {a.finishAt.toFixed(2)}초</div>:<>
 {m.game!=='lighthouse'&&<div aria-label="이동 조이스틱" className="joystick" ref={pad} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))move(e);}} onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}><span style={{transform:'translate('+knob.x*36+'px,'+knob.z*36+'px)'}}>✥</span></div>}
 {m.game!=='meteor'&&<button className="primary mini-action" disabled={m.elapsed-a.actionAt<(m.game==='kart'?3:['photo','robot'].includes(m.game)?1.6:1)||(m.game==='kart'&&a.boosts===0)} onPointerDown={()=>socket.emit('action')}>{actionLabel}<small>SPACE</small></button>}
 </>}</>;
}

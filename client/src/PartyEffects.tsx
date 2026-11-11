import {useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Character,Block,Lighting} from './World';
import {avatars,moveDuration,moveLabel,ROLL_MS,type MoveEvent} from '../../shared/presentation';
import {instructions,gameNames} from '../../shared/minigames';
import type {MiniState,MiniResult} from '../../shared/minigames';

function PreviewCharacter({value}:{value:number}){
 const {camera}=useThree();useEffect(()=>{camera.lookAt(0,.9,0);},[camera]);
 return <group position={[0,-.1,0]} rotation={[0,-.25,0]}><Character index={value}/></group>;
}
export function AvatarPicker({value,onChange,preview=true}:{value:number;onChange:(n:number)=>void;preview?:boolean}){
 return <section className={'avatar-picker '+(preview?'':'inline')} aria-label="캐릭터 선택">
 {preview&&<div className="avatar-preview"><Canvas dpr={1} camera={{position:[0,1.2,4.4],fov:34}} gl={{alpha:true,antialias:true}}><ambientLight intensity={1.5}/><directionalLight position={[-2,4,3]} intensity={2}/><PreviewCharacter value={value}/></Canvas><div><small>YOUR ADVENTURER</small><b>{avatars[value].name}</b><span>{avatars[value].description}</span></div></div>}
 <div className="avatar-options" role="group" aria-label="캐릭터 목록">{avatars.map((a,i)=><button type="button" key={a.name} aria-label={a.name+' 선택'} aria-pressed={value===i} onClick={()=>onChange(i)} style={{'--avatar-color':a.color} as React.CSSProperties}><i className={'avatar-face species-'+i}><em/><em/></i><b>{a.name}</b><small>{a.species}</small></button>)}</div>
 </section>;
}
const pipPositions:Record<number,number[][]>={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,1],[1,1],[-1,-1],[1,-1]],5:[[-1,1],[1,1],[0,0],[-1,-1],[1,-1]],6:[[-1,1],[1,1],[-1,0],[1,0],[-1,-1],[1,-1]]};
export function Dice3D({value=1,rolling=false}:{value?:number;rolling?:boolean}){
 const ref=useRef<THREE.Group>(null!);
 useFrame((_,dt)=>{if(rolling){ref.current.rotation.x+=dt*10;ref.current.rotation.y+=dt*13;}else{ref.current.rotation.x=THREE.MathUtils.damp(ref.current.rotation.x,0,12,dt);ref.current.rotation.y=THREE.MathUtils.damp(ref.current.rotation.y,0,12,dt);}});
 return <group ref={ref}><Block size={[1,1,1]} radius={.16} color="#fff9e7"/>
 {Array.from({length:6},(_,face)=>{const rotation:[number,number,number]=face===0?[0,0,0]:face===1?[0,Math.PI,0]:face===2?[0,Math.PI/2,0]:face===3?[0,-Math.PI/2,0]:face===4?[-Math.PI/2,0,0]:[Math.PI/2,0,0];
 const rest=[1,2,3,4,5,6].filter(n=>n!==value&&n!==7-value);
 const first=rest[0],second=rest.find(n=>n!==first&&n!==7-first)!;
 const number=[value,7-value,first,7-first,second,7-second][face];
 return <group key={face} rotation={rotation}>{pipPositions[number].map(([x,y],i)=><mesh key={i} position={[x*.23,y*.23,.506]}><circleGeometry args={[.075,12]}/><meshBasicMaterial color={number===1?'#e98c72':'#597f74'}/></mesh>)}</group>;})}
 </group>;
}
export function BoardFeedback({move,now,paused}:{move?:MoveEvent;now:number;paused:boolean}){
 if(!move)return null;
 const elapsed=now-move.at,duration=moveDuration(move);
 if(elapsed<0||elapsed>duration+4000)return null;
 const arriving=elapsed>=duration;
 return <div className={'board-feedback '+(arriving?'arrived':'')} role="status">
 {!arriving?<><div className="dice-preview"><Canvas dpr={1} camera={{position:[0,0,3],fov:35}}><ambientLight intensity={1.4}/><directionalLight position={[2,4,3]} intensity={2}/><Dice3D value={move.dice} rolling={!paused&&elapsed<ROLL_MS}/></Canvas></div><b>{elapsed<ROLL_MS?'주사위 데굴데굴…':move.dice+'칸 모험 중!'}</b></>:
 <><span className="reward-symbol">{move.stars?'★':move.tile==='trap'?'!':move.tile==='quiz'?'✦':'●'}</span><b>{moveLabel(move)}</b>{move.coins>0&&<small>새로운 모험을 위한 코인이 쌓였어요.</small>}</>}
 </div>;
}
export function ReadyCard({mini,seconds}:{mini:MiniState;seconds:number}){
 return <div className="countdown-overlay"><div><small>NEXT ADVENTURE</small><h2>{gameNames[mini.game]}</h2><p>{instructions[mini.game]}</p><strong key={seconds}>{Math.max(1,seconds)}</strong><span>곧 시작해요 · 모두 같은 신호에 출발!</span></div></div>;
}
export function Confetti({low=false}:{low?:boolean}){
 const ref=useRef<THREE.InstancedMesh>(null!),start=useRef(-1),dummy=useMemo(()=>new THREE.Object3D(),[]),count=low?16:64;
 useEffect(()=>{for(let i=0;i<count;i++)ref.current.setColorAt(i,new THREE.Color(['#f9d375','#f2a4b8','#8cd4c3','#b5a8ed'][i%4]));if(ref.current.instanceColor)ref.current.instanceColor.needsUpdate=true;},[count]);
 useFrame(({clock})=>{if(start.current<0)start.current=clock.elapsedTime;const t=clock.elapsedTime-start.current;if(t>9){ref.current.visible=false;return;}for(let i=0;i<count;i++){
 const a=i*2.399;const y=6-(t*.8+i*.17)%7;dummy.position.set(Math.sin(a)*(2+i%4)+Math.sin(t+i)*.3,y,Math.cos(a)*(2+i%3));dummy.rotation.set(t+i,t*.6,i);dummy.scale.setScalar(t>9?0:1);dummy.updateMatrix();ref.current.setMatrixAt(i,dummy.matrix);}ref.current.instanceMatrix.needsUpdate=true;});
 return <instancedMesh ref={ref} args={[undefined,undefined,count]} frustumCulled={false}><boxGeometry args={[.1,.05,.2]}/><meshStandardMaterial roughness={.7}/></instancedMesh>;
}
export function PodiumScene({mini,results,low=false}:{mini:MiniState;results:MiniResult[];low?:boolean}){
 const {camera,size}=useThree();
 useEffect(()=>{camera.position.set(.7,5,Math.max(10,5/(Math.tan(42*Math.PI/360)*(size.width/size.height))));camera.lookAt(.7,1,0);},[camera,size.width,size.height]);
 const places=[0,-2.3,2.3,4.3];
 return <><Lighting low={low}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.2,0]} receiveShadow><circleGeometry args={[12,48]}/><meshStandardMaterial color="#c7dfc9"/></mesh>
 {results.map((r,i)=>{const a=mini.actors.find(a=>a.id===r.id)!;const h=r.rank===1?1.2:r.rank===2?.8:.45;return <group key={r.id} position={[places[i],0,0]}><Block at={[0,h/2,0]} size={[1.8,h,1.6]} color={r.rank===1?'#f7d989':r.rank===2?'#d4e6e3':'#e4c8ba'}/><group position={[0,h,0]}><Character index={a.avatar}/></group>{r.rank===1&&<mesh position={[0,h+2.3,0]} rotation={[0,Math.PI/4,0]}><octahedronGeometry args={[.3]}/><meshStandardMaterial color="#ffe28e" metalness={.4} roughness={.3}/></mesh>}</group>;})}
 <Confetti low={low}/></>;
}
export function usePartySound(state:any,me:any){
 const [enabled,setEnabled]=useState(false),context=useRef<AudioContext|null>(null),seen=useRef({move:'',phase:'',reward:''});
 useEffect(()=>()=>{void context.current?.close();},[]);
 function chime(notes:number[]){
 const ctx=context.current;if(!ctx||ctx.state!=='running')return;
 notes.forEach((frequency,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+i*.1;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.035,at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+.18);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+.2);osc.onended=()=>{osc.disconnect();gain.disconnect();};});
 }
 useEffect(()=>{const move=me?.lastMove;if(enabled&&move?.id!==seen.current.move&&move&&state.now-move.at<1500)chime([330,440]);if(enabled&&state?.phase!==seen.current.phase&&state?.phase==='miniResults')chime([523,659,784,1047]);if(move&&state.now-move.at>=moveDuration(move)&&seen.current.reward!==move.id){if(enabled&&state.now-move.at<moveDuration(move)+1000)chime(move.coins<0?[330,262]:move.stars>0?[523,659,784,1047]:[659,880]);seen.current.reward=move.id;}seen.current.move=move?.id||'';seen.current.phase=state?.phase||'';},[state?.phase,state?.now,me?.lastMove?.id,enabled]);
 async function toggle(){try{if(!enabled){context.current??=new AudioContext();await context.current.resume();setEnabled(true);chime([523,659]);}else{setEnabled(false);await context.current?.suspend();}}catch{setEnabled(false);}}
 return {enabled,toggle};
}

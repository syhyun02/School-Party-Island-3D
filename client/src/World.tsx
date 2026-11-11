import {memo,useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,RoundedBox,Float} from '@react-three/drei';
import * as THREE from 'three';
import {movePosition,ROLL_MS} from '../../shared/presentation';
import {StaticBatch} from './StaticBatch';
export const playerColors=['#f8b84a','#a292ed','#60cdb9','#f3839c'];
type V3=[number,number,number];
export function Ball({at=[0,0,0],scale=[1,1,1],color='#fff'}:{at?:V3;scale?:V3;color?:string}){
 return <mesh position={at} scale={scale} castShadow receiveShadow><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color={color} roughness={.75}/></mesh>;
}
export function Block({at=[0,0,0],size=[1,1,1],color='#fff',radius=.12}:{at?:V3;size?:V3;color?:string;radius?:number}){
 return <RoundedBox position={at} args={size} radius={Math.min(radius,...size.map(n=>n/3))} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.7}/></RoundedBox>;
}
export const Character=memo(function Character({index=0,walking=false,robot=false}:{index?:number;walking?:boolean;robot?:boolean}){
 const body=useRef<THREE.Group>(null!),left=useRef<THREE.Group>(null!),right=useRef<THREE.Group>(null!);
 useFrame(({clock})=>{const t=clock.elapsedTime;body.current.position.y=Math.sin(t*(walking?14:2.5))*(walking?.065:.025);left.current.rotation.x=walking?Math.sin(t*14)*.55:0;right.current.rotation.x=-left.current.rotation.x;});
 const c=playerColors[index%4],fur=['#fff1d6','#f4eaff','#e5fae5','#ffe9df'][index%4];
 return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]}><circleGeometry args={[.48,20]}/><meshBasicMaterial color="#274c4a" transparent opacity={.18} depthWrite={false}/></mesh>
 <group ref={body}><StaticBatch bakeKey={index+':'+robot}>
 {index%4===3&&<group position={[0,.6,-.4]} rotation={[.3,0,0]}><Ball at={[0,.15,-.12]} scale={[.3,.5,.26]} color="#dba284"/><Ball at={[0,.15,-.32]} scale={[.09,.42,.07]} color="#fff0ce"/></group>}
 {index%4===1&&<group position={[0,.45,-.4]} rotation={[.9,0,0]}><Ball at={[0,.05,-.12]} scale={[.2,.36,.2]} color="#c6a1da"/><Ball at={[0,-.18,-.12]} scale={[.17,.15,.17]} color="#fff0de"/></group>}
 <Ball at={[0,.65,0]} scale={[.36,.43,.29]} color={c}/>
 <Ball at={[0,1.18,.02]} scale={[.47,.43,.4]} color={robot?'#d9eef3':fur}/>
 {[0,1].map(i=><group key={i} position={[(i?1:-1)*.29,1.52,0]} rotation={[0,0,(i?-1:1)*.22]}>
 {index%4===0?<><Ball at={[0,.23,0]} scale={[.13,.4,.13]} color={fur}/><Ball at={[0,.25,.1]} scale={[.065,.25,.035]} color="#f9b7b2"/></>:index%4===1?<mesh castShadow position={[0,.12,0]}><coneGeometry args={[.21,.42,3]}/><meshStandardMaterial color={fur}/></mesh>:<Ball scale={[.2,.2,.17]} color={index%4===2?c:fur}/>}
 </group>)}
 {[-1,1].map(side=><group key={side}><Ball at={[side*.16,1.23,.38]} scale={[.052,.075,.035]} color="#24384b"/><Ball at={[side*.145,1.25,.408]} scale={[.016,.022,.012]} color="#fff"/><Ball at={[side*.29,1.08,.33]} scale={[.09,.045,.035]} color="#f7a8a4"/><Ball at={[side*.4,.72,.02]} scale={[.13,.23,.14]} color={fur}/></group>)}
 <Ball at={[0,1.08,.416]} scale={[.058,.04,.03]} color="#9c6559"/>
 <mesh position={[0,1.02,.412]} rotation={[0,0,Math.PI]}><torusGeometry args={[.07,.012,6,12,Math.PI]}/><meshStandardMaterial color="#714a4b"/></mesh>
 <Block at={[0,.7,-.3]} size={[.38,.4,.16]} color="#b67c58"/>
 <Block at={[0,.9,.27]} size={[.33,.1,.08]} color="#fff6d1"/>
 </StaticBatch>
 <group ref={left} position={[-.19,.3,0]}><Ball at={[0,-.08,.05]} scale={[.17,.2,.24]} color="#fef4df"/></group>
 <group ref={right} position={[.19,.3,0]}><Ball at={[0,-.08,.05]} scale={[.17,.2,.24]} color="#fef4df"/></group>
 </group></group>;
});
export function Tree({at=[0,0,0],size=1,palm=false}:{at?:V3;size?:number;palm?:boolean}){
 return <group position={at} scale={size}><mesh position={[0,1,0]} castShadow><cylinderGeometry args={[.16,.25,2,8]}/><meshStandardMaterial color="#bd8960"/></mesh>
 {palm?Array.from({length:6},(_,i)=><group key={i} rotation={[0,i*Math.PI/3,0]} position={[0,2,0]}><Ball at={[.65,0,0]} scale={[1.1,.14,.3]} color={i%2?'#52ac79':'#76c37e'}/></group>):<><Ball at={[0,2,0]} scale={[.95,.95,.85]} color="#4aab7d"/><Ball at={[-.55,1.9,.1]} scale={[.65,.7,.65]} color="#67be87"/><Ball at={[.4,2.55,0]} scale={[.62,.7,.58]} color="#80cb88"/></>}
 </group>;
}
export function Lighthouse({at=[0,0,0],size=1}:{at?:V3;size?:number}){
 return <group position={at} scale={size}>
 <mesh position={[0,1.5,0]} castShadow><cylinderGeometry args={[.48,.8,3,16]}/><meshStandardMaterial color="#fff4dc"/></mesh>
 {[.9,1.8].map(y=><mesh key={y} position={[0,y,0]}><cylinderGeometry args={[.79-y*.1,.81-y*.1,.32,16]}/><meshStandardMaterial color="#ef8f7f"/></mesh>)}
 <mesh position={[0,3.15,0]} castShadow><cylinderGeometry args={[.65,.65,.55,12]}/><meshStandardMaterial color="#a8e5e8" metalness={.15} roughness={.2}/></mesh>
 <mesh position={[0,3.6,0]} castShadow><coneGeometry args={[.86,.6,12]}/><meshStandardMaterial color="#438f9b"/></mesh>
 <Ball at={[0,3.15,0]} scale={[.3,.25,.3]} color="#ffe9a4"/>
 <Block at={[0,.4,.7]} size={[.35,.7,.08]} color="#719fa6"/>
 </group>;
}
export function Ocean(){
 const material=useMemo(()=>new THREE.ShaderMaterial({
 uniforms:{time:{value:0}},
 vertexShader:'varying vec2 v; varying float d; uniform float time; void main(){v=position.xy; vec3 p=position; p.z+=sin(p.x*.4+time*.6)*.08+cos(p.y*.5+time*.5)*.06;vec4 mv=modelViewMatrix*vec4(p,1.);d=-mv.z;gl_Position=projectionMatrix*mv;}',
 fragmentShader:'varying vec2 v;varying float d;uniform float time;void main(){float w=sin(v.x*.9+sin(v.y*.7+time*.35))*sin(v.y*1.2+time*.4); vec3 c=mix(vec3(.24,.67,.72),vec3(.29,.72,.76),w*.5+.5);float light=smoothstep(.97,1.,w);c=mix(c+light*.025,vec3(.725,.898,.906),smoothstep(35.,100.,d));gl_FragColor=vec4(c,1.);}'
 }),[]);
 useEffect(()=>()=>material.dispose(),[material]);
 useFrame((_,dt)=>material.uniforms.time.value+=dt);
 return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.15,0]} material={material}><planeGeometry args={[500,500,60,60]}/></mesh>;
}
export function Lighting({low=false,dark=false}:{low?:boolean;dark?:boolean}){
 return <><color attach="background" args={[dark?'#172846':'#b9e5e7']}/><fog attach="fog" args={[dark?'#172846':'#b9e5e7',40,100]}/>
 <hemisphereLight args={['#fff4df','#82a8aa',1.5]}/><ambientLight intensity={.35}/>
 <directionalLight castShadow={!low} position={[-12,22,10]} intensity={2.5} color="#fff0cf" shadow-mapSize={[1024,1024]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-bias={-.0005} shadow-normalBias={.04}/>
 <directionalLight position={[10,8,-15]} intensity={.7} color="#c5e7ff"/></>;
}
function Island({x,z,color}:{x:number;z:number;color:string}){
 return <group position={[x,-.45,z]}><Ball scale={[5.5,.8,5.3]} color="#e8c18b"/><Ball at={[0,.4,0]} scale={[5.2,.65,5]} color={color}/>{Array.from({length:7},(_,i)=><Ball key={i} at={[Math.cos(i)*4.3,-.4,Math.sin(i)*4.1]} scale={[1.1,.8,.9]} color="#d7b388"/>)}</group>;
}
function Windmill(){
 const rotor=useRef<THREE.Group>(null!);useFrame((_,dt)=>rotor.current.rotation.z+=dt*.4);
 return <group position={[-6.8,.4,-6.8]}><mesh position={[0,1.4,0]} castShadow><cylinderGeometry args={[.65,.95,2.8,12]}/><meshStandardMaterial color="#fff1d2"/></mesh><mesh position={[0,3,0]} castShadow><coneGeometry args={[1.1,1,12]}/><meshStandardMaterial color="#da8b6e"/></mesh><group ref={rotor} userData={{noBatch:true}} position={[0,2.4,.85]}>{[0,1,2,3].map(i=><group key={i} rotation={[0,0,i*Math.PI/2]}><Block at={[0,.9,0]} size={[.28,1.9,.1]} color="#f8dfb3"/></group>)}<Ball scale={[.2,.2,.2]} color="#b47a60"/></group></group>;
}
function Star({at=[0,0,0]}:{at?:V3}){
 const geo=useMemo(()=>{const shape=new THREE.Shape();for(let i=0;i<10;i++){const r=i%2?.28:.6,a=i*Math.PI/5+Math.PI/2;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.06,bevelThickness:.06});},[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 return <Float speed={2} rotationIntensity={.3} floatIntensity={.6}><mesh geometry={geo} position={at} castShadow><meshStandardMaterial color="#ffe080" metalness={.25} roughness={.3}/></mesh></Float>;
}
const tc:Record<string,string>={coin:'#74cce1',bonus:'#a4d777',trap:'#f28f99',quiz:'#b09ddd',star:'#f9d26b',event:'#84d7b9'};
export function boardPoint(position:number):V3{const a=position/32*Math.PI*2;return [Math.cos(a)*8.8,.72,Math.sin(a)*8.8];}
function Token({p,index,now,paused}:{p:any;index:number;now:number;paused:boolean}){
 const ref=useRef<THREE.Group>(null!),anchor=useRef({server:now,local:performance.now()});
 const [moving,setMoving]=useState(false),walking=useRef(false);
 useEffect(()=>{anchor.current={server:now,local:performance.now()};},[now]);
 useFrame(({clock})=>{
 const time=anchor.current.server+(paused?0:performance.now()-anchor.current.local);
 const progress=p.lastMove?movePosition(p.lastMove,time):p.position;
 const isWalking=!!p.lastMove&&progress>p.lastMove.from&&progress<p.lastMove.from+p.lastMove.dice;
 if(walking.current!==isWalking){walking.current=isWalking;setMoving(isWalking);}
 const pos=boardPoint(progress);
 ref.current.position.set(pos[0]+Math.cos(index*Math.PI/2)*.22,pos[1]+(isWalking?Math.abs(Math.sin(clock.elapsedTime*12))*.12:0),pos[2]+Math.sin(index*Math.PI/2)*.22);
 ref.current.rotation.y=-progress/32*Math.PI*2;
 });
 return <group ref={ref} position={boardPoint(p.position)} scale={.85}><Character index={p.avatar??index} walking={moving}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,.02,0]}><ringGeometry args={[.48,.58,24]}/><meshBasicMaterial color={playerColors[index%4]}/></mesh></group>;
}
// Static scenery is merged once and skipped on every later server update.
const BoardScenery=memo(function BoardScenery({tilesKey,low}:{tilesKey:string;low:boolean}){
 const tiles=tilesKey.split(',');
 return <StaticBatch bakeKey={tilesKey+low}>
 <Island x={-5.8} z={-5.8} color="#8fc78d"/><Island x={5.8} z={-5.8} color="#bdd9a4"/><Island x={5.8} z={5.8} color="#f1d39b"/><Island x={-5.8} z={5.8} color="#a9ced4"/>
 <mesh position={[0,-.1,0]} castShadow receiveShadow><cylinderGeometry args={[3.7,4.2,1.2,48]}/><meshStandardMaterial color="#e5c6a2"/></mesh>
 <mesh position={[0,.52,0]} receiveShadow><cylinderGeometry args={[3.65,3.65,.1,48]}/><meshStandardMaterial color="#f6e4c3"/></mesh>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,.59,0]}><ringGeometry args={[2.6,2.8,48]}/><meshStandardMaterial color="#ddae86"/></mesh>
 <Block at={[0,.9,0]} size={[2.8,.6,2.8]} color="#b6d9ce"/><Block at={[0,1.35,0]} size={[2,.35,2]} color="#fff1d1"/>
 <Star at={[0,2.7,0]}/>
 {Array.from({length:4},(_,i)=><group key={i} rotation={[0,Math.PI/4+i*Math.PI/2,0]}>
 {Array.from({length:6},(_,j)=><Block key={j} at={[0,.55,3.8+j*.34]} size={[1.5,.16,.29]} color={j%2?'#c59873':'#d7ae83'}/>)}
 {[-.72,.72].map(x=><group key={x}><Block at={[x,1,4.6]} size={[.09,.8,2.1]} color="#c49471"/></group>)}
 </group>)}
 {!low&&Array.from({length:20},(_,i)=>{const x=-8+(i%5)*.75,z=-5+Math.floor(i/5)*.65;return <group key={i} position={[x,.3,z]}><Ball at={[0,.15,0]} scale={[.13,.18,.13]} color="#6fa768"/><Ball at={[0,.32,0]} scale={[.17,.09,.17]} color={['#ffd891','#f1a9bf','#f4f4cf'][i%3]}/></group>;})}
 {[-1,1].map(side=><group key={side} position={[side*2.7,.6,1.3]}><Block at={[0,.8,0]} size={[.09,1.6,.09]} color="#ae8162"/><mesh position={[side*.3,1.4,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.4,.65,3]}/><meshStandardMaterial color={side===1?'#f4b871':'#e496ad'} side={THREE.DoubleSide}/></mesh></group>)}
 <Windmill/>
 {!low&&Array.from({length:12},(_,i)=><Tree key={i} at={[-9+(i%4)*1.8,.1,-8+Math.floor(i/4)*2]} size={.65+(i%3)*.15}/>)}
 <Tree at={[-4.4,.4,-4]} size={1.3}/><Tree at={[-9,.1,-3.5]} size={1.1}/>
 <Lighthouse at={[7,.4,-7]} size={1.3}/>
 {[0,1,2].map(i=><Tree key={i} at={[9-i*2,.2,-3.2]} size={.75} palm/>)}
 <group position={[10.5,-.5,-7]} rotation={[0,.5,0]}><Ball scale={[1.4,.3,.65]} color="#f5e8c9"/><Block at={[0,.8,0]} size={[.07,2,.07]} color="#ad7856"/><mesh position={[.4,1,0]}><coneGeometry args={[.7,1.4,3]}/><meshStandardMaterial color="#f39d87" side={THREE.DoubleSide}/></mesh></group>
 <group position={[6.5,.3,6.8]} rotation={[0,Math.PI/4,0]}><mesh position={[0,1.3,0]} castShadow><coneGeometry args={[2.4,2.8,4]}/><meshStandardMaterial color="#ddb079" flatShading/></mesh><mesh position={[0,2.4,0]} castShadow><coneGeometry args={[.6,.8,4]}/><meshStandardMaterial color="#f4d28e"/></mesh></group>
 {[4,8.5].map(x=><group key={x}><Block at={[x,1,4.7]} size={[.45,1.7,.45]} color="#e2b888"/><Block at={[x,1,5.7]} size={[.45,1.7,.45]} color="#e2b888"/><Block at={[x,2,5.2]} size={[.7,.35,1.7]} color="#f0c895"/></group>)}
 {[[-8,7],[-5,8],[-7,4.5]].map(([x,z],i)=><group key={i}><Block at={[x,1.3+i*.3,z]} size={[1.4,2.5+i*.6,1.5]} color={['#b2bde2','#e2b5ce','#a3d8d1'][i]}/><Block at={[x,2.7+i*.6,z]} size={[1.6,.22,1.7]} color="#f4efdd"/>{[0,1,2].flatMap(j=>[-.32,.32].map(w=><Block key={j+':'+w} at={[x+w,.7+j*.6,z+.76]} size={[.3,.35,.06]} color="#e8ffff"/>))}</group>)}
 {tiles.map((type:string,i:number)=>{const p=boardPoint(i),next=boardPoint(i+.5);return <group key={i}>
 <group position={[next[0],.4,next[2]]} rotation={[0,-(i+.5)*Math.PI/16,0]}><Block size={[1.4,.25,1.8]} color="#dfbd94"/></group>
 <mesh position={p} castShadow receiveShadow><cylinderGeometry args={[.67,.72,.22,24]}/><meshStandardMaterial color="#fff3da"/></mesh>
 <mesh position={[p[0],p[1]+.13,p[2]]} receiveShadow><cylinderGeometry args={[.55,.55,.06,24]}/><meshStandardMaterial color={tc[type]}/></mesh>
 {type==='star'?<Star at={[p[0],1.5,p[2]]}/>:type==='quiz'?<mesh position={[p[0],1.2,p[2]]} rotation={[0,Math.PI/4,0]}><octahedronGeometry args={[.22]}/><meshStandardMaterial color="#fff1ff"/></mesh>:null}
 </group>;})}
 {!low&&Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,r=12+(i%3);return <Ball key={i} at={[Math.cos(a)*r,-.5,Math.sin(a)*r]} scale={[.5,.35,.7]} color="#dbd0b3"/>;})}
 </StaticBatch>;
});
export function BoardScene({state,low=false,playerId}:{state:any;low?:boolean;playerId?:string}){
 const controls=useRef<any>(null),{camera}=useThree();
 const focus=useRef<{at:number;from:number;dice:number}|null>(null),returning=useRef(false);
 const me=state?.players?.find((p:any)=>p.id===playerId);
 useEffect(()=>{if(me?.dice&&state?.phase==='board'&&me.lastMove&&state.now-me.lastMove.at<4000){focus.current={at:performance.now(),from:me.position-me.dice,dice:me.dice};returning.current=false;}},[me?.dice,state?.round]);
 useFrame((_,dt)=>{if(!controls.current)return;
 if(focus.current){const elapsed=(performance.now()-focus.current.at)/1000;
 const p=boardPoint(focus.current.from+Math.min(focus.current.dice,Math.max(0,elapsed-ROLL_MS/1000)*4));
 const target=new THREE.Vector3(...p);
 camera.position.lerp(target.clone().add(new THREE.Vector3(8,10,12)),Math.min(1,dt*2));
 controls.current.target.lerp(target,Math.min(1,dt*2));
 if(elapsed>4){focus.current=null;returning.current=true;}
 }else if(returning.current){const dest=new THREE.Vector3(23,25,30);camera.position.lerp(dest,Math.min(1,dt*1.5));controls.current.target.lerp(new THREE.Vector3(),Math.min(1,dt*1.5));if(camera.position.distanceTo(dest)<.1)returning.current=false;}
 });
 const tiles=state?.tiles||Array.from({length:32},(_,i)=>['coin','quiz','bonus','star','trap','event'][i%6]);
 return <><Lighting low={low}/><Ocean/>
 <BoardScenery tilesKey={tiles.join(',')} low={low}/>
 {(state?.players||[{position:2},{position:10},{position:18},{position:26}]).map((p:any,i:number)=><Token key={p.id||i} p={p} index={i} now={state?.now??Date.now()} paused={!!state?.paused}/>)}
 <OrbitControls ref={controls} onStart={()=>{focus.current=null;returning.current=false;}} makeDefault enablePan={false} minDistance={17} maxDistance={40} minPolarAngle={.35} maxPolarAngle={1.2} autoRotate={!state} autoRotateSpeed={.35}/>
 </>;
}
export const ArenaDecor=memo(function ArenaDecor({game,low=false}:{game:string;low?:boolean}){
 const dark=game==='meteor'||game==='robot';
 return <><Lighting dark={dark} low={low}/>
 {!dark&&<Ocean/>}
 <StaticBatch bakeKey={game+low}>
 {game==='lighthouse'&&<><Lighthouse at={[-7,-.4,-3]} size={1.4}/><Tree at={[7,-.4,-4]} size={1.6} palm/><Tree at={[-6,-.4,4]} size={1.1} palm/></>}
 {(game==='photo'||game==='color'||game==='kart')&&Array.from({length:low?4:8},(_,i)=>{const a=i*Math.PI/4,r=game==='kart'?12:8;return <group key={i} position={[Math.cos(a)*r,-.4,Math.sin(a)*r]}><Ball at={[0,-.4,0]} scale={[1.5,.5,1.3]} color="#ddc79f"/><Tree at={[0,0,0]} size={.9} palm={game==='color'}/></group>;})}
 {game==='photo'&&<group position={[0,0,-5.8]}><Block at={[-2,1.7,0]} size={[.4,3.5,.5]} color="#f7d6a4"/><Block at={[2,1.7,0]} size={[.4,3.5,.5]} color="#f7d6a4"/><Block at={[0,3.3,0]} size={[4.6,.45,.6]} color="#e78dac"/><Star at={[0,3.9,0]}/></group>}
 {dark&&Array.from({length:low?8:16},(_,i)=>{const a=i*Math.PI/8;return <group key={i} position={[Math.cos(a)*7,-.4,Math.sin(a)*7]}><Block size={[.8,1.5,.8]} color="#344d70"/><Block at={[0,.8,0]} size={[.65,.15,.65]} color={game==='meteor'?'#a2a2ff':'#6df2d4'}/></group>;})}
 {game==='meteor'&&!low&&Array.from({length:40},(_,i)=><mesh key={i} position={[Math.sin(i*14)*28,5+(i%7)*2,Math.cos(i*13)*28]}><sphereGeometry args={[.04,4,4]}/><meshBasicMaterial color="#e5faff"/></mesh>)}
 </StaticBatch></>;
});

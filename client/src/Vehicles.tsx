import {memo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Block,Ball,playerColors} from './World';
import {StaticBatch} from './StaticBatch';
export const Kart=memo(function Kart({index,speed,boosting}:{index:number;speed:{current:number};boosting:boolean}){
 const wheels=useRef<THREE.Group>(null!);
 useFrame((_,dt)=>{wheels.current.children.forEach(w=>{w.rotation.x+=speed.current*dt*2;});});
 const color=playerColors[index%4];
 return <group><StaticBatch bakeKey={index}>
 <Block at={[0,.3,0]} size={[.95,.24,1.55]} color="#3e5e60" radius={.1}/>
 <Block at={[0,.52,.45]} size={[.85,.35,.6]} color={color} radius={.17}/>
 <Block at={[0,.38,-.57]} size={[.8,.26,.35]} color={color}/>
 <Block at={[0,.78,-.6]} size={[1.15,.12,.25]} color="#fff2ce"/>
 <Block at={[0,.65,-.2]} size={[.56,.5,.16]} color="#41666d"/>
 {[-.28,.28].map(x=><Ball key={x} at={[x,.58,.77]} scale={[.12,.07,.035]} color="#fff5a9"/>)}
 <mesh position={[0,.85,.23]} rotation={[-.6,0,0]}><torusGeometry args={[.18,.028,6,16]}/><meshStandardMaterial color="#344c54"/></mesh>
 </StaticBatch>
 <group ref={wheels}>{[-.53,.53].flatMap(x=>[-.48,.48].map(z=><group key={x+':'+z} position={[x,.27,z]}><mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.26,.26,.2,16]}/><meshStandardMaterial color="#344c54"/></mesh><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.13,.13,.23,12]}/><meshStandardMaterial color="#dfefdf" metalness={.5} roughness={.35}/></mesh></group>))}</group>
 {boosting&&[-.24,.24].map(x=><mesh key={x} position={[x,.35,-1.1]} rotation={[-Math.PI/2,0,0]}><coneGeometry args={[.13,.65,10]}/><meshBasicMaterial color="#a5eff9" transparent opacity={.8}/></mesh>)}
 </group>;
});
export const RobotChassis=memo(function RobotChassis({index,dashing}:{index:number;dashing:boolean}){
 return <group><StaticBatch bakeKey={index+':'+dashing}><Block at={[0,.4,0]} size={[1.05,.55,1.05]} color={playerColors[index%4]} radius={.2}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,.25,0]}><torusGeometry args={[.65,.12,8,24]}/><meshStandardMaterial color="#344f60"/></mesh><Block at={[0,.53,.55]} size={[.7,.15,.08]} color={dashing?'#fff19b':'#b4f6e2'}/>{[-.4,.4].map(x=><Ball key={x} at={[x,.8,-.35]} scale={[.12,.12,.12]} color="#c2f6ef"/>)}</StaticBatch></group>;
});
export function RaceDecor({low=false}:{low?:boolean}){
 return <group>
 {/* Alternating start tiles and a real 3D start gantry. */}
 {Array.from({length:12},(_,i)=><Block key={i} at={[5.5+(i%6)*.5,.045,Math.floor(i/6)*.27-.13]} size={[.49,.03,.26]} radius={.005} color={(i+Math.floor(i/6))%2?'#364f56':'#fff4d8'}/>)}
 {[5.1,8.9].map(x=><Block key={x} at={[x,1.4,0]} size={[.18,2.8,.18]} color="#e9d1a7"/>)}
 <Block at={[7,2.8,0]} size={[4.1,.45,.4]} color="#83bba3"/>
 {Array.from({length:low?16:32},(_,i)=>{const angle=i*Math.PI*2/(low?16:32);return <group key={i} position={[Math.cos(angle)*9.1,.18,Math.sin(angle)*9.1]} rotation={[0,-angle,0]}><Block size={[.3,.4,low?1.5:.85]} color={i%2?'#f0c3a9':'#f4eed6'}/></group>;})}
 <Block at={[0,.6,0]} size={[2.4,1.2,1.6]} color="#e9dfbd"/>
 <Block at={[0,1.25,0]} size={[2.8,.18,2]} color="#618e90"/>
 {[-.8,0,.8].map(x=><Block key={x} at={[x,.7,.83]} size={[.45,.5,.04]} color="#b4e1e5"/>)}
 <group position={[0,1.45,0]} rotation={[-.3,0,0]}><Block size={[1.7,.1,1.2]} color="#597b9b"/>{[-.5,0,.5].map(x=><Block key={x} at={[x,.065,0]} size={[.025,.02,1.15]} color="#cee2d9"/>)}</group>
 </group>;
}

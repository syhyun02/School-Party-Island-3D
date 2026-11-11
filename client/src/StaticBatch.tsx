import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
type Kind='standard'|'basic';
// Only plain opaque materials can share one vertex-coloured mesh; anything special keeps its own draw call.
function kindOf(mesh:THREE.Mesh):Kind|null{
 const m=mesh.material as any;
 if(Array.isArray(m)||m.transparent||m.side!==THREE.FrontSide||m.vertexColors||m.map)return null;
 if(m.isMeshBasicMaterial)return 'basic';
 if(m.isMeshStandardMaterial&&!m.flatShading&&m.metalness===0&&m.emissive.getHex()===0)return 'standard';
 return null;
}
/**
 * Merges the non-moving meshes below it into one draw call per material kind.
 * Children must not move after mounting. Mark animated subtrees with userData={{noBatch:true}},
 * and change bakeKey whenever props alter the merged geometry or colours.
 */
export function StaticBatch({children,bakeKey=''}:{children:ReactNode;bakeKey?:string|number}){
 const source=useRef<THREE.Group>(null!);
 const [merged,setMerged]=useState<Partial<Record<Kind,THREE.BufferGeometry>>>({});
 useLayoutEffect(()=>{
 const root=source.current;root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),matrix=new THREE.Matrix4();
 const parts:Record<Kind,THREE.BufferGeometry[]>={standard:[],basic:[]},hidden:THREE.Mesh[]=[];
 const visit=(o:THREE.Object3D)=>{
 if(o.userData.noBatch||!o.visible)return;
 const mesh=o as THREE.Mesh,kind=mesh.isMesh?kindOf(mesh):null;
 if(kind){
 const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
 for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal')g.deleteAttribute(name);
 if(!g.attributes.normal)g.computeVertexNormals();
 g.morphAttributes={};g.applyMatrix4(matrix.multiplyMatrices(inverse,mesh.matrixWorld));
 const c=(mesh.material as THREE.MeshStandardMaterial).color,colors=new Float32Array(g.attributes.position.count*3);
 for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
 g.setAttribute('color',new THREE.BufferAttribute(colors,3));
 parts[kind].push(g);hidden.push(mesh);mesh.visible=false;
 }
 o.children.forEach(visit);
 };
 visit(root);
 const next:Partial<Record<Kind,THREE.BufferGeometry>>={};
 for(const kind of ['standard','basic'] as Kind[]){if(parts[kind].length)next[kind]=mergeGeometries(parts[kind])??undefined;parts[kind].forEach(g=>g.dispose());}
 setMerged(next);
 return()=>{hidden.forEach(mesh=>{mesh.visible=true;});Object.values(next).forEach(g=>g?.dispose());};
 },[bakeKey]);
 return <group><group ref={source}>{children}</group>
 {merged.standard&&<mesh geometry={merged.standard} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.75}/></mesh>}
 {merged.basic&&<mesh geometry={merged.basic}><meshBasicMaterial vertexColors/></mesh>}
 </group>;
}

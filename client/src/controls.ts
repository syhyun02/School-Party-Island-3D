// Live local input, shared by the on-screen controls (which send it to the server)
// and the 3D scene (which moves the player's own character immediately, before the server replies).
export const control={keys:new Set<string>(),stick:{x:0,z:0},actions:0};
const clamp=(v:number)=>Math.max(-1,Math.min(1,v));
/** Current input, normalised exactly as the server normalises it. */
export function currentInput(){
 const k=control.keys;
 const x=clamp(control.stick.x+(k.has('ArrowRight')||k.has('d')?1:0)-(k.has('ArrowLeft')||k.has('a')?1:0));
 const z=clamp(control.stick.z+(k.has('ArrowDown')||k.has('s')?1:0)-(k.has('ArrowUp')||k.has('w')?1:0));
 const len=Math.max(1,Math.hypot(x,z));
 return {x:x/len,z:z/len};
}

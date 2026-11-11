export const tiles = [...Array(10).fill('coin'),...Array(5).fill('bonus'),...Array(5).fill('trap'),...Array(6).fill('quiz'),...Array(4).fill('star'),...Array(2).fill('event')].map((_,i,all)=>all[(i*13)%32]);
export function land(p:{position:number;coins:number;stars:number},dice:number){
 p.position=(p.position+dice)%32;
 const type=tiles[p.position];
 if(type==='coin')p.coins+=5;
 if(type==='bonus')p.coins+=10;
 if(type==='trap')p.coins=Math.max(0,p.coins-5);
 if(type==='star'&&p.coins>=20){p.coins-=20;p.stars++;}
 if(type==='event')p.coins+=15;
 return type;
}

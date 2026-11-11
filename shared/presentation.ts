export const avatars = [
 {name:'모모',species:'토끼',description:'호기심 많은 숲의 탐험가',color:'#f8b84a'},
 {name:'루루',species:'여우',description:'별빛을 찾는 영리한 여행자',color:'#a292ed'},
 {name:'코코',species:'곰',description:'자연을 지키는 든든한 친구',color:'#60cdb9'},
 {name:'보리',species:'다람쥐',description:'모험을 좋아하는 씩씩한 친구',color:'#f3839c'},
] as const;
export function validAvatar(value:unknown):value is number{return Number.isInteger(value)&&(value as number)>=0&&(value as number)<avatars.length;}
export const ROLL_MS=700;
export const STEP_MS=250;
export type MoveEvent={id:string;at:number;from:number;to:number;dice:number;tile:string;coins:number;stars:number};
export function moveDuration(move:MoveEvent){return ROLL_MS+move.dice*STEP_MS;}
export function movePosition(move:MoveEvent,now:number){
 const steps=Math.max(0,Math.min(move.dice,(now-move.at-ROLL_MS)/STEP_MS));
 return move.from+steps;
}
export function moveLabel(move:MoveEvent){
 if(move.stars>0)return '별 상점 · 별 +1 / 코인 '+move.coins;
 if(move.tile==='star')return '별 상점 · 코인 20개를 모아 다시 만나요';
 if(move.tile==='quiz')return '지식의 선물 · 교육 퀴즈 도전!';
 const names:Record<string,string>={coin:'코인 발견',bonus:'보너스 선물',trap:'앗, 함정!',event:'행운의 선물'};
 return (names[move.tile]||'도착')+' · 코인 '+(move.coins>0?'+':'')+move.coins;
}

export const gameNames = {
 color: '컬러 아일랜드 서바이벌',
 meteor: '운석을 피해라!',
 lighthouse: '등대 점프 챌린지',
 kart: '에코 카트 레이스',
 photo: '포토존 쟁탈전',
 robot: '로봇 범퍼 아레나',
} as const;
export type GameId = keyof typeof gameNames;
export const gameIds = Object.keys(gameNames) as GameId[];
export const instructions: Record<GameId, string> = {
 color: '표시된 색으로 이동! 6초 뒤 다른 발판이 무너져요. 방향키/WASD + 스페이스 점프',
 meteor: '빨간 경고 원을 피하세요. 운석에 세 번 맞으면 탈락! 방향키/WASD 이동',
 lighthouse: '회전 막대가 다가오면 점프! 스페이스 또는 점프 버튼',
 kart: '자동 가속 · ←/→ 차선 이동 · ↓ 브레이크 · 스페이스 부스터. 바깥 잔디는 느려요. 2바퀴 완주!',
 photo: '10초마다 촬영! 중앙에 가까울수록 높은 점수. 방향키/WASD + 스페이스 대시',
 robot: '풍선 3개를 지키세요! 방향키/WASD 이동, 스페이스 돌진으로 상대 공격',
};
export const palette = ['#fb7894', '#62bcea', '#ffd36b', '#8cd6a4'];
export const colorNames = ['분홍', '파랑', '노랑', '초록'];
export type Input = {x:number;z:number};
export type Actor = {
 id:string;avatar:number;x:number;z:number;hp:number;points:number;outAt:number|null;
 jumpAt:number;actionAt:number;hitAt:number;dx:number;dz:number;
 progress:number;lane:number;speed:number;boosts:number;pickup:number;finishAt:number|null;
 input:Input;inputAt:number;hits:number;
};
export type Hazard = {id:number;x:number;z:number;at:number;resolved:boolean};
export type MiniState = {
 game:GameId;elapsed:number;duration:number;actors:Actor[];angle:number;
 safe:number;cycle:number;collapsed:boolean;hazards:Hazard[];nextHazard:number;
 photo:number;flashUntil:number;done:boolean;
};
export type MiniResult = {id:string;rank:number;value:number;coins:number;score:number};
export function tileColor(x:number,z:number):number {
 const col=Math.floor((x+5)/2),row=Math.floor((z+5)/2);
 return col<0||col>4||row<0||row>4?-1:(col+row*2)%4;
}
export function jumpHeight(a:Actor,t:number){const age=t-a.jumpAt;return age>=0&&age<.8?Math.sin(age/.8*Math.PI)*1.8:0;}

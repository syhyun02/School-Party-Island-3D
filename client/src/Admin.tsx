import {useEffect,useState} from 'react';
type Status={paused:boolean;connected:number;classes:{classId:number;count:number;connected:number;average:number}[];rooms:{id:string;phase:string;round:number;players:{id:string;name:string;classId:number;connected:boolean;total:number}[]}[]};
export function Admin(){
 const [csrf,setCsrf]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState<Status|null>(null),[pending,setPending]=useState(false);
 async function request(path:string,options:RequestInit={}){
 const r=await fetch('/api/admin/'+path,{...options,headers:{'Content-Type':'application/json','x-csrf-token':csrf,...options.headers}});
 const data=await r.json();if(!r.ok){if(r.status===401){setCsrf('');setStatus(null);}throw Error(data.error||'요청에 실패했습니다.');}return data;
 }
 useEffect(()=>{fetch('/api/admin/session').then(r=>r.ok?r.json():null).then(d=>{if(d)setCsrf(d.csrf);}).catch(()=>setError('서버에 연결할 수 없습니다.'));},[]);
 useEffect(()=>{if(!csrf)return;let active=true;const load=()=>request('status').then(data=>{if(active)setStatus(data);}).catch(e=>{if(active)setError(e.message);});load();const timer=setInterval(load,2000);return()=>{active=false;clearInterval(timer);};},[csrf]);
 async function command(cmd:string){setPending(true);setError('');try{await request('control',{method:'POST',body:JSON.stringify({command:cmd})});setStatus(await request('status'));}catch(e){setError((e as Error).message);}finally{setPending(false);}}
 return <main className="admin-page"><header><a className="brand" href="/">✳ SCHOOL PARTY <span>TEACHER STUDIO</span></a><a href="/">학생 화면으로 ↗</a></header><div className="admin-heading"><small>TEACHER CONTROL ROOM</small><h1>우리 반의 모험을 함께 이끌어요.</h1><p>교사용 진행 관리 · 학생의 접속 상태와 게임 결과를 확인하세요.</p></div>
 {error&&<p className="error" role="alert">{error}</p>}
 {!csrf?<form className="admin-login" onSubmit={async e=>{e.preventDefault();setPending(true);setError('');try{const d=await request('login',{method:'POST',body:JSON.stringify({password})});setCsrf(d.csrf);setPassword('');}catch(e){setError((e as Error).message);}finally{setPending(false);}}}><span>교사 전용</span><h2>관리자 로그인</h2><p>서버에 설정한 관리자 비밀번호를 입력하세요.</p><label>비밀번호<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={pending}>로그인</button></form>:
 <><div className="admin-toolbar"><b>{status?.paused?'⏸ 일시정지 중':'● 진행 준비 / 운영 중'}</b><button disabled={pending} onClick={()=>command('start')}>대기 중인 모든 방 시작</button><button disabled={pending} onClick={()=>command(status?.paused?'resume':'pause')}>{status?.paused?'재개':'일시정지'}</button><button className="danger" disabled={pending} onClick={()=>{if(window.confirm('전체 경기를 종료하고 현재 점수로 결과를 발표할까요?'))command('end');}}>전체 종료 · 결과 발표</button><button disabled={pending} onClick={()=>command('reset')}>종료된 방 새 게임 대기</button><a href="/api/admin/results.csv">CSV 다운로드 ↓</a><button onClick={async()=>{try{await request('logout',{method:'POST'});setCsrf('');setStatus(null);}catch(e){setError((e as Error).message);}}}>로그아웃</button></div>
 <div className="admin-metrics"><article><small>현재 접속</small><strong>{status?.connected??0}<em>명</em></strong></article><article><small>전체 게임방</small><strong>{status?.rooms.length??0}<em>개</em></strong></article><article><small>참가 학급</small><strong>{status?.classes.filter(c=>c.count>0).length??0}<em>/ 8</em></strong></article></div>
 <h2>학급 현황</h2><p className="muted">현재 등록 참가자 평균입니다. 행사 확정 명단 기반 최종 학급 정산은 아직 지원하지 않습니다.</p>
 <div className="class-grid">{status?.classes.slice().sort((a,b)=>b.average-a.average).map(c=><article key={c.classId}><b>{c.classId}반</b><strong>{c.average.toFixed(1)}<small>평균 기여점수</small></strong><span>{c.connected}명 접속 / {c.count}명 등록</span></article>)}</div>
 <h2>게임방 현황</h2><div className="room-grid">{status?.rooms.map(r=><article key={r.id}><h3>ROOM {r.id} <small>{r.phase} · R{r.round}</small></h3>{r.players.map(p=><p key={p.id}><span>{p.connected?'🟢':'⚪'} {p.name} · {p.classId}반</span><b>{p.total}점</b></p>)}</article>)}</div></>}
 </main>;
}

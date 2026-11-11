import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import type {Express,Request,Response,NextFunction} from 'express';
export function installAuth(app:Express){
 const password=process.env.ADMIN_PASSWORD;
 if(password&&password.length<12)throw Error('ADMIN_PASSWORD must contain at least 12 characters');
 const salt=randomBytes(16),hash=password?scryptSync(password,salt,32):null;
 const sessions=new Map<string,{expires:number;csrf:string}>(),attempts=new Map<string,{count:number;until:number}>();
 const secure=process.env.NODE_ENV==='production';
 const cookie=(token:string,age:number)=>'island_admin='+token+'; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age='+age+(secure?'; Secure':'');
 const token=(req:Request)=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('island_admin='))?.slice(13);
 const lookup=(req:Request)=>{const t=token(req);const s=t?sessions.get(t):undefined;return s&&s.expires>Date.now()?s:undefined;};
 const originOK=(req:Request)=>{if(!req.headers.origin)return true;try{return new URL(req.headers.origin).host===req.headers.host;}catch{return false;}};
 const protect=(req:Request,res:Response,next:NextFunction)=>{
 const s=lookup(req);res.setHeader('Cache-Control','no-store');
 if(!s)return void res.status(401).json({error:'교사 로그인이 필요합니다.'});
 if(req.method!=='GET'&&(!originOK(req)||req.headers['x-csrf-token']!==s.csrf))return void res.status(403).json({error:'요청 검증에 실패했습니다. 다시 로그인해 주세요.'});
 next();
 };
 app.post('/api/admin/login',(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!originOK(req))return void res.status(403).json({error:'허용되지 않은 요청입니다.'});
 if(!hash)return void res.status(503).json({error:'관리자 비밀번호가 설정되지 않았습니다. 서버에서 npm run admin:setup을 실행해 주세요.'});
 const now=Date.now();
 for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
 const key=req.socket.remoteAddress||'unknown',limit=attempts.get(key)??{count:0,until:now+60000};
 if(limit.count>=5)return void res.status(429).json({error:'로그인 시도가 많습니다. 1분 후 다시 시도해 주세요.'});
 limit.count++;attempts.set(key,limit);
 const candidate=typeof req.body?.password==='string'?req.body.password:'';
 if(candidate.length>256||!timingSafeEqual(scryptSync(candidate,salt,32),hash))return void res.status(401).json({error:'비밀번호가 올바르지 않습니다.'});
 attempts.delete(key);
 for(const [k,v] of sessions)if(v.expires<now)sessions.delete(k);
 const old=token(req);if(old)sessions.delete(old);
 const id=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');
 sessions.set(id,{expires:now+8*3600000,csrf});res.setHeader('Set-Cookie',cookie(id,8*3600));res.json({csrf});
 });
 app.get('/api/admin/session',protect,(req,res)=>res.json({csrf:lookup(req)!.csrf}));
 app.post('/api/admin/logout',protect,(req,res)=>{sessions.delete(token(req)!);res.setHeader('Set-Cookie',cookie('',0));res.json({ok:true});});
 return protect;
}

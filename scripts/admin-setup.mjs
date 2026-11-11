import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env')){console.log('기존 .env를 유지했습니다. 해당 파일에 ADMIN_PASSWORD(12자 이상)를 설정하고 서버를 다시 시작하세요.');}
else{writeFileSync('.env','PORT=3001\nADMIN_PASSWORD='+randomBytes(24).toString('base64url')+'\n',{mode:0o600,flag:'wx'});console.log('관리자 비밀번호를 .env에 안전하게 생성했습니다. 로컬 편집기로 확인한 뒤 서버를 시작하세요. 파일을 Git에 올리지 마세요.');}

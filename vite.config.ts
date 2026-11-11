import {defineConfig} from 'vite';
export default defineConfig({
 root:'client',
 build:{outDir:'../dist',emptyOutDir:true},
 server:{
  fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/server/**','**/scripts/**']},
  proxy:{
   '/api':{target:'http://localhost:3001'},
   '/socket.io':{target:'http://localhost:3001',ws:true},
  },
 },
});

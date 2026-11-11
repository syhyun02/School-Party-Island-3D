import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'tests',timeout:100000,workers:1,
 use:{baseURL:'http://127.0.0.1:5173',viewport:{width:932,height:430},hasTouch:true,
 launchOptions:{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']}},
 webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:30000},
});

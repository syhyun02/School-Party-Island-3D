import {test,expect} from '@playwright/test';
import {gameNames,gameIds} from '../shared/minigames';
test('six live 3D games accept mobile/keyboard input and reach results',async({browser})=>{
 test.setTimeout(180000);
 const errors:string[]=[];
 const pages=[];
 for(const game of gameIds){
 const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('island-quality','low'));
 const page=await context.newPage();pages.push({page,context,game});
 page.on('pageerror',e=>errors.push(game+': '+e.message));
 await page.goto('http://127.0.0.1:5173');
 await page.getByRole('button',{name:'보리 선택',exact:true}).click();
 await page.getByPlaceholder('어떤 이름으로 떠날까요?').fill('검증-'+game);
 await page.getByRole('button',{name:'섬으로 출발하기'}).click();
 await page.getByRole('button',{name:gameNames[game],exact:true}).click();
 await expect(page.locator('.countdown-overlay')).toBeVisible();
 await expect(page.locator('.countdown-overlay')).toHaveCount(0,{timeout:10000});
 await expect(page.locator('.mini-instructions b')).toHaveText(gameNames[game]);
 await expect(page.locator('canvas')).toBeVisible();
 if(game!=='lighthouse'){
 const pad=page.getByLabel('이동 조이스틱'),box=(await pad.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();await page.mouse.move(box.x+box.width-10,box.y+box.height/2);
 await page.waitForTimeout(250);await page.mouse.up();
 await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');
 }
 if(game!=='meteor')await page.locator('.mini-action').tap();
 await page.screenshot({path:'test-results/'+game+'.png'});
 }
 await Promise.all(pages.map(async({page})=>{await expect(page.locator('.results-panel')).toBeVisible({timeout:70000});await expect(page.locator('.results-panel')).toContainText('1위');}));
 await pages[3].page.screenshot({path:'test-results/podium.png'});
 for(const {page,context} of pages){await page.getByRole('button',{name:'미니게임 선택으로'}).click();await expect(page.locator('.game-picker')).toBeVisible();await context.close();}
 expect(errors).toEqual([]);
});

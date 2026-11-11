import {test} from 'node:test';import assert from 'node:assert/strict';import {land,tiles} from './game.js';
test('32 tiles and required distribution',()=>{assert.equal(tiles.length,32);assert.equal(tiles.filter(t=>t==='coin').length,10);});
test('star purchase is bounded by balance',()=>{const pos=tiles.indexOf('star');const p={position:pos-1,coins:20,stars:0};land(p,1);assert.equal(p.stars,1);assert.equal(p.coins,0);});
test('board wraps',()=>{const p={position:31,coins:0,stars:0};land(p,2);assert.equal(p.position,1);assert.ok(p.coins>=0);});

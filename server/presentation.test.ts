import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validAvatar,movePosition,moveDuration,moveLabel,type MoveEvent} from '../shared/presentation.js';
import {makeQuiz,answerQuiz} from './quiz.js';
import {createMini} from './minigames.js';
const move:MoveEvent={id:'one',at:1000,from:30,to:4,dice:6,tile:'coin',coins:5,stars:0};
test('move animation waits for dice, follows all six steps through wrapping and clamps',()=>{
 assert.equal(movePosition(move,900),30);
 assert.equal(movePosition(move,1699),30);
 assert.equal(movePosition(move,1950),31);
 assert.equal(moveDuration(move),2200);
 assert.equal(movePosition(move,3200)%32,4);
 assert.equal(movePosition(move,100000),36);
 assert.match(moveLabel(move),/코인 \+5/);
});
test('invalid avatar identifiers cannot escape the allowed roster',()=>{
 for(const value of [-1,4,1.1,'1',null,undefined,NaN,Infinity,{}])assert.equal(validAvatar(value),false);
 assert.equal(validAvatar(0),true);assert.equal(validAvatar(3),true);
 const m=createMini('kart',['a','b'],undefined,[3,99]);assert.deepEqual(m.actors.map(a=>a.avatar),[3,1]);
});
test('quiz answer clock starts only after arrival, with a full 20-second window',()=>{
 const q=makeQuiz(1000,false,2200);
 assert.equal(q.expires-q.opens,20000);
 assert.equal(answerQuiz(q,q.nonce,q.question.answer,3199),null);
 assert.equal(answerQuiz(q,q.nonce,q.question.answer,3200)?.points,10);
});
test('star purchase and insufficient balance have different arrival messages',()=>{
 assert.match(moveLabel({...move,tile:'star',coins:-20,stars:1}),/별 \+1/);
 assert.match(moveLabel({...move,tile:'star',coins:0,stars:0}),/20개/);
});

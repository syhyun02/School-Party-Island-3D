import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeQuiz,publicQuiz,answerQuiz,questions} from './quiz.js';
test('quiz public payload contains no answer, fact or private question ID',()=>{
 const q=makeQuiz(1000),view=publicQuiz(q);
 assert.equal(view.options.length,4);assert.equal('answer' in view,false);assert.equal('fact' in view,false);
 assert.equal(new Set(questions.map(q=>q.topic)).size,5);
});
test('correct board answer grants exactly 10 points once',()=>{
 const q=makeQuiz(1000);
 assert.equal(answerQuiz(q,q.nonce,99,1200),null);
 assert.equal(answerQuiz(q,'forged',q.question.answer,1200),null);
 const result=answerQuiz(q,q.nonce,q.question.answer,1200)!;
 assert.equal(result.points,10);assert.ok(result.fact);assert.equal(answerQuiz(q,q.nonce,q.question.answer,1300),null);
});
test('practice, wrong answers and expired answers cannot grant points',()=>{
 const practice=makeQuiz(1000,true);assert.equal(answerQuiz(practice,practice.nonce,practice.question.answer,2000)?.points,0);
 const wrong=makeQuiz(1000);assert.equal(answerQuiz(wrong,wrong.nonce,(wrong.question.answer+1)%4,2000)?.points,0);
 const expired=makeQuiz(1000);assert.equal(answerQuiz(expired,expired.nonce,expired.question.answer,21000),null);
});

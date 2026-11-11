import {readFileSync} from 'node:fs';
import {randomInt,randomUUID} from 'node:crypto';
export type Question={id:string;topic:string;question:string;options:string[];answer:number;fact:string};
export const questions:Question[]=JSON.parse(readFileSync(new URL('./content/quizzes.json',import.meta.url),'utf8'));
if(!questions.length||new Set(questions.map(q=>q.id)).size!==questions.length||questions.some(q=>!q.id||!q.question||!q.topic||!q.fact||q.options.length!==4||q.options.some(o=>typeof o!=='string')||!Number.isInteger(q.answer)||q.answer<0||q.answer>3))throw Error('Invalid quiz content');
export type Quiz={nonce:string;question:Question;opens:number;expires:number;practice:boolean;answered:boolean};
export function makeQuiz(now:number,practice=false,delay=0):Quiz{return {nonce:randomUUID(),question:questions[randomInt(questions.length)],opens:now+delay,expires:now+delay+20000,practice,answered:false};}
export function publicQuiz(q:Quiz){return {nonce:q.nonce,topic:q.question.topic,question:q.question.question,options:q.question.options,opens:q.opens,expires:q.expires,practice:q.practice};}
export function answerQuiz(q:Quiz,nonce:unknown,choice:unknown,now:number){
 if(now<q.opens||q.answered||q.nonce!==nonce||now>=q.expires||!Number.isInteger(choice)||(choice as number)<0||(choice as number)>3)return null;
 q.answered=true;const correct=choice===q.question.answer;
 return {correct,answer:q.question.answer,fact:q.question.fact,points:correct&&!q.practice?10:0};
}

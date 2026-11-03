/** TEST-ONLY: silence fixture, NOT the user's four recordings, NOT audio acceptance.
 * This QA branch has no Pages/deploy job and must never be merged into main.
 * Native synthesized care oscillator output is not intercepted or mocked.
 */
import {test as base,expect} from '@playwright/test';
function silence(){const samples=8000,bytes=Buffer.alloc(44+samples*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(8000,24);bytes.writeUInt32LE(16000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples*2,40);return bytes;}
export const test=base.extend({context:async({context},use)=>{await context.route('**/audio/*.wav',route=>route.fulfill({status:200,contentType:'audio/wav',body:silence()}));await use(context);}});
export {expect};

export {devices} from "@playwright/test";

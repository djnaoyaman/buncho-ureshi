import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('published tour bytes exactly match the approved corrected Library film, without re-encoding',async()=>{const bytes=await readFile(new URL('../public/game-endings/buncho-ending-01-rich-final-review.mp4',import.meta.url));assert.equal(bytes.length,11051207);assert.equal(createHash('sha256').update(bytes).digest('hex'),'b32329f433baeb466c4b592ed998c81f3502880cc3cbecc7b058bfb01f09a2b4');});

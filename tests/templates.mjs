import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness} from './support/harness.mjs';
test('template data and public constants remain stable',()=>{
 const {FF}=createHarness();
 assert.equal(FF.TEMPLATES.length,7);
 assert.equal(FF.Validation.FIELD_TYPES.size,22);
 assert.equal(FF.MAX_HISTORY,50);
 assert.equal(FF.AUTOSAVE_DELAY,2000);
 assert.deepEqual(Array.from(FF.ZOOM_LEVELS),[75,100,125]);
});

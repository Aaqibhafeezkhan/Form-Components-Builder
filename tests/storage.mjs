import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness} from './support/harness.mjs';
test('generateId returns unique UUID v4 values',()=>{
 const {FF}=createHarness(); const ids=Array.from({length:1000},()=>FF.Storage.generateId());
 assert.equal(new Set(ids).size,1000);
 assert.ok(ids.every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)));
});

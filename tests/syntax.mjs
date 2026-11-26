import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {sourceRoot} from './support/harness.mjs';
test('all source JavaScript files parse',()=>{
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
 for(const file of walk(path.join(sourceRoot(),'src')).filter(file=>file.endsWith('.js'))) assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(file,'utf8'),{filename:file}));
});

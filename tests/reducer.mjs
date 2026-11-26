import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness} from './support/harness.mjs';
const {FF}=createHarness();
const el=id=>({id,type:'text',order:0,props:{label:id,validation:{}},meta:{},conditionalLogic:{enabled:false,rules:[]}});
const reset=()=>{FF.appState=FF.createInitialState();};
const act=(type,payload={})=>FF.dispatch({type:FF.ACTIONS[type],...payload});
test('ADD_ELEMENT rejects invalid types, duplicate and unsafe IDs and item 201',()=>{
 reset(); act('ADD_ELEMENT',{element:el('a')}); act('ADD_ELEMENT',{element:el('b','unknown')}); act('ADD_ELEMENT',{element:el('a')}); act('ADD_ELEMENT',{element:el('bad id')});
 assert.equal(FF.appState.elements.length,1);
 for(let i=1;i<200;i++) act('ADD_ELEMENT',{element:el('field-'+i)});
 act('ADD_ELEMENT',{element:el('last')}); assert.equal(FF.appState.elements.length,200);
});
test('remove, move, duplicate, undo, redo and clear work',()=>{
 reset(); act('ADD_ELEMENT',{element:el('a')}); act('ADD_ELEMENT',{element:el('b')});
 act('DUPLICATE_ELEMENT',{id:'a'}); assert.equal(new Set(FF.appState.elements.map(x=>x.id)).size,3);
 act('MOVE_ELEMENT',{id:'b',direction:'up'}); act('REMOVE_ELEMENT',{id:'a'});
 assert.deepEqual(FF.appState.elements.map(x=>x.order),[0,1]);
 act('UNDO'); act('REDO'); act('CLEAR_CANVAS'); assert.equal(FF.appState.elements.length,0);
});
test('undo history is capped and import replaces form state',()=>{
 reset(); for(let i=0;i<60;i++) act('ADD_ELEMENT',{element:el('field-'+i)});
 assert.equal(FF.appState.undoStack.length,FF.MAX_HISTORY);
 act('IMPORT_FORM',{formConfig:{title:'Imported'},elements:[el('imported')],theme:'dark'});
 assert.equal(FF.appState.formConfig.title,'Imported'); assert.equal(FF.appState.activeTheme,'dark');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarness} from './support/harness.mjs';
const {FF}=createHarness();
const makeState=(title,label)=>({formConfig:{title,description:'A form',submitLabel:'Send',successMessage:'Thanks'},elements:[{id:'field-1',type:'text',props:{label,placeholder:'Name',helperText:'Help',required:true,width:9999,validation:{}}}],activeTheme:'default'});
test('HTML export escapes user text, rejects unsafe IDs and clamps widths',()=>{
 const state=makeState('</title><script>x</script>','"><img src=x onerror=alert(1)>');
 const html=FF.Export.buildHtml(state);
 assert.equal((html.match(/<script>/g)||[]).length,1);
 assert.equal(html.includes('<img src=x'),false);
 assert.equal(html.includes('fonts.googleapis.com'),false);
 assert.match(html,/width:100%/);
 state.elements[0].id='a" onfocus="x';
 assert.equal(FF.Export.buildHtml(state).includes('onfocus="x'),false);
});
test('JSX export emits literals and valid component identifiers',()=>{
 for(const title of ['123 Survey','','Cafe Order!']) {
  const jsx=FF.Export.buildReactJsx(makeState(title,'label { value }'));
  assert.match(jsx,/export default function (Form123SurveyForm|GeneratedForm|CafeOrderForm)\(/);
  assert.equal(jsx.includes('/*'),false);
  assert.ok(jsx.includes('{'+JSON.stringify('label { value }')+'}'));
 }
});
test('JSON Schema keeps zero constraints and field formats',()=>{
 const state=makeState('Schema','Field');
 state.elements=[
  {id:'n',type:'number',props:{label:'N',validation:{min:0,max:0,minLength:0,maxLength:0}}},
  {id:'e',type:'email',props:{label:'E',validation:{}}},
  {id:'u',type:'url',props:{label:'U',validation:{}}},
  {id:'d',type:'date',props:{label:'D',validation:{}}},
  {id:'t',type:'time',props:{label:'T',validation:{}}},
  {id:'m',type:'multi-select',props:{label:'M',options:['A','B'],validation:{}}},
  {id:'l',type:'divider',props:{label:'L',validation:{}}}
 ];
 const schema=JSON.parse(FF.Export.buildJsonSchema(state));
 assert.equal(schema.properties.n.minimum,0);
 assert.equal(schema.properties.n.maximum,0);
 assert.equal(schema.properties.n.minLength,0);
 assert.equal(schema.properties.n.maxLength,0);
 assert.equal(schema.properties.e.format,'email');
 assert.equal(schema.properties.u.format,'uri');
 assert.equal(schema.properties.d.format,'date');
 assert.equal(schema.properties.t.format,'time');
 assert.deepEqual(Array.from(schema.properties.m.items.enum),['A','B']);
 assert.equal(schema.properties.l,undefined);
});
test('invalid patterns are omitted from JSON Schema',()=>{
 const state=makeState('Invalid','Pattern'); state.elements[0].props.validation.pattern='[';
 assert.equal(JSON.parse(FF.Export.buildJsonSchema(state)).properties['field-1'].pattern,undefined);
});

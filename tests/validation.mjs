import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHarness,sourceRoot} from './support/harness.mjs';
const {FF}=createHarness();
const data=()=>({formConfig:{title:'Form',description:'',submitLabel:'Send',successMessage:'Thanks',pages:[],customCss:''},elements:[{id:'field-1',type:'text',props:{label:'Name',placeholder:'',helperText:'',options:[],validation:{pattern:'^[A-Z]+$'}},conditionalLogic:{enabled:true,rules:[{field:'field-2',operator:'equals',value:'yes'}]}}]});
test('dangerous own keys are rejected recursively',()=>{
 const value=data(); Object.defineProperty(value.elements[0].props,'__proto__',{value:{polluted:true},enumerable:true});
 assert.equal(FF.Validation.validateImport(value).valid,false);
});
test('strict limits reject large text while non-strict mode stays compatible',()=>{
 const value=data(); value.elements[0].props.label='x'.repeat(501);
 assert.equal(FF.Validation.validateImport(value).valid,true);
 assert.equal(FF.Validation.validateImport(value,{strict:true}).valid,false);
});
test('pattern validation and tester limits are enforced',()=>{
 const field={type:'text',props:{label:'Name',validation:{pattern:'^[A-Z]+$'}}};
 assert.equal(FF.Validation.validateField(field,'HELLO').valid,true);
 assert.equal(FF.Validation.validateField(field,'Hello').valid,false);
 assert.match(FF.Validation.testRegex('x'.repeat(201),'x').error,/200/);
 assert.match(FF.Validation.testRegex('x','x'.repeat(2001)).error,/2,000/);
});
test('custom CSS policy allows basic rules and rejects risky constructs',()=>{
 assert.equal(FF.Safe.checkCustomCss('body { color: red; }').ok,true);
 for(const css of ['@import "x";','a { background: url(x); }','a { width: expression(x); }','a { content: "x\\y"; }','x'.repeat(20001)]) assert.equal(FF.Safe.checkCustomCss(css).ok,false);
});
test('sample form passes strict import and all exporters',()=>{
 const sample=JSON.parse(fs.readFileSync(sourceRoot()+'/sample-contact-form.json','utf8'));
 const check=FF.Validation.validateImport(sample,{strict:true});
 assert.equal(check.valid,true,JSON.stringify(check.errors));
 const state={formConfig:sample.formConfig,elements:sample.elements,activeTheme:sample.activeTheme};
 assert.doesNotThrow(()=>FF.Export.buildFormJson(state));
 assert.doesNotThrow(()=>FF.Export.buildHtml(state));
 assert.doesNotThrow(()=>FF.Export.buildReactJsx(state));
 assert.doesNotThrow(()=>FF.Export.buildJsonSchema(state));
});

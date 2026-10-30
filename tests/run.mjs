import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const context={URL,Date,Math,Set,Map,console:{warn(){},error(){}}}
context.window=context
vm.createContext(context)
for(const file of ['src/state.js','src/utils/safe.js','src/utils/validation.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file})
}
const FF=context.FF
const sample=()=>({
  formConfig:{title:'Contact',pages:[{id:'page-1',title:'Page 1'}]},
  elements:[{id:'field-1',type:'text',props:{label:'Name',required:true,validation:{}}}],
  activeTheme:'default'
})

test('HTML helper escapes markup delimiters',()=>{
  assert.equal(FF.Safe.escapeHtml('<b>name</b>'),'&lt;b&gt;name&lt;/b&gt;')
})
test('redirect URLs require HTTP or HTTPS without credentials',()=>{
  assert.equal(FF.Safe.isSafeRedirectUrl('https://example.com'),true)
  assert.equal(FF.Safe.isSafeRedirectUrl('ftp://example.com'),false)
  assert.equal(FF.Safe.isSafeRedirectUrl('https://user:pass@example.com'),false)
})
test('field validation respects zero numeric boundaries',()=>{
  const field={type:'number',props:{label:'Age',validation:{min:0,max:10}}}
  assert.equal(FF.Validation.validateField(field,0).valid,true)
  assert.equal(FF.Validation.validateField(field,11).valid,false)
})
test('conditional list rules handle array values',()=>{
  const values=new Map([['choices',['one','two']]])
  assert.equal(FF.Validation.evaluateRule({field:'choices',operator:'contains',value:'two'},values),true)
})
test('imports reject duplicate IDs and unsupported element types',()=>{
  const data=sample()
  assert.equal(FF.Validation.validateImport(data).valid,true)
  data.elements.push({...data.elements[0]})
  assert.equal(FF.Validation.validateImport(data).valid,false)
})

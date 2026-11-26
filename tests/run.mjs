import test from 'node:test'
import assert from 'node:assert/strict'
import {createHarness} from './support/harness.mjs'
const {FF,stored}=createHarness()
const sample=()=>({formConfig:{title:'Contact',pages:[{id:'page-1',title:'Page 1'}]},elements:[{id:'field-1',type:'text',props:{label:'Name',required:true,validation:{}}}],activeTheme:'default'})
test('HTML helper escapes markup delimiters',()=>{assert.equal(FF.Safe.escapeHtml('<b>name</b>'),'&lt;b&gt;name&lt;/b&gt;')})
test('redirect URLs require HTTP or HTTPS without credentials',()=>{assert.equal(FF.Safe.isSafeRedirectUrl('https://example.com'),true);assert.equal(FF.Safe.isSafeRedirectUrl('ftp://example.com'),false);assert.equal(FF.Safe.isSafeRedirectUrl('https://user:pass@example.com'),false)})
test('field validation respects zero numeric boundaries',()=>{const field={type:'number',props:{label:'Age',validation:{min:0,max:10}}};assert.equal(FF.Validation.validateField(field,0).valid,true);assert.equal(FF.Validation.validateField(field,11).valid,false)})
test('conditional list rules handle array values',()=>{const values=new Map([['choices',['one','two']]]);assert.equal(FF.Validation.evaluateRule({field:'choices',operator:'contains',value:'two'},values),true)})
test('imports reject duplicate IDs and unsupported element types',()=>{const data=sample();assert.equal(FF.Validation.validateImport(data).valid,true);data.elements.push({...data.elements[0]});assert.equal(FF.Validation.validateImport(data).valid,false)})
test('versioned storage round-trips valid data',()=>{stored.clear();assert.equal(FF.Storage.getLoadStatus(),'empty');assert.equal(FF.Storage.save(sample()),true);const loaded=FF.Storage.load();assert.equal(loaded.formConfig.title,'Contact');assert.equal(FF.Storage.getLoadStatus(),'loaded')})
test('malformed storage is preserved and blocks autosave overwrite',()=>{stored.set('formforge_enterprise_v1','{broken');assert.equal(FF.Storage.load(),null);assert.equal(FF.Storage.getLoadStatus(),'invalid');assert.equal(FF.Storage.save(sample()),false);assert.equal(stored.get('formforge_enterprise_v1'),'{broken')})
test('unknown future storage versions are preserved',()=>{const future=JSON.stringify({version:'99.0',data:sample()});stored.set('formforge_enterprise_v1',future);assert.equal(FF.Storage.load(),null);assert.equal(FF.Storage.getLoadStatus(),'unsupported');assert.equal(FF.Storage.save(sample()),false);assert.equal(stored.get('formforge_enterprise_v1'),future)})

test('legacy unversioned storage payloads migrate without losing settings',()=>{
  const legacy={formConfig:{title:'Legacy form'},elements:[{id:'legacy-field',type:'text',props:{label:'Name'}}],activeTheme:'unknown-theme'};
  stored.set('formforge_enterprise_v1',JSON.stringify(legacy));
  const loaded=FF.Storage.load();
  assert.equal(loaded.formConfig.title,'Legacy form');
  assert.equal(loaded.formConfig.submitLabel,'Submit');
  assert.equal(loaded.activeTheme,'default');
  assert.equal(FF.Storage.getLoadStatus(),'migrated');
  assert.equal(FF.Storage.save(loaded),true);
  assert.equal(JSON.parse(stored.get('formforge_enterprise_v1')).version,FF.SCHEMA_VERSION);
});
test('invalid legacy storage is preserved and blocks autosave',()=>{
  const legacy={formConfig:{title:'Broken'},elements:[{id:'bad id',type:'text',props:{}}]};
  stored.set('formforge_enterprise_v1',JSON.stringify(legacy));
  assert.equal(FF.Storage.load(),null);
  assert.equal(FF.Storage.getLoadStatus(),'invalid');
  assert.equal(FF.Storage.save(sample()),false);
  assert.equal(JSON.parse(stored.get('formforge_enterprise_v1')).elements[0].id,'bad id');
});
test('reducer does not record invalid reorder operations',()=>{
  FF.appState=FF.createInitialState();
  FF.dispatch({type:FF.ACTIONS.ADD_ELEMENT,element:{id:'one',type:'text',props:{label:'One'}}});
  FF.dispatch({type:FF.ACTIONS.ADD_ELEMENT,element:{id:'two',type:'text',props:{label:'Two'}}});
  const before=FF.appState.undoStack.length;
  FF.dispatch({type:FF.ACTIONS.REORDER_ELEMENTS,fromIndex:9,toIndex:0});
  assert.equal(FF.appState.undoStack.length,before);
  FF.dispatch({type:FF.ACTIONS.REORDER_ELEMENTS,fromIndex:0,toIndex:1});
  assert.equal(Array.from(FF.appState.elements,item=>item.id).join(','),'two,one');
  assert.equal(Array.from(FF.appState.elements,item=>item.order).join(','),'0,1');
});
test('reducer filters stale selections and restores selection across undo and redo',()=>{
  FF.appState=FF.createInitialState();
  FF.dispatch({type:FF.ACTIONS.ADD_ELEMENT,element:{id:'one',type:'text',props:{label:'One'}}});
  FF.dispatch({type:FF.ACTIONS.ADD_ELEMENT,element:{id:'two',type:'text',props:{label:'Two'}}});
  FF.dispatch({type:FF.ACTIONS.MULTI_SELECT,id:'one'});
  FF.dispatch({type:FF.ACTIONS.MULTI_SELECT,id:'missing'});
  assert.equal([...FF.appState.multiSelectedIds].join(','),'one');
  FF.dispatch({type:FF.ACTIONS.REMOVE_ELEMENT,id:'one'});
  assert.equal(FF.appState.multiSelectedIds.has('one'),false);
  FF.dispatch({type:FF.ACTIONS.UNDO});
  assert.equal(FF.appState.elements.some(item=>item.id==='one'),true);
  assert.equal(FF.appState.multiSelectedIds.has('one'),true);
  FF.dispatch({type:FF.ACTIONS.REDO});
  assert.equal(FF.appState.elements.some(item=>item.id==='one'),false);
  assert.equal([...FF.appState.multiSelectedIds].some(id=>!FF.appState.elements.some(item=>item.id===id)),false);
});
test('bulk delete ignores stale IDs and clears selection',()=>{
  FF.appState=FF.createInitialState();
  FF.dispatch({type:FF.ACTIONS.ADD_ELEMENT,element:{id:'one',type:'text',props:{label:'One'}}});
  FF.dispatch({type:FF.ACTIONS.BULK_DELETE,ids:['one','missing']});
  assert.equal(FF.appState.elements.length,0);
  assert.equal(FF.appState.multiSelectedIds.size,0);
});
test('history remains bounded and a new edit clears redo history',()=>{
  FF.appState=FF.createInitialState();
  for(let i=0;i<FF.MAX_HISTORY+5;i++) FF.dispatch({type:FF.ACTIONS.UPDATE_FORM_CONFIG,config:{title:'Form '+i}});
  assert.equal(FF.appState.undoStack.length,FF.MAX_HISTORY);
  FF.dispatch({type:FF.ACTIONS.UNDO});
  assert.equal(FF.appState.redoStack.length,1);
  FF.dispatch({type:FF.ACTIONS.UPDATE_FORM_CONFIG,config:{description:'new branch'}});
  assert.equal(FF.appState.redoStack.length,0);
});

test('invalid regular expressions fail field validation',()=>{
  const field={type:'text',props:{label:'Code',validation:{pattern:'['}}};
  assert.equal(FF.Validation.validateField(field,'abc').valid,false);
});
test('strict import validation rejects conditional rules with unknown field references',()=>{
  const data=sample();
  data.elements[0].conditionalLogic={enabled:true,rules:[{field:'missing',operator:'equals',value:'x'}]};
  assert.equal(FF.Validation.validateImport(data,{strict:true}).valid,false);
});
test('generated HTML escapes untrusted labels and options',()=>{
  const data=sample();
  data.elements[0].props.label='<img src=x onerror=alert(1)>';
  data.elements[0].props.options=['<script>alert(1)</script>'];
  const html=FF.Export.buildHtml({formConfig:data.formConfig,elements:data.elements});
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html,/<img src=x onerror=/);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
});
test('strict import validation rejects invalid field constraints',()=>{
  const data=sample();
  data.elements[0].props.validation={minLength:-1};
  assert.equal(FF.Validation.validateImport(data,{strict:true}).valid,false);
});

test('bulk duplicate creates unique ordered copies and selects only the copies',()=>{
  FF.appState=FF.createInitialState();
  for(const id of ['one','two','three']) FF.dispatch({type:FF.ACTIONS.ADD_ELEMENT,element:{id,type:'text',props:{label:id}}});
  FF.dispatch({type:FF.ACTIONS.MULTI_SELECT,id:'one'});
  FF.dispatch({type:FF.ACTIONS.MULTI_SELECT,id:'three'});
  FF.dispatch({type:FF.ACTIONS.BULK_DUPLICATE});
  assert.equal(FF.appState.elements.length,5);
  assert.equal(FF.appState.elements.map(item=>item.order).join(','),'0,1,2,3,4');
  assert.equal(new Set(FF.appState.elements.map(item=>item.id)).size,5);
  assert.equal(FF.appState.multiSelectedIds.size,2);
  assert.equal([...FF.appState.multiSelectedIds].every(id=>FF.appState.elements.some(item=>item.id===id&&item.props.label.endsWith('(Copy)'))),true);
});
test('bulk move preserves selected order and blocks moves beyond canvas edges',()=>{
  FF.appState=FF.createInitialState();
  for(const id of ['one','two','three','four']) FF.dispatch({type:FF.ACTIONS.ADD_ELEMENT,element:{id,type:'text',props:{label:id}}});
  FF.dispatch({type:FF.ACTIONS.MULTI_SELECT,id:'two'});
  FF.dispatch({type:FF.ACTIONS.MULTI_SELECT,id:'three'});
  FF.dispatch({type:FF.ACTIONS.BULK_MOVE,direction:'down'});
  assert.equal(FF.appState.elements.map(item=>item.id).join(','),'one,four,two,three');
  assert.equal([...FF.appState.multiSelectedIds].sort().join(','),'three,two');
  FF.dispatch({type:FF.ACTIONS.BULK_MOVE,direction:'down'});
  assert.equal(FF.appState.elements.map(item=>item.id).join(','),'one,four,two,three');
});

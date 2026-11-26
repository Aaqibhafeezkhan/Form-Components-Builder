import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export function createHarness(){
 const stored=new Map();
 const localStorage={getItem:key=>stored.has(key)?stored.get(key):null,setItem:(key,value)=>stored.set(key,String(value)),removeItem:key=>stored.delete(key)};
 const context={URL,Date,Math,Set,Map,WeakSet,Uint8Array,crypto:webcrypto,localStorage,console:{warn(){},error(){},log(){}}};
 context.window=context; vm.createContext(context);
 for(const file of ['src/eventBus.js','src/state.js','src/utils/safe.js','src/utils/storage.js','src/utils/validation.js','src/utils/dragDrop.js','src/utils/export.js','src/reducer.js','src/templates.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 return {FF:context.FF,context,stored};
}
export function sourceRoot(){return root;}

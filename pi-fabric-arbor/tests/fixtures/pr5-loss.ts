// Test-only fault at the public managed context seam, after actual native spawn acceptance.
export function lossFixture(app: string, trace: string): string {
  return `import { appendFileSync } from 'node:fs';
import { FABRIC_COMPONENT_REGISTER_EVENT, FABRIC_PROVIDER_REGISTER_EVENT, FABRIC_PROVIDER_DISCOVER_EVENT } from 'pi-fabric/protocol';
import { createArborComponent } from ${JSON.stringify(app + '/src/managed/definitions.ts')};
export default function fixture(pi) {
 const component = createArborComponent(), activate = component.activate;
 component.activate = (context, config) => activate({...context, use(def, opts) {
  const ownerActivate = def.activate;
  return context.use({...def, activate(ownerContext, ownerConfig) {
   return ownerActivate({...ownerContext, async call(ref, args) {
    const reply = await ownerContext.call(ref, args);
    if (ref === 'agents.spawn') {
     appendFileSync(${JSON.stringify(trace)}, JSON.stringify({event:'material.spawn-reply-lost',data:reply})+'\\n');
     throw new Error('Deterministic accepted evaluator spawn reply lost');
    }
    return reply;
   }}, ownerConfig);
  }}, opts);
 }}, config);
 const provider = {name:'pr5fixture', async list(){return [{name:'arm',description:'Test-only accepted native reply loss',risk:'write',inputSchema:{type:'object',properties:{},additionalProperties:false}}]},async describe(){return (await this.list())[0]},async invoke(){pi.events.emit(FABRIC_COMPONENT_REGISTER_EVENT,{version:1,component,overwrite:true});return {armed:true}}};
 pi.events.emit(FABRIC_PROVIDER_REGISTER_EVENT,{version:1,provider,overwrite:true});
 pi.events.on(FABRIC_PROVIDER_DISCOVER_EVENT,e=>e.register(provider,{overwrite:true}));
}`;
}

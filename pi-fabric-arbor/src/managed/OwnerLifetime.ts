import type {FabricActionDescriptor,FabricComponentDefinition,FabricInvocationContext,FabricProvider,FabricProviderListRequest} from 'pi-fabric/protocol';

export const OWNER_LIFETIME_PROVIDER = 'arbor_lifetime';
export const OWNER_LIFETIME_REF = 'arbor_lifetime.lease';
export const OWNER_LIFETIME_ACTION:FabricActionDescriptor = {
  name:'lease',description:'Scoped owner-generation teardown obligation; acquisition only',
  inputSchema:{type:'object',properties:{},additionalProperties:false},outputSchema:{type:'null'},
  risk:'agent',effect:{kind:'scoped',resources:['arbor:owner:lifetime'],ordering:'ordered'},
};

/** One generation-local lease, never a native execution transport. A new owner
 * cannot borrow an old guard's active status: it must own the acquired lease.
 * Releasing a lease retires admission permanently, including failed cleanup. */
export class OwnerLifetime implements FabricProvider {
  readonly name = OWNER_LIFETIME_PROVIDER;
  readonly description = 'Discoverable internal Arbor owner lifetime retention';
  #acquired=false;
  #retired=false;
  #closed=false;
  #disposal:Promise<void>|undefined;
  constructor(private readonly drain:()=>Promise<void>,private readonly guardReady:()=>boolean){}

  assertReady():void {
    if(!this.#acquired||this.#retired||this.#closed||!this.guardReady())throw new Error('Arbor owner lifetime guard is not active for this generation; no operation admitted');
  }
  dispose():Promise<void> {
    this.#retired=true;
    // Begin the existing service's admission fence synchronously. Cache even a
    // synchronous throw as one rejected promise; never revive a failed drain.
    return this.#disposal??=(async()=>{await this.drain();})();
  }
  async list(_request:FabricProviderListRequest,_context:FabricInvocationContext){return [structuredClone(OWNER_LIFETIME_ACTION)];}
  async describe(name:string,_context:FabricInvocationContext){return name==='lease'?structuredClone(OWNER_LIFETIME_ACTION):undefined;}
  async invoke(_name:string,_args:Record<string,unknown>,_context:FabricInvocationContext):Promise<never>{throw new Error('Owner lifetime requires scoped acquisition, not an ordinary action');}
  async acquire(name:string,args:Record<string,unknown>,_context:FabricInvocationContext){
    if(name!=='lease'||Object.keys(args).length)throw new Error('Invalid owner lifetime acquisition');
    if(this.#closed||this.#retired||this.#acquired)throw new Error('Owner lifetime unavailable; reload the complete Arbor application');
    this.#acquired=true;
    return {value:null,dispose:()=>this.dispose()};
  }
  // No supporting storage belongs to this provider. arbor.close owns it.
  async close(){this.#closed=true;}
}

/** Declared dependency forces activation after the owner. Parent teardown and
 * whole-Pi reverse activation release this sibling before owner-context abort.
 * No child readiness wait, native dispatch, service bridge, or extra actor. */
export function createOwnerDrainComponent():FabricComponentDefinition {
  return {name:'arbor.drain',description:'Scoped owner teardown guard',guarantee:'managed',
    requires:[OWNER_LIFETIME_REF],provides:[],
    async activate(context){await context.acquire(OWNER_LIFETIME_REF,{});},
  };
}

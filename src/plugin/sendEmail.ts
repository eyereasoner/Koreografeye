import * as N3 from 'n3';
import { rdfTransformStore , type IPolicyType} from '../util';

export async function policyTarget(mainStore: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {
    const rdf = await rdfTransformStore(policyStore,'text/turtle');
    console.log(JSON.stringify(policy,null,4));
    //console.log(rdf);
    //console.log(policyStore);
    return true;
}
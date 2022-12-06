import * as N3 from 'n3';
import { rdfTransformStore , jsonldStrFrame , type IPolicyType} from '../util';

export async function policyTarget(mainStore: N3.Store, _: N3.Store, policy: IPolicyType) : Promise<boolean> {
    const rdf = await rdfTransformStore(mainStore,'application/ld+json');
    console.log(JSON.stringify(policy,null,4));
    const json = await jsonldStrFrame(
            rdf
            , { 
                "@context": "https://www.w3.org/ns/activitystreams",
                "@id": "http://example.org/urn:uuid:42D2F3DC-0770-4F47-BF37-4F01E0382E32" 
            }
    );
    console.log(JSON.stringify(json, null, 4));
    return true;
}
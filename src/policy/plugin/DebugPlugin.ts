import * as N3 from 'n3';
import { rdfTransformStore , jsonldStrFrame } from '../../util';
import { PolicyPlugin , type IPolicyType } from '../PolicyPlugin';

export class DebugPlugin extends PolicyPlugin {

    public async execute (mainStore: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {
        console.log('***Policy***');
        console.log(JSON.stringify(policy,null,4));
    
        console.info('***Main Store***');
        const mainRdf = await rdfTransformStore(mainStore,'application/ld+json');
        const json = await jsonldStrFrame(
            mainRdf
            , { 
                "@context": "https://www.w3.org/ns/activitystreams",
                "@id": policy['mainSubject']
            }
        );
        console.log(JSON.stringify(json, null, 4));

        console.log('***Policy Store***');

        const policyRdf = await rdfTransformStore(policyStore,'text/turtle');
        console.log(policyRdf);

        return true;
    }
}
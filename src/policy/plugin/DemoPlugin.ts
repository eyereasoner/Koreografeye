import * as N3 from 'n3';
import { rdfTransformStore , jsonldStrFrame } from '../../util';
import { PolicyPlugin , type IPolicyType } from '../PolicyPlugin';

export class DemoPlugin extends PolicyPlugin {

    public async execute (mainStore: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {
        this.logger.log('***Policy***');
        this.logger.log(JSON.stringify(policy,null,4));
    
        this.logger.log('***Main Store***');
        const mainRdf = await rdfTransformStore(mainStore,'application/ld+json');
        const json = await jsonldStrFrame(
            mainRdf
            , { 
                "@context": "https://www.w3.org/ns/activitystreams",
                "@id": policy['mainSubject']
            }
        );
        this.logger.log(JSON.stringify(json, null, 4));

        this.logger.log('***Policy Store***');
        const policyRdf = await rdfTransformStore(policyStore,'text/turtle');
        this.logger.log(policyRdf);

        return true;
    }
}
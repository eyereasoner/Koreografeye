import * as N3 from 'n3';
import { PolicyPlugin , type IPolicyType } from '../PolicyPlugin';

export class DemoPlugin extends PolicyPlugin {

    public async execute (_mainStore: N3.Store, _policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        console.log("*** BOOM ! All rockets are starting :P ***");
        console.log(`This is your ${policy.target} and it works well with ${policy.mainSubject}`);
        console.log(`Here are the other parameters for this policy:`);
        console.log(JSON.stringify(policy,null,4));
        console.log("*** BYE ***");

        return true;
    }
}
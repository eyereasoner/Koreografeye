import * as N3 from 'n3';
import { rdfTransformStore } from '../../util';
import { PolicyPlugin , type IPolicyType } from '../PolicyPlugin';

export class DemoPlugin extends PolicyPlugin {
    showMainStore = false;
    showPolicyStore = false;
    showParameters = false;

    constructor(showMainStore = false, showPolicyStore = false, showParameters = false) {
        super();
        this.showMainStore = showMainStore;
        this.showPolicyStore = showPolicyStore;
        this.showParameters = showParameters;
    }

    public async execute (mainStore: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean> {

        console.log("*** BOOM ! All rockets are starting :P ***");
        console.log(`This is your ${policy.target}`);
        
        if (this.showMainStore) {
            console.log("*** Main store contents ***");
            const text = await rdfTransformStore(mainStore,'text/turtle');
            console.log(text);
        }

        if (this.showPolicyStore) {
            console.log("*** Policy store contents ***");
            const text = await rdfTransformStore(policyStore,'text/turtle');
            console.log(text);
        }

        if (this.showParameters) {
            console.log("*** Policy parameters ***");
            console.log(JSON.stringify(policy,null,4));
        }

        console.log(
            "**** HELP ***\n" +
            "Show more or less verbose input by switch on/off the startup paramters\n" +
            "in config.jsonld for the DemoPlugin.\n\n" +
            `   \"showMainStore\" : ${this.showMainStore},\n` + 
            `   \"showPolicyStore\" : ${this.showPolicyStore},\n` +
            `   \"showParameters\" : ${this.showParameters}\n` 
        );
        console.log("*** BYE ***");

        return true;
    }
}
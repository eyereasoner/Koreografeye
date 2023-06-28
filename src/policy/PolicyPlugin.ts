import { getLogger, Logger } from "log4js";
import * as N3 from 'n3';
import * as RDF from '@rdfjs/types';

export type IPolicyType = {
    node:  N3.NamedNode | N3.BlankNode , 
                          // Policy node
    path: string ,        // Input file
    policy: string ,      // Policy identifier
    target: string ,      // Name of execution target (the idenfier of the policy function)
    order: number ,       // Execution order of policy
    args: {               // Name/Value pairs of policy arguments
        [key : string]: RDF.Term[]
    }
};

export abstract class PolicyPlugin {
    logger : Logger ;

    constructor() {
        this.logger = getLogger();
    }

    public abstract execute(mainStore: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean>;
}
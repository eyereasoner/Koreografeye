import { getLogger, Logger } from "log4js";
import * as N3 from 'n3';
import { type IPolicyType} from '../util';

export abstract class PolicyPlugin {
    logger : Logger ;

    constructor() {
        this.logger = getLogger();
    }

    public abstract execute(mainStore: N3.Store, policyStore: N3.Store, policy: IPolicyType) : Promise<boolean>;
}
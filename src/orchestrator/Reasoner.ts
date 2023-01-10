import { getLogger, Logger } from "log4js";
import { Store } from "n3";
import { parseStringAsN3Store, rdfTransformStore } from "../util";

export abstract class Reasoner {
    logger : Logger ;

    constructor() {
        this.logger = getLogger();
    }

    public abstract aboxAppend(data: string) : void;

    public abstract tboxAppend(data: string) : void;

    public abstract run() : Promise<string>;

    public abstract cleanup() : void;

    public async reason(dataStore: Store, rules: string[]): Promise<Store>{
        const n3 = await rdfTransformStore(dataStore, 'text/turtle');

        if (!n3) {
            throw new Error(`failed to transform store to turtle`);
        }
        this.aboxAppend(n3);

        rules.map(n3 => this.tboxAppend(n3) );

        const result = await this.run();

        const resultStore = await parseStringAsN3Store(result);
        this.cleanup();
        return resultStore;
    }
}
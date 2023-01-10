import { getLogger, Logger } from "log4js";
import { Store } from "n3";
import { parseStringAsN3Store, rdfTransformStore } from "../util";

export abstract class Reasoner {
    logger : Logger ;

    constructor() {
        this.logger = getLogger();
    }

    /**
     * Abox appender
     * @param data - A string containing N3 data
     */
    public abstract aboxAppend(data: string) : void;

    /**
     * Tbox appender
     * @param data - A string containing N3 rules
     */
    public abstract tboxAppend(data: string) : void;

    /**
     * Run the reasoner
     * @returns An N3 string containing the result of the inferences
     */
    public abstract run() : Promise<string>;

    /**
     * Clean up memory, diskspace, ...
     */
    public abstract cleanup() : void;

    /**
     * Reason on an N3 store of triples with zero or more N3 rules descriptions.
     * This is a convenience method for:
     *     reasoner.aboxAppend(n3);
     *     reasoner.tboxAppend(n3_rule);
     *     reasoner.run()
     *     reasoner.cleanup()
     * @param dataStore - An N3 Store containing data
     * @param rules - An array of zero or more N3 rules
     * @returns An N3 Store with the reasoning result
     */
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
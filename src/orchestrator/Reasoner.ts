import { getLogger, Logger } from "log4js";

export abstract class Reasoner {
    logger : Logger ;

    constructor() {
        this.logger = getLogger();
    }

    public abstract aboxAppend(data: string) : void;

    public abstract tboxAppend(data: string) : void;

    public abstract run() : Promise<string>;

    public abstract cleanup() : void;
}
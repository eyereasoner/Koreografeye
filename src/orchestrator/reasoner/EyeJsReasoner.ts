import { Reasoner } from "../Reasoner";
import { SwiplEye, queryOnce } from 'eyereasoner';

/**
 * A reasoner implementing the WASM version of EYE
 * See also https://github.com/eyereasoner/eye-js
 */
export class EyeJsReasoner extends Reasoner {
    private args : string[] = [];
    private data : string[] = []; 

    constructor(args: string[]) {
        super();
        this.args = args;
    }

    /**
     * Abox appender
     * @param data - A string containing N3 data
     */
    public aboxAppend(data: string) {
        this.data.push(data);
    }

    /**
     * Tbox appender
     * @param data - A string containing N3 rules
     */
    public tboxAppend(data: string) {
        this.aboxAppend(data);
    }

    /**
     * Run the reasoner
     * @returns An N3 string containing the result of the inferences
     */
    public async run() : Promise<string> {
        return new Promise(async (resolve) => {
            let res = '';

            const Module = await SwiplEye({ 
                print: (str: string) => { 
                    res += `${str}\n`; 
                }, 
                arguments: ['-q'] 
            });

            const dataFiles = [];

            for (let i = 0 ; i < this.data.length ; i++) {
                const dataFile = `data${i}.n3`;
                Module.FS.writeFile(dataFile, this.data[i]);
                dataFiles.push(dataFile);
            }

            const xargs = this.args.concat(dataFiles);

            queryOnce(Module, 'main', xargs);

            resolve(res);
        });
    }

    public cleanup(): void {}
}
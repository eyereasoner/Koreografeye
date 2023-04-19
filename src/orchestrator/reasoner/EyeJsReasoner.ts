import { Reasoner } from "../Reasoner";
import { SwiplEye, queryOnce } from 'eyereasoner';

/**
 * A reasoner implementing the WASM version of EYE
 * See also https://github.com/eyereasoner/eye-js
 */
export class EyeJsReasoner extends Reasoner {
    private args : string[] = [];

    constructor(args: string[]) {
        super();
        this.args = args;
        this.logger.debug(`constructing EyeJsReasoner with %s`, args);
    }

    /**
     * Run the reasoner
     * @returns An N3 string containing the result of the inferences
     */
    public async run(abox: string[] , tbox: string[]) : Promise<string> {
        return new Promise(async (resolve) => {
            let res = '';

            const Module = await SwiplEye({ 
                print: (str: string) => { 
                    res += `${str}\n`; 
                }, 
                arguments: ['-q'] 
            });

            const dataFiles = [];

            for (let i = 0 ; i < abox.length ; i++) {
                const dataFile = `data_${i}.n3`;
                Module.FS.writeFile(dataFile, abox[i]);
                dataFiles.push(dataFile);
            }

            for (let i = 0 ; i < tbox.length ; i++) {
                const dataFile = `rules_${i}.n3`;
                Module.FS.writeFile(dataFile, tbox[i]);
                dataFiles.push(dataFile);
            }
            
            const xargs = this.args.concat(dataFiles);

            queryOnce(Module, 'main', xargs);

            resolve(res);
        });
    }
}
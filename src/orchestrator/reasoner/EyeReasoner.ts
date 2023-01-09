import { FileResult, fileSync } from "tmp";
import * as fs from 'fs';
import { spawn } from 'node:child_process';
import { Reasoner } from "../Reasoner";

/**
 * A reasoner implementing the command line EYE
 * See also https://github.com/eyereasoner/eye
 */
export class EyeReasoner extends Reasoner {
    private eye   : string;
    private args  : string[];
    private xargs : string[] = [];
    private files : FileResult[] = [];

    /**
     * Constructor
     * @param eye - The path to the eye reasoner
     * @param args - Default startup parameters
     */
    constructor(eye: string, args: string[]) {
        super();
        this.eye = eye;
        this.args = args;
    }

    /**
     * Abox appender
     * @param data - A string containing N3 data
     */
    public aboxAppend(data: string) {
        const tmpobj = this.createTmpFile(data);
        // add data file path to eye args
        this.xargs.push(tmpobj.name);
        this.files.push(tmpobj);
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
        const all_args = this.args.concat(this.xargs);

        return new Promise<string>(async (resolve, reject) => {
            let errorData = '';
            let resultData = '';
        
            const ls = spawn(this.eye, all_args);
            ls.stdout.on('data', (data) => {
              resultData += data;
            });
            ls.stderr.on('data', (data) => {
              errorData += data;
            });
            ls.on('close', (code) => {
              if (code != 0) {
                return reject(errorData);
              }
              else {
                return resolve(resultData);
              }
            });
        });
    }

    /**
     * Clean up memory and disk space
     */
    public cleanup() {
        this.files.forEach(tmp => tmp.removeCallback());
    }

    /**
     * Creates a temporary file. (execute `removeCallback()` on the {@link FileResult} return value)
     * @param text - plain text to be put into a temporary file.
     * @returns {FileResult}
     */
    private createTmpFile(text: string): FileResult {
        const tmpobj = fileSync();
    
        if (!tmpobj) {
            throw new Error(`failed to create tmp object`);
        }
    
        this.logger.trace(`creating tmp file ${tmpobj.name}`);
        
        fs.writeFileSync(tmpobj.name, text);
        return tmpobj;
    }
}
import * as fs from 'fs';
import * as tmp from 'tmp';
import * as log4js from 'log4js';
import { program } from 'commander';
import { spawn} from 'node:child_process';
import rdfParser from 'rdf-parse';
import rdfSerializer from 'rdf-serialize';
import stringifyStream = require('stream-to-string');
import streamifyString = require('streamify-string');

const eye = '/usr/local/bin/eye';

program.version('0.0.1')
       .argument('<data>')
       .argument('<rules>')
       .option('-d,--info','output debugging messages')
       .option('-dd,--debug','output more debugging messages')
       .option('-ddd,--trace','output much more debugging messages');

program.parse(process.argv);

const opts   = program.opts();
const logger = log4js.getLogger();

if (opts.info) {
    logger.level = "info";
}
if (opts.debug) {
    logger.level = "debug";
}
if (opts.trace) {
    logger.level = "trace";
}

const data  = program.args[0];
const rules = program.args.slice(1);

logger.info(`data: ${data}`);
logger.info(`rules: ${rules}`);

main(data,rules);

async function main(data: string, rules: string[]) {
    const result = await reason(data,rules);
    console.log(result);
}

async function reason(data: string , rules: string[]) {
    const n3  = await dataAsN3(data);
    logger.trace(n3);

    const tmpobj = tmp.fileSync();
    logger.trace(`tmp file: ${tmpobj.name}`);

    logger.debug(`writing n3 to ${tmpobj.name}`);
    fs.writeFileSync(tmpobj.name, n3);

    const args = ['--quiet','--nope','--pass'];
    args.push(tmpobj.name);
    rules.forEach(r => args.push(r));

    logger.debug(`${eye}`);
    logger.debug(`eye args: ${args}`);

    return new Promise( (resolve,reject) =>  {
        let errorData = '';
        let resultData = '';

        const ls = spawn(eye,args);
        ls.stdout.on('data', (data) => {
            resultData += data;
        });
        ls.stderr.on('data', (data) => {
            errorData += data;
        });
        ls.on('close', (code) => {
            tmpobj.removeCallback();
            if (code != 0) {
                reject(errorData);
            }
            else {
                resolve(resultData);
            }
        });
    });
}

async function dataAsN3(file: string) : Promise<string> {
    return new Promise<string>( async (resolve,reject) => {
        fs.readFile(file, 'utf8', async (err,data) => {
            if (err) {
                reject(err);
            }
            else {
                const n3 = await rdfTransform(data,file,'text/turtle');
                resolve(n3);
            }
        });
    }) ;
}

async function rdfTransform(data: string, path: string, outType: string ) {
    const inStream = streamifyString(data);
    // Guess the content-type from the path name
    const quadStream = rdfParser.parse(inStream, { path:path });
    const outStream = rdfSerializer.serialize(quadStream, { contentType: outType });
    return await stringifyStream(outStream);
}
#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { isHiddenFile } from 'is-hidden-file';
import { program } from 'commander';
import * as log4js from 'log4js';
import { instantiateReasoner, readRules } from './orchestrator/Reason';
import { 
    parseAsN3Store, 
    rdfTransformStore, 
    storeAddPredicate, 
    topGraphIds,
    joinFilePath
} from './util';

const POL_MAIN_SUBJECT = 'https://www.example.org/ns/policy#mainSubject';
const POL_ORIGIN       = 'https://www.example.org/ns/policy#origin';
let   orchConf         = './config.jsonld';

program.version('0.1.0')
       .argument('<rules>')
       .option('-c,--config <file>','config file')
       .option('-i,--in <directory>','input directory')
       .option('-e,--err <directory>','error directory')
       .option('-o,--out <directory>','output diretory')
       .option('-s,--single <file>','single input file')
       .option('-k,--keep','keep input files')
       .option('-d,--info','output debugging messages')
       .option('-dd,--debug','output more debugging messages')
       .option('-ddd,--trace','output much more debugging messages');

program.parse(process.argv);

const opts   = program.opts();
const logger = log4js.getLogger();

if (opts.config) {
    orchConf = opts.config;
}

if (opts.info) {
    logger.level = "info";
}

if (opts.debug) {
    logger.level = "debug";
}

if (opts.trace) {
    logger.level = "trace";
}

const rules = program.args;

logger.info(`rules: ${rules}`);

main();

async function main() {
    if (opts.single) {
        const data = opts.single;
        await single_file_run(data,rules);
    }
    else if (opts.in) {
        const indir  = opts.in;
        await multiple_file_run(indir,rules);
    }
    else {
        console.error(`Need a --in <directory> or --single <file> input`);
        process.exit(2);
    }
}

async function single_file_run(data: string, rulePaths: string[]) {
    try {
        let result = await single_run(data, rulePaths);
        if (result) {
            process.exit(0);
        }
        else {
            process.exit(2);
        }
    }
    catch (e) {
        console.error(e);
        process.exit(2);
    }
}

async function multiple_file_run(indir: string, rulePaths: string[]) {
    let promises : Promise<boolean>[] = [];

    fs.readdirSync(indir).forEach(async file => {
        logger.info(`data: ${file}`);

        let inFile = joinFilePath(indir,file);

        if (fs.lstatSync(inFile).isFile() && ! isHiddenFile(inFile)) {
            let p = single_run(inFile, rulePaths);
            promises.push(p);
        }
    });

    let success = 0;
    await Promise.all<boolean>(promises).then(values => {
        values.forEach( v => {
            if (!v) { success == 2} 
        });
    });
    process.exit(success);
}

async function single_run(data: string, rulePaths: string[]) : Promise<boolean> {
    let success = true;

    logger.info(`data: ${data}`);

    const dataFileName = path.basename(data).replaceAll(/\..*$/g,'.ttl');

    try {
        const result = await reason(data,rulePaths);

        if (opts.out !== null && opts.out !== undefined) {
            const outFile = joinFilePath(opts.out, dataFileName);
            logger.info(`writing result to ${outFile}`);
            fs.writeFileSync(outFile,result);
        }
        else {
            logger.info(`writing result to stdout`);
            console.log(result);
        }
    }
    catch (e){
        logger.error(e);
        console.error(e);

        if (opts.err !== null && opts.err !== undefined) {
            const errFile = joinFilePath(opts.err, path.basename(data));
            logger.info(`copy data to ${errFile}`);
            fs.copyFileSync(data,errFile);
        }
        else {
            logger.info(`no --err path set`);
        }

        success = false;
    }

    if (opts.keep) {
        logger.info(`keeping input data`);
    }
    else {
        logger.info(`removing input data`);
        fs.unlinkSync(data);
    }

    return success;
}

async function reason(dataPath: string , rulePaths: string[]) {
    return new Promise<string>( async (resolve,reject) =>  {
        try {
            logger.debug(`parsing ${dataPath}...`);
            const store = await parseAsN3Store(dataPath);
            
            if (!store) {
                return reject(`failed to create a store from ${dataPath}`);
            }

            const topIds = topGraphIds(store);

            if (topIds.length != 1) {
                return reject(`document doesn't contain one main subject`);
            }

            // Inject a top graph indicator in the KG
            storeAddPredicate(store, POL_MAIN_SUBJECT, topIds[0]);

            // Inject the file origin in the KG
            storeAddPredicate(store, POL_ORIGIN, dataPath);

            const rules = await readRules(rulePaths);
            const reasoner = await instantiateReasoner(orchConf);
            const resultStore = await reasoner.reason(store, rules);
            
            const result = await rdfTransformStore(resultStore, 'text/turtle');
            return resolve(result);
        }
        catch (e) {
            reject(e);
        }
    });
}
#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { isHiddenFile } from 'is-hidden-file';
import { program } from 'commander';
import * as log4js from 'log4js';
import { executePolicies } from './policy/Executor';
import { 
    loadConfig, 
    parseAsN3Store, 
    storeGetPredicate,
    joinFilePath 
} from './util';

const POL_MAIN_SUBJECT = 'https://www.example.org/ns/policy#mainSubject';
const POL_ORIGIN       = 'https://www.example.org/ns/policy#origin';
let   pluginConf = './plugin.json';

program.version('0.1.0')
       .option('-c,--config <file>', 'configuration file')
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
    pluginConf = opts.config;
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

main();

async function main() {
    if (opts.single) {
        const data = opts.single;
        await single_file_run(data);
    }
    else if (opts.in) {
        const indir  = opts.in;
        await multiple_file_run(indir);
    }
    else {
        console.error(`Need a --in <directory> or --single <file> input`);
        process.exit(2);
    }
}

async function single_file_run(data: string) {
    try {
        let result = await single_run(data);
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

async function multiple_file_run(indir: string) {
    let promises : Promise<boolean>[] = [];

    fs.readdirSync(indir).forEach(async file => {
        logger.info(`data: ${file}`);

        let inFile = joinFilePath(indir,file);

        if (fs.lstatSync(inFile).isFile() && ! isHiddenFile(inFile)) {
            let p = single_run(inFile);
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

async function single_run(data: string) : Promise<boolean> {
    let   errors   = 0;
    const store    = await parseAsN3Store(data);
    const plugins  = loadConfig(pluginConf); 
    
    if (! plugins) {
        console.error(`no ${pluginConf} found`);
        logger.error(`no ${pluginConf} found`);
        return false;
    }

    const mainSubject = storeGetPredicate(store, POL_MAIN_SUBJECT);

    if (! mainSubject) {
        console.error(`no ${POL_MAIN_SUBJECT}?!`);
        logger.error(`no ${POL_MAIN_SUBJECT}?!`);
        return false;
    }
    else {
        logger.debug(`main subject: ${mainSubject.value}`);
    }

    const origin = storeGetPredicate(store, POL_ORIGIN);

    if (! origin) {
        logger.error(`no ${POL_ORIGIN}?!`);
        return false;
    }
    else {
        logger.debug(`origin: ${origin.value}`);
    }

    let success = true;

    errors = await executePolicies(plugins, store, logger);

    if (errors == 0) {
        success = true;
    }
    else {
        success = false;
    }

    if (success) {
        if (opts.out !== null && opts.out !== undefined) {
            const outFile = joinFilePath(opts.out, path.basename(data));
            logger.info(`copy data to ${outFile}`);
            fs.copyFileSync(data,outFile);
        }
        else {

        } 
    }
    else {
        if (opts.err !== null && opts.err !== undefined) {
            const errFile = joinFilePath(opts.err, path.basename(data));
            logger.info(`copy data to ${errFile}`);
            fs.copyFileSync(data,errFile);
        }
        else {

        }
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
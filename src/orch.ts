#!/usr/bin/env node

import { program } from 'commander';
import * as log4js from 'log4js';
import { instantiateReasoner, readRules } from './orchestrator/Reason';
import { parseAsN3Store, rdfTransformStore, storeAddPredicate, topGraphIds } from './util';

const POL_MAIN_SUBJECT = 'https://www.example.org/ns/policy#mainSubject';
const POL_ORIGIN       = 'https://www.example.org/ns/policy#origin';
let   orchConf         = './config.jsonld';

program.version('0.0.1')
       .argument('<data>')
       .argument('<rules>')
       .option('-c,--config <file>','config file')
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

const data  = program.args[0];
const rules = program.args.slice(1);

logger.info(`data: ${data}`);
logger.info(`rules: ${rules}`);

main(data,rules);

async function main(data: string, rules: string[]) {
    try {
        const result = await reason(data,rules);
        console.log(result);
        process.exit(0);
    }
    catch (e) {
        console.error(e);
        process.exit(2);
    }
}

async function reason(dataPath: string , rulePaths: string[]) {
    return new Promise<string>( async (resolve,reject) =>  {
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
    });
}
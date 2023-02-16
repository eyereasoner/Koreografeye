#!/usr/bin/env node

import { program } from 'commander';
import * as log4js from 'log4js';
import { executePolicies } from './policy/Executor';
import { loadConfig, parseAsN3Store, storeGetPredicate } from './util';

const POL_MAIN_SUBJECT = 'https://www.example.org/ns/policy#mainSubject';
const POL_ORIGIN       = 'https://www.example.org/ns/policy#origin';
let   pluginConf = './plugin.json';

program.version('0.0.1')
       .argument('<data>')
       .option('-c,--config <file>', 'configuration file')
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

const data     = program.args[0];

execute_policies(data);

async function execute_policies(path: string) {
    let   errors   = 0;
    const store    = await parseAsN3Store(path);
    const plugins  = loadConfig(pluginConf); 
    
    if (! plugins) {
        console.error(`no ${pluginConf} found`);
        logger.error(`no ${pluginConf} found`);
        return;
    }

    const mainSubject = storeGetPredicate(store, POL_MAIN_SUBJECT);

    if (! mainSubject) {
        console.error(`no ${POL_MAIN_SUBJECT}?!`);
        logger.error(`no ${POL_MAIN_SUBJECT}?!`);
        process.exit(2);
    }
    else {
        logger.debug(`main subject: ${mainSubject.value}`);
    }

    const origin = storeGetPredicate(store, POL_ORIGIN);

    if (! origin) {
        logger.error(`no ${POL_ORIGIN}?!`);
        process.exit(2);
    }
    else {
        logger.debug(`origin: ${origin.value}`);
    }
    
    errors = await executePolicies(plugins, store, logger);

    if (errors == 0) {
        process.exit(0);
    }
    else {
        process.exit(2);
    }
}
import * as N3 from 'n3';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import * as fs from 'fs';
import { program  } from 'commander';
import { getMainSubject, parseAsN3Store } from './util';
import * as log4js from 'log4js';

const POL = 'https://www.example.org/ns/policy#';
const FNO = 'https://w3id.org/function/ontology#';
const pluginConf = './plugin.json';

program.version('0.0.1')
       .argument('<data>')
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

const myEngine = new QueryEngine();
const data     = program.args[0];

execute_policies(data);

function loadConfig(path:string) {
    const cfg = fs.readFileSync(path,{encoding:'utf8', flag:'r'});
    return JSON.parse(cfg);
}

async function execute_policies(path: string) {
    const store = await parseAsN3Store(path);
    const policies = await extractPolicies(store,path);
    const plugins  = loadConfig(pluginConf); 

    for (let key in policies) {
        const policy = policies[key];
        const target = policy['target'];
        const implementation = plugins[target];
        
        if (implementation) {
            logger.info(`${target} -> ${implementation}`);
            await callImplementation(implementation,store,policy);
        }
        else {
            logger.error(`${target} has no implementation`);
        }
    }
}

async function callImplementation(plugin:string, store: N3.Store, policy:any) {
    logger.info(`calling ${plugin}...`);
    const pkg = await import(plugin);
    const result = await pkg.policyTarget(store,policy);
    logger.info(`..returned a ${result}`);
    return result;
}

async function extractPolicies(store: N3.Store, path?: string) {
    const sql = `
PREFIX pol: <${POL}> 
PREFIX fno: <${FNO}>

SELECT ?id ?policy ?executionTarget ?name ?value WHERE {
    ?id pol:policy ?policy .
    ?policy a fno:Execution .
    ?policy fno:executes ?executionTarget .
    OPTIONAL { ?policy ?name ?value . } .
}
`;
    logger.trace(sql);
    const bindingStream = await myEngine.queryBindings(sql, {
        sources: [ store ] 
    });

    const bindings = await bindingStream.toArray();

    const policies : { [id: string] : any } = {};

    bindings.forEach( (binding) => {
        const id              = binding.get('id')?.value.toString() ?? '<undef>';
        const policy          = binding.get('policy')?.value.toString() ;
        const executionTarget = binding.get('executionTarget')?.value.toString();
        const name            = binding.get('name')?.value.toString() ?? '<undef>';
        const value           = binding.get('value');

        if (policies[id]) {
            policies[id]['args'][name] = value;
        }
        else {
            policies[id] = {
                'path'   : path ,
                'policy' : policy ,
                'target' : executionTarget,
                'args'   : {}
            };
            policies[id]['args'][name] = value;
        }
    });

    return policies;
}
import * as N3 from 'n3';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import * as fs from 'fs';
import { program  } from 'commander';
import { storeGetPredicate, parseAsN3Store , extractGraph , type IPolicyType} from './util';
import * as log4js from 'log4js';

const POL = 'https://www.example.org/ns/policy#';
const FNO = 'https://w3id.org/function/ontology#';
const POL_MAIN_SUBJECT = 'https://www.example.org/ns/policy#mainSubject';
const POL_ORIGIN       = 'https://www.example.org/ns/policy#origin';
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
    const plugins  = loadConfig(pluginConf); 
    
    const mainSubject = storeGetPredicate(store, POL_MAIN_SUBJECT);

    if (! mainSubject) {
        logger.error(`no ${POL_MAIN_SUBJECT}?!`);
        return;
    }
    else {
        logger.debug(`main subject: ${mainSubject.value}`);
    }

    const origin = storeGetPredicate(store, POL_ORIGIN);

    if (! origin) {
        logger.error(`no ${POL_ORIGIN}?!`);
        return;
    }
    else {
        logger.debug(`origin: ${origin.value}`);
    }
    
    const policies = await extractPolicies(store,path, {
        mainSubject: mainSubject ,
        origin: origin
    });

    const mainStore   = extractGraph(store,mainSubject);

    for (let key in policies) {
        const policy = policies[key];
        const idNode = policy['node'];
        const target = policy['target'];
        const implementation = plugins[target];
        const policyStore = extractGraph(store,idNode);

        policy['mainSubject'] = mainSubject.value;
        policy['origin'] = origin.value;
        
        if (implementation) {
            logger.info(`${target} -> ${implementation}`);
            await callImplementation(implementation,mainStore,policyStore,policy);
        }
        else {
            logger.error(`${target} has no implementation`);
        }
    }
}

async function callImplementation(plugin:string, mainStore: N3.Store, policyStore: N3.Store, policy:any) {
    logger.info(`calling ${plugin}...`);
    const pkg = await import(plugin);
    const result = await pkg.policyTarget(mainStore, policyStore,policy);
    logger.info(`..returned a ${result}`);
    return result;
}

async function extractPolicies(store: N3.Store, path: string, xtra: any) {
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

    const policies : { [id: string] : IPolicyType } = {};

    bindings.forEach( (binding) => {
        const id = binding.get('id')?.value ;

        let idNode : N3.NamedNode | N3.BlankNode;

        if (id) {
            if (binding.get('id')?.termType == 'BlankNode') {
                idNode = N3.DataFactory.blankNode(binding.get('id')?.value.replaceAll(/^_:/g,''));
            }
            else if (binding.get('id')?.termType == 'BlankNode') {
                idNode = N3.DataFactory.blankNode(binding.get('id')?.value.replaceAll(/^_:/g,''));
            }
            else {
                logger.error(`wrong termType for policy ${binding.get('id')?.termType}`);
                return;
            }
        }
        else {
            logger.error(`no policy found`);
            return;
        }

        const policy          = binding.get('policy')?.value.toString();
        const executionTarget = binding.get('executionTarget')?.value.toString();
        const name            = binding.get('name')?.value.toString() ?? '<undef>';
        const value           = binding.get('value');

        if (id && policy && executionTarget) {
            logger.info(`found policy ${id} with target ${executionTarget}`);
        }
        else {
            logger.error('failed to find pol:policy or a fno:Executes with fno:executes');
            return;
        }

        if (policies[id]) {
            policies[id]['args'][name] = value;
        }
        else {
            policies[id] = {
                'node'   : idNode ,
                'path'   : path ,
                'policy' : policy ,
                'target' : executionTarget,
                'args'   : {} ,
                ...xtra
            };
            policies[id]['args'][name] = value;
        }
    });

    logger.debug(`policies:`);
    logger.debug(policies);

    return policies;
}
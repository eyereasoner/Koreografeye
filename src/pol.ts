import * as N3 from 'n3';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { program  } from 'commander';
import { loadConfig, storeGetPredicate, parseAsN3Store , extractGraph , type IPolicyType} from './util';
import * as log4js from 'log4js';

const POL = 'https://www.example.org/ns/policy#';
const FNO = 'https://w3id.org/function/ontology#';
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

const myEngine = new QueryEngine();
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
    
    const policies = await extractPolicies(store,path, {
        mainSubject: mainSubject ,
        origin: origin
    });

    const mainStore   = extractGraph(store,mainSubject);

    for (let key in policies) {
        const policy = policies[key];
        const idNode = policy['node'];
        const target = policy['target'];
        let   implementation;
        let   implementationConfiguration : any = {};

        if (plugins[target]) {
            if (typeof plugins[target] === 'string') {
                implementation = plugins[target];
            }
            else 
                implementation = plugins[target]['@id'];
                implementationConfiguration = plugins[target];
        }
       
        const policyStore = extractGraph(store,idNode);

        policy['mainSubject'] = mainSubject.value;
        policy['origin'] = origin.value;
        policy['config'] = implementationConfiguration;
        
        if (implementation) {
            logger.info(`${target} -> ${implementation}`);

            try {
                const isOk = await callImplementation(implementation,mainStore,policyStore,policy);
                if (isOk) {
                    // All is well
                }
                else {
                    errors += 1;
                }
            }
            catch (e) {
                console.error(`Target ${target} (${implementation}) threw error ${e}`);
                errors += 1;
            }
        }
        else {
            logger.error(`${target} has no implementation`);
            errors += 1;
        }
    }

    if (errors == 0) {
        process.exit(0);
    }
    else {
        process.exit(2);
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
                idNode = N3.DataFactory.blankNode(id.replaceAll(/^_:/g,''));
            }
            else if (binding.get('id')?.termType == 'BlankNode') {
                idNode = N3.DataFactory.blankNode(id.replaceAll(/^_:/g,''));
            }
            else if (binding.get('id')?.termType == 'NamedNode') {
                idNode = N3.DataFactory.namedNode(id);
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
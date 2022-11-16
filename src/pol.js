const POL='https://www.example.org/ns/policy#';
const FNO='https://w3id.org/function/ontology#';
const RDF='http://www.w3.org/1999/02/22-rdf-syntax-ns#';

const N3 = require('n3');
const QueryEngine = require('@comunica/query-sparql-rdfjs').QueryEngine;
const fs = require('fs');
const { program } = require('commander');
const log4js = require('log4js');

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
const data  = program.args[0];

execute_policies(data);

async function execute_policies(data) {
    const store = await parseData(data);
    await extractPolicies(store);
}

async function extractPolicies(store) {
    const sql = `
PREFIX pol: <${POL}> 
PREFIX fno: <${FNO}>

SELECT ?id ?policy ?executionTarget WHERE {
    ?id pol:policy ?policy .
    ?policy a fno:Execution .
    ?policy fno:executes ?executionTarget .
}
`;
    logger.trace(sql);
    const bindingStream = await myEngine.queryBindings(sql, {
        sources: [ store ] 
    });

    bindingStream.on('data', (binding) => {
        const id = binding.get('id');
        const policy = binding.get('policy');
        const executionTarget = binding.get('executionTarget');
        console.log(id);
        console.log(policy);
        console.log(executionTarget);
    });
}

async function parseData(data) {
    const parser       = new N3.Parser();
    const store        = new N3.Store();

    const streamParser = new N3.StreamParser(),
          rdfStream    = fs.createReadStream(data);

    return new Promise( (resolve,reject) => {
        parser.parse(rdfStream, (error, quad, prefixes) => {
            if (error) {
                reject(error);
            }
            else if (quad) {
                store.addQuad(quad);
            }
            else {
                resolve(store);
            }
        });
    });
}

const eye = '/usr/local/bin/eye';
const fs = require('fs');
const tmp = require('tmp');
const log4js = require('log4js');
const { program } = require('commander');
const { spawn } = require('node:child_process');
const rdfParser = require("rdf-parse").default;
const rdfSerializer = require("rdf-serialize").default;
const stringifyStream = require('stream-to-string');
const streamifyString = require('streamify-string');

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

async function main(data,rules) {
    const result = await reason(data,rules);
    console.log(result);
}

async function reason(data,rules) {
    const n3  = await dataAsN3(data);
    logger.trace(n3);

    const tmpobj = tmp.fileSync();
    logger.trace(`tmp file: ${tmpobj.name}`);

    logger.debug(`writing n3 to ${tmpobj.name}`);
    fs.writeFileSync(tmpobj.name, n3);

    const args = ['--quiet','--nope','--pass'];
    args.push(tmpobj.name);
    args.push(rules);

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

async function dataAsN3(file) {
    const data = fs.readFileSync(file,{encoding: 'utf8', flag:'r'})
    return new Promise( async (resolve,reject) => {
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

async function rdfTransform(data,path,outType) {
    const inStream = streamifyString(data);
    // Guess the content-type from the path name
    const quadStream = rdfParser.parse(inStream, { path:path });
    const outStream = rdfSerializer.serialize(quadStream, { contentType: outType });
    return await stringifyStream(outStream);
}
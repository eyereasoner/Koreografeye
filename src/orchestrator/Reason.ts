import { getLogger, Logger } from "log4js";
import { Store } from "n3";
import * as fs from 'fs';
import { FileResult, fileSync } from "tmp";
import { spawn } from 'node:child_process';
import { parseStringAsN3Store, rdfTransformStore, readText } from "../util";

/**
 * Reason over an input RDF graph with rules using the eye reasoner.
 * Reads in the rules and then executes {@link reason}.
 * 
 * @param dataStore - N3 store containing the data.
 * @param config - Orchestrator configuration (contains eye arguments).
 * @param rulePaths - The paths to the files containing the N3 rules.
 * @param logger - Logger.
 * @returns N3 store containing the result of applying the rulest to the input dataStore.
 */
export async function reasonRulePaths(dataStore: Store, config: any, rulePaths: string[], logger?: Logger): Promise<Store> { 
  const rules: string[] = []
  rulePaths.forEach(path => {
    const rule = readText(path)
    if (rule) {
      rules.push(rule);
    }
  })
  return await reason(dataStore, config, rules, logger);
}

/**
 * Reason over an input RDF graph with rules using the eye reasoner.
 * Note: uses string for rules as an N3 store cannot be serialized to string properly.
 * 
 * @param dataStore - N3 store containing the data.
 * @param config - Orchestrator configuration (contains eye arguments).
 * @param rulePaths - An array of N3 (text/n3 serialization) containing the N3 rules.
 * @param logger - Logger.
 * @returns N3 store containing the result of applying the rulest to the input dataStore.
 */
export async function reason(dataStore: Store, config: any, rules: string[], logger?: Logger): Promise<Store> {
  const eye = config['eye'];
  const eyeargs = [...config['args']]; // deep copy wanted as we push items to eyeargs
  logger = logger ?? getLogger();

  // create file (text/plain) for data
  const n3 = await rdfTransformStore(dataStore, 'text/turtle');

  if (!n3) {
    throw new Error(`failed to transform store to turtle`);
  }

  logger.trace(n3);

  const tmpobj = createTmpFile(n3, logger);
  // add data file path to eye args
  eyeargs.push(tmpobj.name)

  // create files (text/plain) for rules
  const ruleObjects: FileResult[] = rules.map(n3 => createTmpFile(n3, logger!));

  // add rule file paths to eye args
  ruleObjects.forEach( tmp => {
    eyeargs.push(tmp.name)
  })

  logger.info(`${eye}`);
  logger.info(`eye args: ${eyeargs}`);

  const result = await eyeRunner(eye, eyeargs)
  tmpobj.removeCallback();
  ruleObjects.forEach(tmp => tmp.removeCallback())
  const resultStore = await parseStringAsN3Store(result)

  return resultStore
}

/**
 * Runs the eye reasoner.
 * @param eye - command to start eye (often a path).
 * @param args - arguments to run the eye reasoner.
 * @returns {string} Result of the eye reasoner.
 */
export async function eyeRunner(eye: string, args: string[]): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    let errorData = '';
    let resultData = '';

    const ls = spawn(eye, args);
    ls.stdout.on('data', (data) => {
      resultData += data;
    });
    ls.stderr.on('data', (data) => {
      errorData += data;
    });
    ls.on('close', (code) => {
      if (code != 0) {
        return reject(errorData);
      }
      else {
        return resolve(resultData);
      }
    });
  })
}

/**
 * Creates a temporary file. (execute `removeCallback()` on the {@link FileResult} return value)
 * @param text - plain text to be put into a temporary file.
 * @param logger - Logger.
 * @returns {FileResult}
 */
export function createTmpFile(text: string, logger: Logger): FileResult {
  const tmpobj = fileSync();

  if (!tmpobj) {
    throw new Error(`failed to create tmp object`);
  }

  logger.debug(`tmp file: ${tmpobj.name}`);

  logger.debug(`writing n3 to ${tmpobj.name}`);
  fs.writeFileSync(tmpobj.name, text);
  return tmpobj
}
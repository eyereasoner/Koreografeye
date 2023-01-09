import { getLogger, Logger } from "log4js";
import { Store } from "n3";
import * as fs from 'fs';
import { parseStringAsN3Store, rdfTransformStore, readText } from "../util";
// import { EyeReasoner } from "./reasoner/EyeReasoner";
import { EyeJsReasoner } from "./reasoner/EyeJsReasoner";

/**
 * Reason over an input RDF graph with rules using the eye reasoner.
 * Reads in the rules and then executes {@link reason}.
 * 
 * @param dataStore - N3 store containing the data.
 * @param config - Orchestrator configuration (contains eye arguments).
 * @param rulePaths - The paths to the files containing the N3 rules.
 * @param logger - Logger.
 * @returns N3 store containing the result of applying the rule set to the input dataStore.
 */
export async function reasonRulePaths(dataStore: Store, config: any, rulePaths: string[], logger?: Logger): Promise<Store> { 
  const rules: string[] = []
  rulePaths.filter(path => fs.lstatSync(path).isFile()).forEach(path => {
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
 * @returns N3 store containing the result of applying the rule set to the input dataStore.
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

  const reasoner = new EyeJsReasoner(eyeargs);

  reasoner.aboxAppend(n3);

  rules.map(n3 => reasoner.tboxAppend(n3) );

  logger.info(`${eye}`);
  logger.info(`eye args: ${eyeargs}`);

  const result = await reasoner.run();

  const resultStore = await parseStringAsN3Store(result);

  reasoner.cleanup();

  return resultStore;
}
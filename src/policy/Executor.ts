import { ComponentsManager } from 'componentsjs';
import { getLogger, Logger } from 'log4js';
import * as N3 from 'n3';
import { extractGraph, storeGetPredicate } from '../util';
import { extractPolicies, refinePolicy } from './Extractor';
import { PolicyPlugin } from './PolicyPlugin';

/**
 * Executes a single policy and returns the result.
 * 
 * @param plugin - Object that contains the configuration for the plugins.
 * @param mainStore - N3 Store containing the input RDF graph.
 * @param policyStore - N3 Store containing the policy to be executed.
 * @param policy - policy configuration
 * @param logger - Logger.
 * @returns the result of the policy when it was correctly executed.
 */
async function callImplementation(plugin: PolicyPlugin, mainStore: N3.Store, policyStore: N3.Store, policy: any, logger: Logger) {
  logger.info(`calling ${plugin}...`);
  const result = await plugin.execute(mainStore, policyStore, policy);
  logger.info(`..returned a ${result}`);
  return result;
}

/**
 * Extracts policies out of the graph.
 * When they are extracted, the plugins are fetched and executed.
 * 
 * @param plugins - Object that contains the configuration for the plugins.
 * @param reasoningResultStore - N3 Store that contains the result of the reasoner (data + ?policies).
 * @param logger - Logger.
 * @returns {Promise<number>} Number of errors.
 */
export async function executePolicies(manager: ComponentsManager<unknown>, reasoningResultStore: N3.Store, logger?: Logger): Promise<number> {
  logger = logger ?? getLogger();

  const mainSubject = fetchMainSubject(reasoningResultStore, logger);
  const origin = fetchOrigin(reasoningResultStore, logger);
  const policies = await extractPolicies(reasoningResultStore, "none", {}, logger);

  let errors = 0
  // refine policies
  for (const policy of Object.values(policies)) {
    // Add mainSubject, origin and config to the policy 
    refinePolicy(policy, mainSubject.value, origin.value);
  }

  // execute policies
  for (const policy of Object.values(policies)) {
    const idNode = policy['node'];
    const target = policy['target'];

    const implementation = await manager.instantiate<PolicyPlugin>(target);

    const policyStore = extractGraph(reasoningResultStore, idNode);
    const mainStore = extractGraph(reasoningResultStore, mainSubject);

    if (implementation) {
      logger.info(`${target} -> ${implementation}`);

      try {
        const isOk = await callImplementation(implementation, mainStore, policyStore, policy, logger);
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
  return errors
}

/**
 * Retrieve the main Policy Subject from the input data graph.
 * 
 * @param store - N3 Store data store.
 * @param logger - Logger.
 * @returns The main subject for the policy.
 */
function fetchMainSubject(store: N3.Store, logger: Logger) {
  const POL_MAIN_SUBJECT = 'https://www.example.org/ns/policy#mainSubject';

  const mainSubject = storeGetPredicate(store, POL_MAIN_SUBJECT);
  
  if (!mainSubject) {
    console.error(`no ${POL_MAIN_SUBJECT}?!`);
    logger.error(`no ${POL_MAIN_SUBJECT}?!`);
    process.exit(2);
  }
  else {
    logger.debug(`main subject: ${mainSubject.value}`);
  }
  return mainSubject
}

/**
 * Retrieve the origin input file from the input data graph.
 * 
 * @param store - N3 Store data store.
 * @param logger - Logger.
 * @returns The origin for the policy.
 */
function fetchOrigin(store: N3.Store, logger: Logger) {
  const POL_ORIGIN = 'https://www.example.org/ns/policy#origin';
  const origin = storeGetPredicate(store, POL_ORIGIN);

  if (!origin) {
    logger.error(`no ${POL_ORIGIN}?!`);
    process.exit(2);
  }
  else {
    logger.debug(`origin: ${origin.value}`);
  }
  return origin;
}
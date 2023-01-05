import { Logger } from 'log4js';
import * as N3 from 'n3';
import { extractGraph, storeGetPredicate } from '../util';
import { extractPolicies, findPlugin, refinePolicy } from './Extractor';

async function callImplementation(plugin: string, mainStore: N3.Store, policyStore: N3.Store, policy: any, logger: Logger) {
  logger.info(`calling ${plugin}...`);
  const pkg = await import('.'+plugin); // NOTE: ugly hack, MUST be removed
  const result = await pkg.policyTarget(mainStore, policyStore, policy);
  logger.info(`..returned a ${result}`);
  return result;
}

export async function executePolicies(plugins: any, reasoningResultStore: N3.Store, logger: Logger): Promise<number> {
  const mainSubject = fetchMainSubject(reasoningResultStore, logger);
  const origin = fetchOrigin(reasoningResultStore, logger);
  const policies = await extractPolicies(reasoningResultStore, "none", {}, logger);

  let errors = 0
  // refine policies
  for (const policy of Object.values(policies)) {
    // Add mainSubject, origin and config to the policy 
    refinePolicy(plugins, policy, mainSubject.value, origin.value);
  }

  // execute policies
  for (const policy of Object.values(policies)) {
    const idNode = policy['node'];
    const target = policy['target'];

    const { implementation } = findPlugin(plugins, target)

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
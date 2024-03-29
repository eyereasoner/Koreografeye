import { ComponentsManager } from 'componentsjs';
import { getLogger, Logger } from 'log4js';
import * as N3 from 'n3';
import { extractGraph } from '../util';
import { extractPolicies } from './Extractor';
import { IPolicyType, PolicyPlugin } from './PolicyPlugin';

export type IPolicyExecution = {
  policy: IPolicyType ,
  result: boolean
};

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
async function callImplementation(plugin: PolicyPlugin, mainStore: N3.Store, policyStore: N3.Store, policy: any, logger: Logger) : Promise<boolean> {
  logger.info(`calling ${plugin.constructor.name} (order ${policy.order})...`);
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
export async function executePolicies(manager: ComponentsManager<unknown>, reasoningResultStore: N3.Store, logger?: Logger): Promise<IPolicyExecution[]> {
  logger = logger ?? getLogger();

  const policyExecution : IPolicyExecution[] = [];

  const policies = await extractPolicies(reasoningResultStore, "none", {}, logger);

  const orderedPolicies = Object.values(policies).sort( (a: IPolicyType, b: IPolicyType) => {
    return a.order - b.order;
  });

  for (const policy of orderedPolicies) {
    let result = false;
    const idNode = policy['node'];
    const target = policy['target'];

    const implementation = await manager.instantiate<PolicyPlugin>(target);
    const policyStore = extractGraph(reasoningResultStore, idNode);

    if (implementation) {
      logger.info(`${target} -> ${implementation.constructor.name}`);

      try {
        const isOk = await callImplementation(implementation, reasoningResultStore, policyStore, policy, logger);
        if (isOk) {
          result = true;
        }
        else {
          result = false;
        }
      }
      catch (e) {
        console.error(`Target ${target} (${implementation}) threw error ${e}`);
        result = false;
      }
    }
    else {
      logger.error(`${target} has no implementation`);
      result = false;
    }

    policyExecution.push({
      policy: policy,
      result : result
    });
  }
  return policyExecution;
}
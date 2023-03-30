import { BlankNodeScoped } from '@comunica/data-factory';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { Logger } from 'log4js';
import * as N3 from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { type IPolicyType } from '../policy/PolicyPlugin';

const POL = 'https://www.example.org/ns/policy#';
const FNO = 'https://w3id.org/function/ontology#';

const myEngine = new QueryEngine();

/**
 * Extract policies from a graph.
 * 
 * Note that the output does not conform yet to {@link IPolicyType}
 * @param store - N3 Store containing policies.
 * @param path - Input file (only used to fill in IPolicyType).
 * @param xtra - extra arguments which are filled in {@link IPolicyType}.
 * @param logger - Logger.
 * @returns All policies from the graph as an Object of {@link IPolicyType}s.
 */
export async function extractPolicies(store: N3.Store, path: string, xtra: any, logger: Logger): Promise<{ [id: string]: IPolicyType }> {
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
    sources: [store]
  });

  const bindings = await bindingStream.toArray();

  const policies: { [id: string]: IPolicyType } = {};

  const DF = new DataFactory();

  bindings.forEach((binding) => {
    const id = binding.get('id')?.value;

    let idNode: N3.NamedNode | N3.BlankNode;

    if (id) {
      if (binding.get('id')?.termType == 'BlankNode') {
        idNode = N3.DataFactory.blankNode(id);
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

    const policy = binding.get('policy')?.value.toString();
    const executionTarget = binding.get('executionTarget')?.value.toString();
    const name = binding.get('name')?.value.toString() ?? '<undef>';
    const value = binding.get('value');

    if (id && policy && executionTarget) {
      logger.info(`found policy ${id} with target ${executionTarget}`);
    }
    else {
      logger.error('failed to find pol:policy or a fno:Executes with fno:executes');
      return;
    }

    if (policies[id]) {
      if (value?.termType === 'BlankNode' && value instanceof BlankNodeScoped) {
        // Comunica makes skolemnized values out of blank nodes...
        // We need the original blank node id so that N3.Store in other 
        // part of our code can make use of that
        const skolemizedName = (<BlankNodeScoped>value).skolemized.value;
        const unSkolemizedName = skolemizedName.replace(/urn:comunica_skolem:source[^:]+:/, "");
        policies[id]['args'][name] = DF.blankNode(unSkolemizedName);
      }
      else {
        policies[id]['args'][name] = value;
      }
    }
    else {
      policies[id] = {
        'node': idNode,
        'path': path,
        'policy': policy,
        'target': executionTarget,
        'args': {},
        ...xtra
      };
      policies[id]['args'][name] = value;
    }
  });

  logger.debug(`policies:`);
  logger.debug(policies);

  return policies;
}

/**
 * Add main subject, origin and config to a policy as this is not done in {@link extractPolicies}
 */
export function refinePolicy(policy: IPolicyType, mainSubject: string, origin: string): void {
  policy['mainSubject'] = mainSubject;
  policy['origin'] = origin;
}
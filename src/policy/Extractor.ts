import { BlankNodeScoped } from '@comunica/data-factory';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { Logger } from 'log4js';
import * as N3 from 'n3';
import { type IPolicyType } from '../policy/PolicyPlugin';
import { BlankNode } from '@rdfjs/types';

const POL = 'https://www.example.org/ns/policy#';
const FNO = 'https://w3id.org/function/ontology#';
const SH  = 'http://www.w3.org/ns/shacl#';

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
  const sparql = `
PREFIX pol: <${POL}> 
PREFIX fno: <${FNO}>
PREFIX sh: <${SH}>

SELECT ?id ?policy ?executionTarget ?name ?value ?order WHERE {
  ?policy a fno:Execution .
  ?policy fno:executes ?executionTarget .
  OPTIONAL { ?id pol:policy ?policy } .
  OPTIONAL { ?policy ?name ?value . } .
  OPTIONAL { ?policy sh:order ?order . } .
}
`;
  logger.trace(sparql);

  const bindingStream = await myEngine.queryBindings(sparql, {
    sources: [store]
  });

  const bindings = await bindingStream.toArray();

  const policies: { [id: string]: IPolicyType } = {};

  bindings.forEach((binding) => {
    const policyTerm = binding.get('policy');
    const policy = policyTerm?.value;
    const policyType = policyTerm?.termType;

    let policyNode: N3.NamedNode | N3.BlankNode;

    if (! policy) {
      logger.error(`no policy found!`);
      return; 
    }

    switch(policyType) {
      case 'BlankNode':
        policyNode = unSkolemizedName(policyTerm);
        break;
      case 'NamedNode':
        policyNode = N3.DataFactory.namedNode(policy);
        break;
      default:
        logger.error(`wrong termType ${policyType} for policy ${policy}`); 
        return;
    }

    const executionTarget = binding.get('executionTarget')?.value.toString();
    const order = binding.get('order')?.value;
    const name  = binding.get('name')?.value.toString() ?? '<undef>';
    const value = binding.get('value');
    const orderInt = order ? parseInt(order) : 1 ;

    if (executionTarget) {
      // We are ok
    }
    else {
      logger.error(`failed to find a fno:Executes/fno:executes execution target for ${policy}`);
      return;
    }

    let valueTerm; 

    if (value?.termType === 'BlankNode' && value instanceof BlankNodeScoped) {
      valueTerm = unSkolemizedName(value);
    }
    else {
      valueTerm = value;
    }

    if (policies[policy]) {
      if (name && valueTerm) {
        logger.info(`${name} %s`,valueTerm);
        if (policies[policy]['args'][name]) {
          policies[policy]['args'][name].push(valueTerm);
        }
        else {
          policies[policy]['args'][name] = [valueTerm];
        }
      }
    }
    else {
      logger.info(`found policy ${policy} with target ${executionTarget} (order ${orderInt})`);

      policies[policy] = {
        'node': policyNode,
        'path': path,
        'target': executionTarget,
        'order': orderInt,
        'args': {},
        ...xtra
      };
     
      if (name && valueTerm) {
        logger.info(`${name} %s`,valueTerm);
        policies[policy]['args'][name] = [valueTerm];
      }
    }
  });

  logger.debug(`policies:`);
  logger.debug(policies);

  return policies;
}

// Comunica makes skolemnized values out of blank nodes...
// We need the original blank node id so that N3.Store in other 
// part of our code can make use of that
function unSkolemizedName(term: BlankNode) {
    const skolemizedName = (<BlankNodeScoped>term).skolemized.value;
    const unSkolemizedName = skolemizedName.replace(/urn:comunica_skolem:source[^:]+:/, "");
    return new N3.BlankNode(unSkolemizedName);
}
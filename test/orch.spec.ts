import * as N3 from 'n3';
import { makeComponentsManager, concatFiles } from '../src/util';
import { cwd } from 'process';
import { assert } from "chai";
import { Reasoner } from '../src/orchestrator/Reasoner';
import { parseAsN3Store } from '../src/util';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { ComponentsManager } from 'componentsjs';
import { isomorphic } from "rdf-isomorphic";

const myEngine = new QueryEngine();

let manager : ComponentsManager<unknown>;

describe("orch", () => {
    before( async() => {
        manager = await makeComponentsManager('./config/config.jsonld',cwd());
    });
    
    it("can do test00.n3 with test00.rule.n3", async () => {
        const result = await doReason('test/t/test00.n3','test/t/test00.rule.n3');
        const expected = await getStore('test/t/test00.out.n3');
        assert.isTrue(isomorphic([...result], [...expected]));
    });

    it("can do test00.n3 with test01.rule.n3", async () => {
        const result = await doReason('test/t/test00.n3','test/t/test01.rule.n3');
        const test = `
        PREFIX fno: <https://w3id.org/function/ontology#>
        PREFIX ex: <http://example.org/>
        ASK {
            ?x a fno:Execution ;
               fno:executes ex:demoPlugin .
        } 
        `;
        assert.isTrue(await storeContains(result, test));
    });

    it("can do test00.n3 with test02.rule.n3", async () => {
        const result = await doReason('test/t/test00.n3','test/t/test02.rule.n3');
        const test = `
        PREFIX fno: <https://w3id.org/function/ontology#>
        PREFIX ex: <http://example.org/>
        ASK WHERE {
            {
                SELECT ?x ?y  WHERE {
                    ?x a fno:Execution ;
                        fno:executes ex:demoPlugin .
                    
                    ?y a fno:Execution ;
                        fno:executes ex:demoPlugin .
                }
            }
            FILTER (?x != ?y)
        } 
        `;
        assert.isTrue(await storeContains(result, test));
    });

    it("can do test00.n3 with test03.rule.n3", async () => {
        const result = await doReason('test/t/test00.n3','test/t/test03.rule.n3');
        const test = `
        PREFIX fno: <https://w3id.org/function/ontology#>
        PREFIX ex: <http://example.org/>
        PREFIX as:   <https://www.w3.org/ns/activitystreams#>
        ASK WHERE {
            ?x a fno:Execution ;
               fno:executes ex:sendNotification ;
               ex:notification [
                 as:object ex:Test
               ].
        } 
        `;
        assert.isTrue(await storeContains(result, test));
    });

});

async function doReason(dataPath: string, rulePath: string) {
    const reasoner = await manager.instantiate<Reasoner>('urn:koreografeye:reasonerInstance');
    const store = await parseAsN3Store(dataPath);
    const rules = await concatFiles([rulePath]);
    const result  = await reasoner.reason(store,rules);
    return result;
}

async function getStore(path:string) {
    return await parseAsN3Store(path);
}

async function storeContains(store: N3.Store, sparql: string) {
    const answer = await myEngine.queryBoolean(sparql, {
      sources: [store]
    });
    return answer;
}

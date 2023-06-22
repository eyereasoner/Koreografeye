import * as N3 from 'n3';
import { makeComponentsManager, concatFiles } from '../src/util';
import { cwd } from 'process';
import { assert } from "chai";
import { Reasoner } from '../src/orchestrator/Reasoner';
import { parseAsN3Store } from '../src/util';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';

const myEngine = new QueryEngine();

describe("orch", () => {
    it("can do test00", async () => {
        const result = await doReason('test/t/test00.n3','test/t/test00.rule.n3');
        const expected = await getStore('test/t/test00.out.n3');
        assert.deepEqual(result,expected);
    });
});

async function doReason(dataPath: string, rulePath: string) {
    const manager = await makeComponentsManager('./config.jsonld',cwd());
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

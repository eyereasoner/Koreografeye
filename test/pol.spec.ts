import { cwd } from 'process';
import { assert } from "chai";
import { makeComponentsManager } from '../src/util';
import { parseAsN3Store } from '../src/util';
import { executePolicies } from '../src/policy/Executor';

describe("pol", () => {
    it("can do test00", async () => {
        const result = await doPolicy('test/t/test00.out.n3');
        assert.equal(result,0);
    });
});

async function doPolicy(path: string) {
    const manager = await makeComponentsManager('./config.jsonld',cwd());
    const store = await parseAsN3Store(path);
    return await executePolicies(manager,store);
}
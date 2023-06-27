import { cwd } from 'process';
import { assert } from "chai";
import { makeComponentsManager } from '../src/util';
import { parseAsN3Store } from '../src/util';
import { IPolicyExecution, executePolicies } from '../src/policy/Executor';
import { ComponentsManager } from 'componentsjs';
import * as sinon from 'sinon';

const sandbox = sinon.createSandbox();

let manager : ComponentsManager<unknown>;

describe("pol", () => {

    before( async() => {
        manager = await makeComponentsManager('./config.jsonld',cwd());
    });

    beforeEach(() => {
        // stub out the `hello` method
        sandbox.stub(console, "log");
    });
   
    afterEach(() => {
        // completely restore all fakes created through the sandbox
        sandbox.restore();
    });

    it("can do test00.out.n3", async () => {
        const result = await doPolicy('test/t/test00.out.n3');
        const errors = result.filter( (ex: IPolicyExecution) => ! ex.result).length;
        assert.equal(errors,0);
    });

    it("can do test01.out.n3", async () => {
        const result = await doPolicy('test/t/test01.out.n3');
        const errors = result.filter( (ex: IPolicyExecution) => ! ex.result).length;
        assert.equal(errors,0);
    });

    it("can do test02.out.n3", async () => {
        const result = await doPolicy('test/t/test02.out.n3');
        const runs = result.filter( (ex: IPolicyExecution) => ex.result).length;
        assert.equal(runs,1);
    });
});

async function doPolicy(path: string) {
    const store = await parseAsN3Store(path);
    return await executePolicies(manager,store);
}
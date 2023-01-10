import { ComponentsManager } from 'componentsjs';
import * as fs from 'fs';
import * as path from 'path';
import { readText } from "../util";
import { Reasoner } from "./Reasoner";

export async function readRules(rulePaths: string[]): Promise<string[]>{
  const rules: string[] = [];
  rulePaths.filter(path => fs.lstatSync(path).isFile()).forEach(path => {
    const rule = readText(path)
    if (rule) {
      rules.push(rule);
    }
  })
  return rules;
}

export async function instantiateReasoner(componentsPath: string): Promise<Reasoner>{
  const manager = await ComponentsManager.build({
    mainModulePath: path.join(__dirname, '../..') , // Path to your npm package's root
  });

  await manager.configRegistry.register(componentsPath);

  return await manager.instantiate<Reasoner>('urn:mini-orchestator:reasonerInstance');
}
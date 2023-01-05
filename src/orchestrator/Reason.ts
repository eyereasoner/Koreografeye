import { Logger } from "log4js";
import { Store } from "n3";
import * as fs from 'fs';
import * as tmp from 'tmp';
import { spawn } from 'node:child_process';

import { parseStringAsN3Store, rdfTransformStore } from "../util";

export async function reason(dataStore: Store, config: any, rulePaths: string[], logger: Logger): Promise<Store> {
  const eye = config['eye'];
  const eyeargs = config['args'];

  const n3 = await rdfTransformStore(dataStore, 'text/turtle');

  if (!n3) {
    throw new Error(`failed to transform store to turtle`);
  }

  logger.trace(n3);

  const tmpobj = tmp.fileSync();

  if (!tmpobj) {
    throw new Error(`failed to create tmp object`);
  }

  logger.debug(`tmp file: ${tmpobj.name}`);

  logger.debug(`writing n3 to ${tmpobj.name}`);
  fs.writeFileSync(tmpobj.name, n3);

  eyeargs.push(tmpobj.name);
  rulePaths.filter(f => fs.lstatSync(f).isFile()).forEach(r => eyeargs.push(r));

  logger.info(`${eye}`);
  logger.info(`eye args: ${eyeargs}`);

  const result = await eyeRunner(eye, eyeargs)
  tmpobj.removeCallback();
  const resultStore = await parseStringAsN3Store(result)

  return resultStore
}

async function eyeRunner(eye: string, args: string[]): Promise<string> {
  return new Promise<string>(async (resolve, reject) => {
    let errorData = '';
    let resultData = '';

    const ls = spawn(eye, args);
    ls.stdout.on('data', (data) => {
      resultData += data;
    });
    ls.stderr.on('data', (data) => {
      errorData += data;
    });
    ls.on('close', (code) => {
      if (code != 0) {
        return reject(errorData);
      }
      else {
        return resolve(resultData);
      }
    });
  })
}
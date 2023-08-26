import { readJsonSync } from 'fs-extra';
import type { IJsonLdContext } from 'jsonld-context-parser';
import { FetchDocumentLoader } from 'jsonld-context-parser';
import * as path from 'path';

export const CONTEXTS = {
    'https://www.w3.org/ns/activitystreams': path.join(__dirname,'../cache/activitystreams.jsonld'),
    'https://purl.org/coar/notify': path.join(__dirname,'../cache/notify.jsonld')
};

/**
 * A custom context document loader for the rdf-parse library.
 * This will prevent network access for accessing the context documents
 * that are cached in the CONTEXTS hash.
 * @returns FetchDocumentLoader
 */
export function jsonldContextDocumentLoader() : FetchDocumentLoader {
    return new ContextDocumentLoader(CONTEXTS);
}

/**
 * A custom context document loader for the jsonld library
 * @returns any
 */
export function frameContext() : any {
    let contexts : any = {};

    for (const [ key, path ] of Object.entries(CONTEXTS)) {
        contexts[key] = ( readJsonSync(path)['@context'] );
    } 

    return contexts;
}

export class ContextDocumentLoader extends FetchDocumentLoader {
    private readonly contexts: Record<string, IJsonLdContext>;
  
    public constructor(contexts: Record<string, string>) {
      super(fetch);
      this.contexts = {};
      for (const [ key, path ] of Object.entries(contexts)) {
        this.contexts[key] = readJsonSync(path);
      }
    }
  
    public async load(url: string): Promise<IJsonLdContext> {
      if (url in this.contexts) {
        return this.contexts[url];
      }
      return super.load(url);
    }
  }
import { readJsonSync } from 'fs-extra';
import type { IJsonLdContext } from 'jsonld-context-parser';
import { FetchDocumentLoader } from 'jsonld-context-parser';

const CONTEXTS = {
    'https://www.w3.org/ns/activitystreams': './cache/activitystreams.jsonld',
    'https://purl.org/coar/notify': './cache/notify.jsonld'
};

export function jsonldContextDocumentLoader() {
    return new ContextDocumentLoader(CONTEXTS);
}

export function frameContext() {
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
import * as N3 from 'n3';
import * as fs from 'fs';
import * as path from 'path';
import * as jsonld from 'jsonld';
import * as RDF from '@rdfjs/types';
import rdfParser from 'rdf-parse';
import rdfSerializer from 'rdf-serialize';
import { posix, win32 } from 'path';
import stringifyStream = require('stream-to-string');
import streamifyString = require('streamify-string');
import {v4 as uuidv4} from 'uuid';
import { ComponentsManager } from 'componentsjs';
import { KeysRdfParseJsonLd } from '@comunica/context-entries';
import { jsonldContextDocumentLoader , frameContext } from './contextloader';

/**
 * Load a text file and return it as a string.
 * If the file does not exist, return undefined.
 * 
 * @param path - the location of a text file.
 * @returns a string representing the input file.
 */
export function readText(path: string): string | undefined {
    try {
        if (! fs.existsSync(path)) {
            return undefined;
        }
        return '' + fs.readFileSync(path, {encoding:'utf8', flag:'r'})
    }
    catch (e) {
        throw new Error(`readText(${path}) failed: ${e}`);
    }
}

/**
 * Parse an input file and return the parsed N3.Store
 * 
 * @param path - the location of an RDF input file
 * @returns The parsed N3.Store
 */
export async function parseAsN3Store(path: string) : Promise<N3.Store> {
    const rdfData = '' + fs.readFileSync(path, {encoding:'utf8', flag:'r'});

    const n3Data = await rdfTransformString(rdfData, path, 'text/n3');
    
    const store = await parseStringAsN3Store(n3Data);
    return store;
}

/**
 * Parses an N3 input file and returns it as a parsed N3 Store.
 * 
 * @param path - the location of an N3 rules input file
 * @returns The parsed N3 Store
 */
export async function parseRulesAsN3Store(path: string) : Promise<N3.Store> {
    const rdfData = '' + fs.readFileSync(path, {encoding:'utf8', flag:'r'});
    const store = await parseStringAsN3Store(rdfData, {format:'text/n3'});
    return store;
}
/**
 * Parse an RDF string and return the parsed N3.Store
 * 
 * @param n3Data - the RDF data as string
 * @returns The parsed N3.Store
 */
export async function parseStringAsN3Store(n3Data: string, options:any ={}): Promise<N3.Store> {
    const parser       = new N3.Parser(options);
    const store        = new N3.Store();
  
    return new Promise<N3.Store>((resolve, reject) => {
      parser.parse(n3Data, (error, quad, _) => {
        if (error) {
          reject(error);
        }
        else if (quad) {
          store.addQuad(quad);
        }
        else {
          resolve(store);
        }
      });
    });
}

/**
 * Transform an RDF input string from one serialization to another
 * 
 * @param data - a string of RDF
 * @param fileName - a file name used to guess the content type of the data string
 * @param outType - the content-type of the output expected
 * @returns The serialized RDF
 */
export async function rdfTransformString(data: string, fileName: string, outType: string ): Promise<string> {
    const inStream = streamifyString(data);

    // Guess the content-type from the path name
    const quadStream = rdfParser.parse(inStream, { 
        path:fileName ,
        [KeysRdfParseJsonLd.documentLoader.name]: jsonldContextDocumentLoader()
    });
    const outStream = rdfSerializer.serialize(quadStream, { contentType: outType });
    return await stringifyStream(outStream);
}

/**
 * Transform an N3.Store into an RDF string of a particular serialization
 * @param store - an N3.Store
 * @param outType - the content-type of the output
 * @returns The serialized RDF
 */
export async function rdfTransformStore(store: N3.Store, outType: string): Promise<string> {
    if (outType === 'text/n3') {
        return n3TransformStore(store);
    }
    const outStream = rdfSerializer.serialize(
                store.match(undefined,undefined,undefined,undefined), { contentType: outType } 
    );
    return await stringifyStream(outStream);
}

/**
 * Stub: currently does not serialize N3 properly
 * 
 * @param store - an N3 Store.
 * @returns The serialized N3.
 */
export async function n3TransformStore(store: N3.Store): Promise<string> {
    const outStream = rdfSerializer.serialize(
        store.match(), { contentType: 'text/n3' } 
    );
    return await stringifyStream(outStream);
}

/**
 * Parse a JSON-LD string with a frame JSON object into a new JSON-LD string
 * 
 * @param jsonstr - a JSON-LD string
 * @param frame - a JSON-LD frame object
 * @param cache - an optional cached version of a JSON-LD frame
 * @returns The framed JSON
 */
export async function jsonldStrFrame(jsonstr:string, frame: any): Promise<jsonld.NodeObject> {
    const doc = JSON.parse(jsonstr);

    // Some logic to match remote @context documents against local cached versions
    const tmpFrame = {...frame};

    if ('@context' in tmpFrame) {
        const context = tmpFrame['@context'];
        const contextMap = frameContext();

        if (typeof context === 'string' && context in contextMap) {
            tmpFrame['@context'] = contextMap[context];
        }
        else if (Array.isArray(context)) {
            tmpFrame['@context'] = context.map( (item) => {
                if (typeof item === 'string' && item in contextMap) {
                    return contextMap[item];
                }
                else {
                    return item;
                }
            });
        }
        else {
            // We are happy keep the context as is...
        }
    }

    const framed = await jsonld.frame(doc, tmpFrame);

    // Set the @context back what it was
    if (frame["@context"]) {
        framed['@context'] = frame["@context"];
    }

    return framed;
}

/**
 * Return all identifiers of subjects that are not an object in an RDF graph
 * @param store - a N3.Store
 * @returns All main subjects of a graph
 */
export function topGraphIds(store: N3.Store): string[] {
    const subjectList = new Set<string>();
    const objectList = new Set<string>() ;

    store.forSubjects( s => { subjectList.add(s.id)} , null, null, null);
    store.forObjects( o => { objectList.add(o.id)}, null, null, null);

    // Remove all the subject that are the object of something
    objectList.forEach( o => {
        if (subjectList.has(o)) {
            subjectList.delete(o);
        }
    });

    return Array.from(subjectList);
}

/**
 * Given an N3 store and a predicate return first matching Blank Node or Named Node value in the store
 * 
 * @param store - a N3.Store
 * @param predicate a string predicte
 * @returns The first matching Blank Node or Named Node
 */
export function storeGetPredicate(store: N3.Store, predicate: string) : N3.BlankNode | N3.NamedNode | null {
    let object = null;

    store.forEach( quad => {
        object = quad.object;
    }, null, N3.DataFactory.namedNode(predicate), null, null);

    return object;
}

/**
 * Add a blank node with predicate/object with a Named Node value to the store
 * 
 * @param store - a N3.Store
 * @param predicate - a predicate URL string
 * @param object - an object URL string
 */
export function storeAddPredicate(store: N3.Store, predicate: string, object: string) : void {
    store.addQuad(
        N3.DataFactory.blankNode(), 
        N3.DataFactory.namedNode(predicate),
        N3.DataFactory.namedNode(object) ,
        N3.DataFactory.defaultGraph()
    );
}

export function groundStore(store: N3.Store) : N3.Store {
    const result = new N3.Store();
    const genpref = uuidv4();
    const DF = N3.DataFactory;
    const GROUND_URL = 
        'https://github.com/eyereasoner/Koreografeye/.well-known/genid/' + genpref + '/';

    const makeGenId = (str:string) => {
        return DF.namedNode(GROUND_URL + '#' + str);
    };
    store.forEach( (quad) => {
        const subject   = quad.subject.termType.toString() === 'BlankNode' ?
                        makeGenId(quad.subject.value) :
                        quad.subject;

        const predicate = quad.predicate.termType.toString() === 'BlankNode' ?
                        makeGenId(quad.predicate.value) :
                        quad.predicate;

        const object    = quad.object.termType.toString() === 'BlankNode' ?
                        makeGenId(quad.object.value) :
                        quad.object;
        result.addQuad(
            subject, predicate, object, quad.graph  
        );
    },null,null,null,null);

    return result;
}

/**
 * Return an N3 store containing only the triples that are subject of the given identifier
 * 
 * @param store - a N3 store
 * @param subject - the subject for which you want to have the sub graph
 * @returns a N3 Store with the sub-graph
 */
export function extractGraph(store: N3.Store, subject: RDF.Term): N3.Store<RDF.Quad, N3.Quad, RDF.Quad, RDF.Quad> {
    const newStore = new N3.Store();

    store.forEach( quad => {
        newStore.addQuad(quad);

        const type = quad.object.termType;

        if (type == 'NamedNode' || type == 'BlankNode') {
            const otherStore = extractGraph(store, quad.object);

            if (otherStore.size > 0) {
                otherStore.forEach( otherQuad => {
                    newStore.add(otherQuad);
                }, null, null, null, null);
            }
        }
    }, subject, null, null, null );

    return newStore;
}

/**
 * Renames a subject in a graph to a new IRI. This can be used e.g. to rename the 
 * main topic of a graph.
 * @param store - a N3.Store
 * @param old_subject - the IRI of the current subject
 * @param new_subject - the IRI of the new subject
 * @returns A new N3.Store with the renamed subject
 */
export function renameSubjectInGraph(store: N3.Store, old_subject: RDF.Term, new_subject: RDF.NamedNode | RDF.BlankNode) : N3.Store<RDF.Quad, N3.Quad, RDF.Quad, RDF.Quad> {
    const newStore = new N3.Store();

    store.forEach( quad => {
        if (quad.subject.equals(old_subject)) {
            newStore.addQuad(
                new_subject ,
                quad.predicate ,
                quad.object ,
                quad.graph
            );
        }
        else {
            newStore.addQuad(quad);
        }
    }, null, null, null, null );

    return newStore;
} 

/**
 * Generate a UUID string
 * 
 * @returns A new N3.NamedNode with the UUID
 */
export function generate_uuid(): N3.NamedNode<string>  {
    return N3.DataFactory.namedNode('urn:uuid:' + uuidv4());
}

/**
 * Copied from https://raw.githubusercontent.com/CommunitySolidServer/CommunitySolidServer/main/src/util/PathUtil.ts
 * Start->
 */

/**
 * Changes a potential Windows path into a POSIX path.
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
function windowsToPosixPath(path: string): string {
    return path.replace(/\\+/gu, '/');
}

/**
 * Resolves relative segments in the path.
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
export function normalizeFilePath(path: string): string {
    return posix.normalize(windowsToPosixPath(path));
}

/**
 * Adds the paths to the base path.
 *
 * @param basePath - The base path (POSIX or Windows).
 * @param paths - Subpaths to attach (POSIX).
 *
 * @returns The potentially changed path (POSIX).
 */
export function joinFilePath(basePath: string, ...paths: string[]): string {
    return posix.join(windowsToPosixPath(basePath), ...paths);
}

/**
 * Resolves a path to its absolute form.
 * Absolute inputs will not be changed (except changing Windows to POSIX).
 * Relative inputs will be interpreted relative to process.cwd().
 *
 * @param path - Path to check (POSIX or Windows).
 *
 * @returns The potentially changed path (POSIX).
 */
export function absoluteFilePath(path: string): string {
    if (posix.isAbsolute(path)) {
      return path;
    }
    if (win32.isAbsolute(path)) {
      return windowsToPosixPath(path);
    }
  
    return joinFilePath(process.cwd(), path);
}
  
/**
 * Makes sure the input path has exactly 1 slash at the end.
 * Multiple slashes will get merged into one.
 * If there is no slash it will be added.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function ensureTrailingSlash(path: string): string {
    return path.replace(/\/*$/u, '/');
}

/**
 * Makes sure the input path has no slashes at the end.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function trimTrailingSlashes(path: string): string {
    return path.replace(/\/+$/u, '');
}
  
/**
 * Makes sure the input path has exactly 1 slash at the beginning.
 * Multiple slashes will get merged into one.
 * If there is no slash it will be added.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function ensureLeadingSlash(path: string): string {
    return path.replace(/^\/*/u, '/');
}
  
/**
 * Makes sure the input path has no slashes at the beginning.
 *
 * @param path - Path to check.
 *
 * @returns The potentially changed path.
 */
export function trimLeadingSlashes(path: string): string {
    return path.replace(/^\/+/u, '');
}
  
/**
 * Extracts the extension (without dot) from a path.
 * Custom function since `path.extname` does not work on all cases (e.g. ".acl")
 * @param path - Input path to parse.
 */
export function getExtension(path: string): string {
    const extension = /\.([^./]+)$/u.exec(path);
    return extension ? extension[1] : '';
}

/**
 * Return a concatenation of all paths
 * @param paths An array of file paths 
 * @returns An array of concatenated file texts
 */
export async function concatFiles(paths: string[]): Promise<string[]>{
    const data: string[] = [];
    paths.filter(path => fs.lstatSync(path).isFile()).forEach(path => {
      const text = readText(path)
      if (text) {
        data.push(text);
      }
    })
    return data;
}

/**
 * Create a componentsJs manager from a compontentsPath
 * @param componentsPath The components confirguration
 * @param modulePath The search path for a components configuration
 * @returns Promise<CompontentsManager<unknown>>
 */
export async function makeComponentsManager(componentsPath: string, modulePath?: string) : Promise<ComponentsManager<unknown>> {
    let mp = modulePath;

    if (mp === undefined) {
        mp = path.join(__dirname, '.');
    }
 
    const manager = await ComponentsManager.build({
        mainModulePath: mp
    });
      
    await manager.configRegistry.register(componentsPath);

    return manager;
}

/**
 * <-End
 */
import * as N3 from 'n3';
import * as fs from 'fs';
import * as jsonld from 'jsonld';
import * as RDF from '@rdfjs/types';
import rdfParser from 'rdf-parse';
import rdfSerializer from 'rdf-serialize';
import stringifyStream = require('stream-to-string');
import streamifyString = require('streamify-string');
import {v4 as uuidv4} from 'uuid';

export type IPolicyType = {
    node:  N3.NamedNode | N3.BlankNode , 
                          // Policy node
    path: string ,        // Input file
    policy: string ,      // Policy identifier
    target: string ,      // Name of execution target (the idenfier of the policy function)
    mainSubject: string , // Activity identifier
    origin: string ,      // Path to original activity
    args: {               // Name/Value pairs of policy arguments
        [key : string]: RDF.Term | undefined 
    } ,
    config: {             // Name/Value pairs passed via a configuration setting
        [key : string] : any    
    }
};

/**
 * Load a JSON configuration file and returns the parsed content or undefined on error.
 * 
 * @params path - the location off the configuration file
 * @returns JSON object | undefined
 */
export function loadConfig(path:string): any | undefined {
    if (! fs.existsSync(path)) {
        return undefined;
    }
    const cfg = fs.readFileSync(path,{encoding:'utf8', flag:'r'});
    return JSON.parse(cfg);
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
    const quadStream = rdfParser.parse(inStream, { path:fileName });
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
 * @returns The framed JSON
 */
export async function jsonldStrFrame(jsonstr:string, frame: any): Promise<jsonld.NodeObject> {
    const doc = JSON.parse(jsonstr);
    
    const framed =  await jsonld.frame(doc, frame);

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
 * Add a new predicate with a Named Node value to the store
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
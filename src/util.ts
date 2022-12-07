import * as N3 from 'n3';
import * as fs from 'fs';
import * as jsonld from 'jsonld';
import * as RDF from '@rdfjs/types';
import rdfParser from 'rdf-parse';
import rdfSerializer from 'rdf-serialize';
import stringifyStream = require('stream-to-string');
import streamifyString = require('streamify-string');

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

export function loadConfig(path:string) {
    if (! fs.existsSync(path)) {
        return undefined;
    }
    const cfg = fs.readFileSync(path,{encoding:'utf8', flag:'r'});
    return JSON.parse(cfg);
}

export async function parseAsN3Store(path: string) : Promise<N3.Store> {
    const parser       = new N3.Parser();
    const store        = new N3.Store();

    const rdfData = '' + fs.readFileSync(path, {encoding:'utf8', flag:'r'});

    const n3Data = await rdfTransformString(rdfData, path, 'text/n3');

    return new Promise<N3.Store>( (resolve,reject) => {
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

export async function rdfTransformString(data: string, fileName: string, outType: string ) {
    const inStream = streamifyString(data);
    // Guess the content-type from the path name
    const quadStream = rdfParser.parse(inStream, { path:fileName });
    const outStream = rdfSerializer.serialize(quadStream, { contentType: outType });
    return await stringifyStream(outStream);
}

export async function rdfTransformStore(store: N3.Store, outType: string) {
    const outStream = rdfSerializer.serialize(
                store.match(undefined,undefined,undefined,undefined), { contentType: outType } 
    );
    return await stringifyStream(outStream);
}

export async function jsonldStrFrame(jsonstr:string, frame: any) {
    const doc = JSON.parse(jsonstr);
    
    const framed =  await jsonld.frame(doc, frame);

    return framed;
}

// Return all identifiers of subjects that are not an object in an RDF graph
export function topGraphIds(store: N3.Store) {
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

export function storeGetPredicate(store: N3.Store, predicate: string) : N3.BlankNode | N3.NamedNode | null {
    let object = null;

    store.forEach( quad => {
        object = quad.object;
    }, null, N3.DataFactory.namedNode(predicate), null, null);

    return object;
}

export function storeAddPredicate(store: N3.Store, predicate: string, object: string) {
    store.addQuad(
        N3.DataFactory.blankNode(), 
        N3.DataFactory.namedNode(predicate),
        N3.DataFactory.namedNode(object) ,
        N3.DataFactory.defaultGraph()
    );
}

// Return an N3 store containing only the triples that are subject of the given identifier
export function extractGraph(store: N3.Store, subject: N3.NamedNode | N3.BlankNode) {
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
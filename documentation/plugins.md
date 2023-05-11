- # Plugins

Koreografeye plugins implement the side-effects for the policy executor. These plugins handle sending emails, updating Solid Pod, sending notifications, start engines and fire rockets. The plugins require an entry in the `config.jsonld` Components.js configuration file and a JavaScript/Typescript implementation.

Each Koreografeye plugin is a javascript class that extends `PolicyPlugin` and should implement
a `policyTarget` function with the following signature:

```
export async function policyTarget(mainStore: N3.Store, policyStore: N3.Store , policy: IPolicyType) : Promise<boolean>;
```

where:

- mainStore: an `N3.Store` containing the parsed input file (without the policies)
- policyStore: an `N3.Store` containing the current active parsed policy
- policy: an `IPolicyType` structure containg all parameters for the requested policy:
    - *node*   : `N3.NamedNode | N3.BlankNode` : the policy node ()
    - *path*   : `string` : path to the input file
    - *policy* : `string` : identifier of the policy instance
    - *target* : `string` : identifier of the policy target
    - *mainSubject* : `string` : the activity identifier of the notification
    - *origin* : `string` : path to the original notification input file
    - *order*  : `integer` : the execution order of the policy (default : 1)
    - *args*   : `any { [key: string] : RDF.Term | undefined }`  : key/value pairs of all arguments that were provided for the policy

An example `IPolicyType` contents (in JSON):

_After running rules/00_demo.n3 on data/demo.ttl_

```
{
    "node": {
        "termType": "NamedNode",
        "value": "http://example.org/MyDemoPolicy"
    },
    "path": "out/demo.ttl",
    "policy": "bc_0_b1_b0_bn_1",
    "target": "http://example.org/demoPlugin",
    "args": {
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": {
            "termType": "NamedNode",
            "value": "https://w3id.org/function/ontology#Execution"
        },
        "https://w3id.org/function/ontology#executes": {
            "termType": "NamedNode",
            "value": "http://example.org/demoPlugin"
        },
        "http://example.org/param1": {
            "termType": "Literal",
            "value": "my@myself.and.i",
            "language": "",
            "datatype": {
                "termType": "NamedNode",
                "value": "http://www.w3.org/2001/XMLSchema#string"
            }
        },
        "http://example.org/param2": {
            "termType": "Literal",
            "value": "you@yourself.edu",
            "language": "",
            "datatype": {
                "termType": "NamedNode",
                "value": "http://www.w3.org/2001/XMLSchema#string"
            }
        },
        "http://example.org/body": {
            "termType": "NamedNode",
            "value": "urn:uuid:42D2F3DC-0770-4F47-BF37-4F01E0382E32"
        }
    },
    "mainSubject": "urn:uuid:42D2F3DC-0770-4F47-BF37-4F01E0382E32",
    "origin": "file:///var/folders/g8/czx2gjfs3_bbvvk1hjlcsj9m0000gn/T/in/demo.ttl"
}
```
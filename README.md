# Mini Orchestrator

This is miniature implementation of an orchestrator implementing the [Orchestrator for a decentralized Web network](https://mellonscholarlycommunication.github.io/spec-orchestrator/) specification.

## Installation

```
npm install
```

## Usage

- Put ActivityStreams notifications in the `in` directory
- Put N3 rules in the `rules` directory
- Run `bin/orch --keep rules/*` to run the rules on alle in notification in the `in` directory
    - Use the `--keep` option if you don't want to automatic clean the `in` after processing notifications
    - The processed notifications will end up in the `out` directory
- Run `bin/pol --keep` to run the policy executor with all the processed notifications from the `out` directory
    - Use the `--keep` option if you don't want to automatic clean the `out` after processing notifications

## Commands

### orch

Run the orchstrator with one or more N3 rule files on an input directory
of notifications.

*bin/orch [options] rule [rule ...]*

Options:

- --in *directory* : directory with input notifications
- --out *directory* : directory with orchestrator output
- --err *directory* : directory with failed notifications
- --keep : keep the --in data (don't delete after processing)

### pol

Run a policy executor on one of the output files of the orchestrator

*bin/pol [options] file*

Options:

- --info : verbose messages
- --debug : debug messages
- --trace : trace messages

Requires:

- `plugin.json` : configuration file with JavaScript plugin

Example configuration:

```
{
    "http://example.org/sendEmail": "./plugin/sendEmail"
}
```

Each plugin should implement a `policyTarget` function with the following
signature:

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
    - *origin* : `string` : path to the original notifiction input file
    - *args*   : `any { [key: string] : RDF.Term | undefined }`  : key/value pairs of all arguments that were provided for the policy
    - *config* : `any { [key: string] : any}` : configuration settings from plugin.json for the target

## Known issues

- Policies **must** be provided using named nodes:

*correct*

```
 ex:MyDemoPolicy pol:policy [
      a fno:Execution ;
      fno:executes ex:demoPlugin ;
      ex:param1 "my@myself.and.i" ;
      ex:param2 "you@yourself.edu" ;
  ] .
```

*incorrect*

```
 [ pol:policy [
      a fno:Execution ;
      fno:executes ex:demoPlugin ;
      ex:param1 "my@myself.and.i" ;
      ex:param2 "you@yourself.edu" ;
      ex:subject "A new resource was created!" ;
      ex:body ?s 
  ] ] .
```
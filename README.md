# Mini Orchestrator

This is miniature implementation of an orchestrator implementing the [Orchestrator for a decentralized Web network](https://mellonscholarlycommunication.github.io/spec-orchestrator/) specification.

## Installation

```
npm install
```

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

*bin/pol [options] file

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
export async function policyTarget(store: N3.Store, policy: any) : Promise<boolean>;
```

where:

- store: an `N3.Store` containing the parsed input file
- policy: a structure containf all parameters for the requested policy:
    - *path*: path to the input file
    - *policy* : identifier of the policy instance
    - *target* : identifier of the policy
    - *args* : key/value pairs of all arguments that were provided for the policy
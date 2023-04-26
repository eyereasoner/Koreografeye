# Koreografeye

[![npm](https://img.shields.io/npm/v/koreografeye)](https://www.npmjs.com/package/koreografeye)

Koreografeye is a choreography engine for linked data services using
[Notation3](https://w3c.github.io/N3/spec/) (N3) rule engines such 
as [EYE](https://github.com/eyereasoner/eye). 

Koreografeye was created to facilitate automated processes against [Solid](https://solidproject.org/TR/protocol) pods. Our main use case is monitoring the [LDN](https://www.w3.org/TR/ldn/) Inbox of Solid Pods for new notifications and running scripts when new data arrives.

## Usage

### Configuration

Create a project directory

```
mkdir demo
cd demo
```

Add the koreografeye dependency

```
npm install koreografeye
```

Create input, output and rules directories

```
mkdir input output rules
```

Copy a version of `config.jsonld` to this directory

```
wget https://raw.githubusercontent.com/eyereasoner/Koreografeye/main/config.jsonld
```

### Prepare some input data

Put a `demo.jsonld` AS2 notification in the `input` directory

```
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://purl.org/coar/notify"
  ],
  "id": "urn:uuid:0370c0fb-bb78-4a9b-87f5-bed307a509dd",
  "type": "Offer",
  "actor": {
    "id": "https://mypod.org/profile/card#me",
    "name": "Freddy Test",
    "type": "Person"
  },
  "object": "https://research-organisation.org/repository/preprint/201203/421/"
}
```

Create a `demo.n3` N3 rule file in the `rules` directory

```
@prefix ex:   <http://example.org/> .
@prefix as:   <https://www.w3.org/ns/activitystreams#> .
@prefix pol:  <https://www.example.org/ns/policy#> .
@prefix fno:  <https://w3id.org/function/ontology#> .

{
  # pol:mainSubject defines the top level identifier of the notification
  [ pol:mainSubject ?id ] .
 
  # if we get an offer 
  ?id a as:Offer .
  ?id as:actor ?actor .
}
=>
{
    # Send an accept notification to an LDN inbox
    ex:MySendNotificationDemo pol:policy [
        a fno:Execution ;
        fno:executes ex:sendNotification ;
        ex:to <http://httpbin.org/post> ;
        ex:notification [
                a as:Accept ;
                as:inReplyTo ?id ;
                as:actor     <http://my.service.edu/profile/card#me> ;
                as:object    ?id
        ]
    ] .
}.
```

### Run orch

The `orch` command will take the input data and use the N3 rules to decide what to do with the data. No actions are taken yet. These will be done by the `pol` command.

```
npx orch --info --keep --in input --out output rules/*
```

The processed notifications will end up in the `output` directory

### Run pol

The `pol` command will take the output of the `orch` command and execute the requested
policies defined with the N3 rules.

```
npx pol --info --keep --in output
```

The result will be an AS2 that is send to the `http://httpbin.org/post` address.

### Experiment

Using Koreografeye plugins you can experiment with:

- Sending emails
- Sending notifications
- Sending push messages to your phone

Check the Git repository https://github.com/eyereasoner/Koreografeye for more examples.

We use the [Bashlib](https://solidlabresearch.github.io/Bashlib/) to monitor remote Solid LDN inboxes for new notification.

### Typescript/javascript

Small Javascript example to execute Koreografeye using [`demo.ttl`](./data/demo.ttl) and [`00_demo.n3`](./rules/00_demo.n3).

```javascript
const { EyeJsReasoner } = require('./dist/orchestrator/reasoner/EyeJsReasoner')
const { executePolicies } = require('./dist/policy/Executor');
const { parseAsN3Store, readText, storeAddPredicate, makeComponentsManager } = require('./dist/util');

const store = await parseAsN3Store('./data/demo.ttl'); // input graph
const rules = [readText('./rules/00_demo.n3')]; // array of n3 rules serialized as string

// add main subject and origin for the reasoner
const mainSubject = 'urn:uuid:42D2F3DC-0770-4F47-BF37-4F01E0382E32';
storeAddPredicate(store, 'https://www.example.org/ns/policy#mainSubject', mainSubject);
storeAddPredicate(store, 'https://www.example.org/ns/policy#origin', './data/demo.ttl');

// execute reasoning (orchestration)
const reasoner = new EyeJsReasoner([ "--quiet" , "--nope" , "--pass"])
const reasoningResult = await reasoner.reason(store, rules);

const manager = await makeComponentsManager('./config.jsonld','.');

// execute policies
await executePolicies(manager, reasoningResult);
```

Note: for this code to run, the project has to be compiled first (`npm run build`).

## Commands

### orch

Run the orchstrator with one or more N3 rule files on an input directory
of notifications.

*bin/orch [options] rule [rule ...]*

Options:

- --config *file* : orchestrator configuration file
- --in *directory* : directory with input notifications
- --out *directory* : directory with orchestrator output
- --err *directory* : directory with failed notifications
- --keep : keep the --in data (don't delete after processing)
- --info : verbose messages
- --debug : debug messages
- --trace : trace messages

### pol

Run a policy executor on one of the output files of the orchestrator

*bin/pol [options] file*

Options:

- --config *file* : orchestrator configuration file
- --in *directory* : directory with input notifications
- --out *directory* : directory with orchestrator output
- --err *directory* : directory with failed notifications
- --keep : keep the --in data (don't delete after processing)
- --info : verbose messages
- --debug : debug messages
- --trace : trace messages

## Examples implementations

- [KoreografeyeDemo](https://github.com/eyereasoner/KoreografeyeDemo) : A demonstration koreografeye project
- [KoreografeyePluginDemo](https://github.com/eyereasoner/KoreografeyePluginDemo) : A demonstration how to create new plugins for koreografeye
- [Koreografeye-Solid](https://github.com/eyereasoner/Koreografeye-Solid) : A plugin that can update a Solid pod
- [Koreografeye-Mastodon](https://github.com/eyereasoner/Koreografeye-Mastodon) : A plugin that can send a toot to a Mastodon user
- [OAI-Bridge](https://github.com/MellonScholarlyCommunication/OAI-Bridge) : A service that turns [OAI-PMH](https://www.openarchives.org/pmh/) services into [Event Notifications](https://www.eventnotifications.net) services
- [Solid-Agent](https://github.com/woutslabbinck/Solid-Agent) : Koreografeye as part of a rule-based intelligent software agent for Solid pods.

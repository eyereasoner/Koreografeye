# Koreografeye

[![npm](https://img.shields.io/npm/v/koreografeye)](https://www.npmjs.com/package/koreografeye)

Koreografeye is a choreography / orchestration engine for linked data services using [Notation3](https://w3c.github.io/N3/spec/) (N3) rule engines such as [EYE](https://github.com/eyereasoner/eye). 

Koreografeye was created to facilitate automated processes against [Solid](https://solidproject.org/TR/protocol) pods. Our main use case is monitoring the [LDN](https://www.w3.org/TR/ldn/) Inbox of Solid Pods for new notifications and running scripts when new data arrives.

## Usage

### Configuration

Create a project directory.

```
mkdir demo
cd demo
```

Add the `koreografeye` dependency (and `solid-bashlib` in case you want to monitor private Solid resources).

```
npm install koreografeye
npm install solid-bashlib
```

Create input, output and rules directories.

```
mkdir input output rules
```

### Prepare some input data

Put a `demo.jsonld` AS2 notification in the `input` directory.

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

Create a `demo.n3` N3 rule file in the `rules` directory.

```
@prefix ex:   <http://example.org/> .
@prefix as:   <https://www.w3.org/ns/activitystreams#> .
@prefix pol:  <https://www.example.org/ns/policy#> .
@prefix fno:  <https://w3id.org/function/ontology#> .

{
    # if we get an offer 
    ?id a as:Offer .
    ?id as:actor ?actor .
}
=>
{
    # Send an accept notification to an LDN inbox
    ex:MySendNotificationDemo pol:policy ex:MySendNotificationDemoExecution.
    ex:MySendNotificationDemoExecution 
        a fno:Execution ;
        fno:executes ex:sendNotification ;
        ex:to <http://httpbin.org/post> ;
        ex:notification ex:MyNotification .
    
    ex:MyNotification 
        a as:Accept ;
        as:inReplyTo ?id ;
        as:actor     <http://my.service.edu/profile/card#me> ;
        as:object    ?id .
}.
```

### Run orch

The `orch` command will take the input data and use the N3 rules to decide what to do with the data. No actions are taken yet. These will be done by the `pol` command.

```
npx orch --info --keep --in input --out output rules/demo.n3
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
- Updating Solid Pods
- Sending toot messages to a Mastodon account

Check the Git repository https://github.com/eyereasoner/Koreografeye for more examples.

We use the [Bashlib](https://github.com/SolidLabResearch/Bashlib) to monitor remote Solid LDN inboxes for new notification.

E.g. move the contents of your inbox to the `input` directory.

```
npx sld mv https://yourpod.org/inbox/ input/
```

This assumes you have an authenticated Bashlib session. Use the bashlib `auth create-token` command to create a token for the CSS Solid pod.

### Typescript/javascript

One can also use JavaScript to execute the `orch` and `pol` commands:

```javascript
const { 
    parseAsN3Store, 
    readText, 
    topGraphIds, 
    storeAddPredicate, 
    makeComponentsManager,
    executePolicies
} = require('koreografeye');

main();

async function main() {
    const inputData  = './input/demo.jsonld';
    const inputRules = './rules/demo.n3';

    // Read the input graph as an N3 store
    const store  = await parseAsN3Store(inputData); 
    // Read the N3 rules as an array of strings
    const rules  = [readText(inputRules)]; 

    // Load the components we need for reasoning
    const manager = await makeComponentsManager(undefined,'.');

    // Get a reasoner
    const reasoner = await manager.instantiate('urn:koreografeye:reasonerInstance');

    // Execute the reasoner (orch)
    const resultStore = await reasoner.reason(store, rules);

    // Execute the policies (pol)
    const numOfErrors = await executePolicies(manager, resultStore);

    console.log(`found ${numOfErrors} errors`);
}
```

Run this code with:

```
node demo.js
```

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
- --single *file* : process only a single file
- --keep : keep the --in data (don't delete after processing)
- --info : verbose messages
- --debug : debug messages
- --trace : trace messages

### pol

Run a policy executor on one of the output files of the orchestrator

*bin/pol [options]*

Options:

- --config *file* : orchestrator configuration file
- --in *directory* : directory with input notifications
- --out *directory* : directory with orchestrator output
- --err *directory* : directory with failed notifications
- --single *file* : process only a single file
- --keep : keep the --in data (don't delete after processing)
- --info : verbose messages
- --debug : debug messages
- --trace : trace messages

## Examples implementations

- [KoreografeyeDemo](https://github.com/eyereasoner/KoreografeyeDemo) : A demonstration koreografeye project
- [Koreografeye-Plugin](https://github.com/eyereasoner/Koreografeye-Plugin) : A collection of Koreografeye plugins to send emails, update Solid pods, send Mastodon toots, etc...
- [OAI-Bridge](https://github.com/MellonScholarlyCommunication/OAI-Bridge) : A service that turns [OAI-PMH](https://www.openarchives.org/pmh/) services into [Event Notifications](https://www.eventnotifications.net) services
- [CitationExtractorService](https://github.com/MellonScholarlyCommunication/CitationExtractorService) : A service node that extracts citations from PDFs
- [Solid-Agent](https://github.com/woutslabbinck/Solid-Agent) : Koreografeye as part of a rule-based intelligent software agent for Solid pods.

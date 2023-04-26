# Architecture

Koreografeye can be run on an input directory containing one or more RDF files (in Turtle or N3 format). For each of these files one or more N3 rule scripts can be executed. The results of this execution will be put in an output directory. If the N3 output contains _Policy_ fragments, they can be executed using a _policy executor_. 

Koreografeye is mainly targeted for processing [Activity Streams](https://www.w3.org/TR/activitystreams-core/) (AS2) notifications. For each of these notifications N3 rules express one or more _Policies_ what execution steps should be executed when receiving a AS2 notification of a particular shape. The _orchestrator_ component reads all incoming AS2 notifications and executes the EYE reasoner (or [EYE-JS](https://github.com/eyereasoner/eye-js), [Roxi](https://pbonte.github.io/roxi/index.html),... via configuration) on each of them and writes the results to an output directory. Policies are implemented as JavaScript plugins and can be execute by a _policy executor_.

<img src="koreografeye.png" alt="Koreografeye architecture" width="500"/>

A Policy is an RDF snippet that explains what should happen when running N3 rules against an AS2 input resource is successfull. Each policy has a name (identifier) and zero or more instances of an [fno:Execution](https://fno.io/spec/#fn-execution), which defines what JavaScript implementation should be executed. Optionally zero or more execution parameters can be provided for each execution.

The example below is an example of a Policy (prefix declarations omitted):

```(turtle)
  ex:MyDemoPolicy pol:policy [
      a fno:Execution ;
      fno:executes ex:helloWorld ;
      ex:text "Hello, world!" ;
  ] .
```

This policy requests the execution of a `ex:helloWorld` implementation with one parameter `ex:text` with value `"Hello, world!"`.

The `ex:MyDemoPolicy` can be the result of an N3 rule (prefix declarations omitted):

```(turtle)
{
  ?id a as:Announce.
}
=>
{
  ex:MyDemoPolicy pol:policy [
      a fno:Execution ;
      fno:executes ex:helloWorld ;
      ex:text "Hello, world!" ;
  ] .
}.
```

The N3 above states: "If we find an AS2 notification of type `as:Announce`, then request executing the `ex:MyDemoPolicy`.



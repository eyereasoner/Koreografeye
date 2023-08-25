# JSON-LD context cache

This directory contains an example JSON-LD context cache that can be used with the SendNotificatioPlugin `conext_cache` option. This allows to create JSON-LD frames without requiring network activity.

- activitystreams.jsonld : a local cache of the ActivityStreams

Usage:

```
 {
   "@id": "http://example.org/sendNotification",
   "@type": "SendNotificationPlugin",
   "context": [
       "https://www.w3.org/ns/activitystreams" ,
       "https://purl.org/coar/notify"
   ] ,
   "context_cache" : "cache/activitystreams.jsonld"
}
```

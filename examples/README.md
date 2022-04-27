# Fluvio Client Node Examples

## Prerequisites

Before running the examples, you'll need to have completed the following:

- Install <a href="https://nodejs.org" target="_blank">Node.js</a> (**v16.11.0** or above)
- Have the [Fluvio CLI] installed. Node API uses the profile installed by Fluvio CLI to connect to the cluster.
    - Update existing Fluvio CLI with `fluvio update`.
- Have access to a Fluvio cluster. 
    - Signup for a free [Infinyon Cloud] account, or 
    - Setup a [local cluster].

[Infinyon Cloud]: https://infinyon.cloud/signup
[Fluvio CLI]: https://fluvio.io/download
[local cluster]: https://fluvio.io/docs

## Create a Node Project

In the `examples` directory, create a node project and install the following libraries:

```node
npm init -y
npm install -D typescript ts-node @types/node
npm install -S @fluvio/client
```

Note: Fluvio is installed from `npm` rather than called locally.


## Examples

All examples run with:

```
npx ts-node ./<name-of-example>.ts
````

#### API summary
* [Create Topic](#create-topic)
* [Produce](#produce)
* [Find Topic](#find-topic)
* [List Topics](#list-topics)
* [Delete Topic](#delete-topic)
* [Produce](#produce)
* [Produce Batch](#produce-batch)
* [Consume](#consume)
* [Consume Iterator](#consume-iterator)


### Create Topic

Create topic `node-examples`:

```
% npx ts-node ./createTopic.ts  

connecting client to sc
topic 'node-examples' created
```

Use fluvio CLI to check:

```
% fluvio topic list
```


### Find Topic

Check if topic `node-examples` exists:

```
% npx ts-node ./findTopic.ts

connecting client to fluvio
topic:  {
  "name": "node-examples",
  "spec": {
    "replicas": {
      "computed": {
        "partitions": 1,
        "replicationFactor": 1,
        "ignoreRackAssignment": false
      }
    },
    "cleanupPolicy": null,
    "storage": null
  },
  "status": {
    "resolution": "Provisioned",
    "replicaMap": {
      "0": [
        0
      ]
    },
    "reason": ""
  }
}
```

Returns `null` if topic does not exist.

### List Topics

List all topics:

```
% npx ts-node ./listTopic.ts

connecting client to fluvio
topics:  [
  {
    "name": "node-examples",
    "spec": {
      "replicas": {
        "computed": {
          "partitions": 1,
          "replicationFactor": 1,
          "ignoreRackAssignment": false
        }
      },
      "cleanupPolicy": null,
      "storage": null
    },
    "status": {
      "resolution": "Provisioned",
      "replicaMap": {
        "0": [
          0
        ]
      },
      "reason": ""
    }
  }
]
```

### Delete Topic

Delete topic `node-examples`:

```
% npx ts-node ./deleteTopic.ts 

connecting client to fluvio
topic 'node-examples' deleted
```

### Produce

Produce 10 records to `node-example` topic.

```
% npx ts-node ./produce.ts

connecting client to fluvio
{"key":1,"message":"Value 1"}
{"key":2,"message":"Value 2"}
{"key":3,"message":"Value 3"}
{"key":4,"message":"Value 4"}
{"key":5,"message":"Value 5"}
{"key":6,"message":"Value 6"}
{"key":7,"message":"Value 7"}
{"key":8,"message":"Value 8"}
{"key":9,"message":"Value 9"}
{"key":10,"message":"Value 10"}
```

The producer example shows 2 API variants, one with `key` and the other without.

### Produce Batch

Produce 10 records to `node-example` topic using `batching`. Batching small packets can significantly improve performance.

```
% npx ts-node ./produceBatch.ts

connecting client to fluvio
[
  [
    Uint8Array(5) [ 75, 69, 89, 32, 49 ],
    '{"key":1,"message":"Message 1"}'
  ],
  [
    Uint8Array(5) [ 75, 69, 89, 32, 50 ],
    '{"key":2,"message":"Message 2"}'
  ],
  ...
]
```

Checkout the `sendAll` API for additional details.

### Consume

Consume all records stored in `node-example`:

```
% npx ts-node ./consume.ts

connecting client to fluvio
read from beginning
Key=KEY 1, Value={"key":1,"message":"Value 1"}
Key=KEY 2, Value={"key":2,"message":"Value 2"}
Key=KEY 3, Value={"key":3,"message":"Value 3"}
Key=KEY 4, Value={"key":4,"message":"Value 4"}
Key=KEY 5, Value={"key":5,"message":"Value 5"}
Key=KEY 6, Value={"key":6,"message":"Value 6"}
Key=KEY 7, Value={"key":7,"message":"Value 7"}
Key=KEY 8, Value={"key":8,"message":"Value 8"}
Key=KEY 9, Value={"key":9,"message":"Value 9"}
Key=KEY 10, Value={"key":10,"message":"Value 10"}
^C
```

The consume reads all records from the beginning of list, then waits for new records. The offset controls the location of the pointer in the list. Checkout the API for additional settings.


### Consume Iterator

As opposed to the previous `Consume` API, the iterator variant reads to completion. The API stops reading when it reches the end of the list.

```
% npx ts-node ./consumeIterator.ts

connecting client to fluvio
read from node-examples
Key=KEY 1, value={"key":1,"message":"Value 1"}
Key=KEY 2, value={"key":2,"message":"Value 2"}
Key=KEY 3, value={"key":3,"message":"Value 3"}
Key=KEY 4, value={"key":4,"message":"Value 4"}
Key=KEY 5, value={"key":5,"message":"Value 5"}
Key=KEY 6, value={"key":6,"message":"Value 6"}
Key=KEY 7, value={"key":7,"message":"Value 7"}
Key=KEY 8, value={"key":8,"message":"Value 8"}
Key=KEY 9, value={"key":9,"message":"Value 9"}
Key=KEY 10, value={"key":10,"message":"Value 10"}
```

Note, in this example the API retrieves both keys and values.

## Other references
* [Typedoc API page](https://infinyon.github.io/fluvio-client-node/)

# Fluvio Client Node Examples

## Setup To run any of these examples make sure you've got a valid node setup:

If you clone this repository navigate to this directory in the repository and run:
```node
npm init -y
npm install -D typescript ts-node @types/node
npm install -S @fluvio/client
```

## Prerequisites

Before running the examples, you'll need to have completed the following:

- Install <a href="https://nodejs.org" target="_blank">Node.js</a> (**v16.11.0** or above)
- Have the [Fluvio CLI] installed.
    - Update existing Fluvio CLI with `fluvio update`.
- Have access to a Fluvio cluster. 
    - Signup for a free [Infinyon Cloud] account, or 
    - Setup a [local cluster].

[Infinyon Cloud]: https://infinyon.cloud/signup
[Fluvio CLI]: https://fluvio.io/download
[local cluster]: https://fluvio.io/docs

## Examples

All examples run with:

`npx ts-node ./<name-of-example>.ts`

#### API summary
* [Create Topic](#create-topic)
* [Produce](#produce)
* [Find Topic](#find-topic)
* [List Topics](#list-topics)
* [Delete Topic](#delete-topic)


### Create Topic

Create topic `node-examples`:

```
% npx ts-node ./createTopic.ts     
connecting client to sc
topic 'node-examples' created
```

Use fluvio CLI to check:

```
%fluvio topic list
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


Find the topic `node-examples`:

To run the a given example do `npx ts-node ./<name-of-example>.ts` such as:
* `npx ts-node ./consume.ts`
* `npx ts-node ./iterator.ts`
* `npx ts-node ./produce.ts`
* `npx ts-node ./produceBatch.ts`


Produce/Consume requires a topic called `node-examples`. Use `createTopic` example to created it, and `deleteTopic` to remove it.
<h1 align="center">Fluvio Client for Node.js</h1>
<div align="center">
 <strong>
   Node.js binding for Fluvio streaming platform.
 </strong>
</div>
<br />

[![Build Status](https://github.com/infinyon/fluvio-client-node/workflows/CI/badge.svg)](https://github.com/infinyon/fluvio-client-node/actions)
[![Github All Releases](https://img.shields.io/npm/dm/@fluvio/client.svg)](https://www.npmjs.com/package/@fluvio/client)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/infinyon/fluvio-client-node/blob/master/LICENSE-APACHE)
[![Docs](https://img.shields.io/badge/fluvio-docs-blue)](https://infinyon.github.io/fluvio-client-node/)

## Installation on NPM

`npm install @fluvio/client`

Fluvio client is native module.  It is written using Rust. The client will install the platform specific native `.node` module.

The Fluvio client uses TypeScript for typed definitions.

## Documentation

Fluvio client uses Typedoc to generate the client API [documentation](https://infinyon.github.io/fluvio-client-node/).

## Pre-Requisites
[Fluvio](https://github.com/infinyon/fluvio) should be up and running to use the Node fluvio client.

Click the link for installation instructions on the Fluvio GitHub repository.


## Example usage

```ts
import Fluvio, { RecordSet } from '@fluvio/client';

// define the name of the topic to use
const TOPIC_NAME = "my-topic"

// define the partition where the topic
// records will be stored;
const PARTITION = 0

// Instantiate a new fluvio client
const fluvio = await Fluvio.connect();

//// Fluvio Admin Client

// Create a new Fluvio Admin Client to manage
// topics and partitions
const admin = await fluvio.admin();

// Create a new topic
await admin.createTopic(TOPIC_NAME)

//// Topic Producer

// Create a topic producer for the topic;
const producer = await fluvio.topicProducer(TOPIC_NAME);

// Send a new topic record
producer.sendRecord("stringified data", PARTITION)

//// Partition Consumer

// Instantiate a new topic listener;
const consumer = await fluvio.partitionConsumer(TOPIC_NAME, PARTITION)

// Listen for new topics sent by a topic producer;
await consumer.stream(async (data: string) => {
  // handle data record
})

```

Please look at
[`./examples`](https://github.com/infinyon/fluvio-client-node/tree/master/examples)
and
[`./tests`](https://github.com/infinyon/fluvio-client-node/blob/master/src/fluvio.test.ts)
folder for more detailed examples.


## Contributing

If you'd like to contribute to the project, please read our [Contributing guide](https://github.com/infinyon/fluvio-client-node/blob/master/CONTRIBUTING.md).

## License

This project is licensed under the [Apache license](https://github.com/infinyon/fluvio-client-node/blob/master/LICENSE-APACHE). Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in Fluvio Client by you, shall be licensed as Apache, without any additional
terms or conditions.

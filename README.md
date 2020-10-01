<h1 align="center">Fluvio Client for Node.js</h1>
<div align="center">
 <strong>
   Node.js binding for Fluvio streaming platform.
 </strong>
</div>
<br />
  
[![Build Status](https://github.com/infinyon/flv-client-node/workflows/Smoke%20Test/badge.svg)](https://github.com/infinyon/flv-client-node/actions) [![Github All Releases](https://img.shields.io/npm/dm/@fluvio/client.svg)]() [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/infinyon/flv-client-node/blob/master/LICENSE-APACHE)


## Installation on NPM

`npm install @fluvio/client`

Fluvio client is native module.  It is written using Rust. The published NPM package
exports a pre-built distributed native module `.node` binary.

Currently, the Fluvio client is only supported in NodeJS. In the future, there will be support for a WebAssemby client module `.wasm` for compatibility with web browsers.

The Fluvio client uses TypeScript for typed definitions.


### Pre-Requisites
[Fluvio](https://github.com/infinyon/fluvio) should be up and running to use the Node fluvio client. Click the link for installation instructions on the Fluvio GitHub repository.

## Example usage

```TypeScript
import Fluvio, { RecordSet } from '@fluvio/client';

// define the name of the topic to use
const TOPIC_NAME = "my-topic"

// define the partition where the topic
// records will be stored;
const PARTITION = 0

// Instantiate a new fluvio client
const fluvio = new Fluvio({
  host: '127.0.0.1',
  port: 9003
});

// Explicitly connect to the fluvio cluster;
await fluvio.connect();

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
await consumer.listen(async (data: RecordSet) => {
  // handle data record
})

```

Please look at [examples](./examples) and [test](./test) folder for more detailed examples.

## Developing

For those who would like to build the native module, follow these instructions:

### Install Rust tooling

First, install rust tooling by following [rustup](https://rustup.rs).
```
<follow instruction on rustup>
```

Then, you must enable nightly toolchain:
```
rustup toolchain install nightly
```

And enable nightly as default
```
rustup default nightly
```

Finally, install build tool
```
cargo install nj-cli
```


# Development Build and Test

To compile rust library:

```
make
```

To test development module, refer to makefile under this repositry. For example

```
make test_produce_consume
```

## Contributing

If you'd like to contribute to the project, please read our [Contributing guide](CONTRIBUTING.md).

## License

This project is licensed under the [Apache license](LICENSE-APACHE). Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in Fluvio Client by you, shall be licensed as Apache, without any additional
terms or conditions.

<h1 align="center">Fluvio Client for Node.js</h1>
<div align="center">
 <strong>
   Node.js binding for Fluvio streaming platform.
 </strong>
</div>
<br />
  
[![Build Status](https://github.com/infinyon/flv-client-node/workflows/Smoke%20Test/badge.svg)](https://github.com/infinyon/flv-client-node/actions) [![Github All Releases](https://img.shields.io/npm/dm/@fluvio/client.svg)]() [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/infinyon/flv-client-node/blob/master/LICENSE-APACHE)


## Installation on NPM

Fluvio client is native module.  It is written using rust.  

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

#### Pre-requisites
[Fluvio](https://github.com/infinyon/fluvio) should be up and running to use the Node fluvio client.

### Usage

#### Install NPM package
This package can be installed using

```
npm install @fluvio/client
```

#### Example usage

```
var flvClient = require('@fluvio/client');

```

Please look at `examples` folder in the node_modules for more detailed examples.


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

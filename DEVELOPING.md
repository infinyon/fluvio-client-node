# Developing the Native Module using Rust

For those who would like to build the native module, follow these instructions:

## Install Rust tooling

First, install rust tooling by following [rustup](https://rustup.rs).

```
<follow instruction on rustup>
```

Install build tool
```
cargo install nj-cli
```

# Development Build and Test

To compile rust library:

```
make build
```

To test development module, refer to makefile under this repository. For example

```
make run_test
```
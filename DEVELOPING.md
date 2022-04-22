# Developing the Fluvio Node.js Client

## Developing the Native Platform Specific Modules

### Pre-Requisites

- [`Rust`](https://rustup.rs)
- [`Node-Bindgen`](https://github.com/infinyon/node-bindgen)

Building the `@fluvio/native-<platform>` native modules requires the `Rust` and `Node-Bindgen`.

Follow the instructions in the links above to install the development tools.

## Building and Testing

### Developing the Native Module

Running `make build` will build the `./src/**/*.{ts,rs}` files, generating a `dist/` folder for the JavaScript files and a native module at the location `./dist/<platform>/index.node`.

```
make build
```

When developing, you need to set the environment variable, `FLUVIO_DEV` to a non zero value.

```bash
export FLUVIO_DEV=1
```

This will bypass the use of `@fluvio/native` published module and use the locally built module at `./native/src/<platform>/index.node`.

### Writing Tests

When updating the interfaces for the `@fluvio/client` or `@fluvio/native-<platform>` modules, it is important to test the integration between the Rust and TypeScript code is correct.

To do so, there is a [TestyTs](https://github.com/Testy/TestyTs) test specification file located at `./src/fluvio.spec.ts`.

After writing a new test case, you can run the tests using `npm run test`. This command will also build the TypeScript and platform specific native module.

However, make sure you have your `FLUVIO_DEV` environment variable set before running the tests; otherwise, you will use the previously published version instead of the locally built version.

## Publishing the Modules

### Publishing `@fluvio/client`

Run the [Publish GitHub workflow](https://github.com/infinyon/fluvio-client-node/actions/workflows/publish.yml).

# Developing the Fluvio Node.js Client

## Module Hierarchy

```
- @fluvio/client
    - @fluvio/native
        - @fluvio/native-darwin
        - @fluvio/native-linux
        - @fluvio/native-win
```

## Developing the Native Platform Specific Modules

### Pre-Requisites

- [`Rust`](https://rustup.rs)
- [`Node-Bindgen`](https://github.com/infinyon/node-bindgen)

Building the `@fluvio/native-<platform>` native modules requires the `Rust` and `Node-Bindgen`. 

Follow the instructions in the links above to install the development tools.

## Building and Testing

### Developing the Native Module

Running `make build` will build the `./src/**/*.{ts,rs}` files, generating a `dist/` folder for the JavaScript files and a native module at the location `./native/src/<platform>/index.node`.

```
make build
```

When developing, you need to set the environment variable, `FLUVIO_DEV`, to the _platform_ you're developing on; i.e. `darwin`, `linux`, or `win`.

For example, if you are developing on MacOS, then you would set the following environment variable in your terminal session:

```bash
export FLUVIO_DEV=darwin
```

This will bypass the use of `@fluvio/native` published module and use the locally built module at `./native/src/<platform>/index.node`.

### Writing Tests

When updating the interfaces for the `@fluvio/client` or `@fluvio/native-<platform>` modules, it is important to test the integration between the Rust and TypeScript code is correct.

To do so, there is a [TestyTs](https://github.com/Testy/TestyTs) test specification file located at `./src/fluvio.spec.ts`.

After writing a new test case, you can run the tests using `npm run test`. This command will also build the TypeScript and platform specific native module.

However, make sure you have your `FLUVIO_DEV` environment variable set before running the tests; otherwise, you will use the previously published version instead of the locally built version.

## Publishing the Modules

### Publishing `@fluvio/client`

There are currently two methods for publishing the `@fluvio/client` module using the [`Publish`](https://github.com/infinyon/fluvio-client-node/blob/master/.github/workflows/publish.yml) workflow.

```yaml
name: Publish

on:
  workflow_dispatch:
  push:
    tags: 
      - 'v*'
```

Manually publishing the module can be accomplished using Github Actions and using the [`Run workflow`](https://github.com/infinyon/fluvio-client-node/actions?query=workflow%3APublish) button.

### Publishing `@fluvio/native`

Currently, this module can only be published using a manually run `workflow_dispatch` event using to [`Run workflow](https://github.com/infinyon/fluvio-client-node/actions?query=workflow%3A%22Publish+%40fluvio%2Fnative%22) button. 

In most cases, this module will not need to be updated unless there are new platforms added.

### Publishing `@fluvio/native-<platform>`

Currently, this module can only be published using a manually run `workflow_dispatch` event using to [`Run workflow](https://github.com/infinyon/fluvio-client-node/actions?query=workflow%3A%22Publish+%40fluvio%2Fnative-%3Cplatform%3E%22) button.

## Which Module do I Publish?

1) When changes are made to the TypeScript files (i.e. `./src/**/*.ts`), then an update must be published for the `@fluvio/client` module.</br></br>The `@fluvio/client` module is dependent on the `@fluvio/native` module.

2) The only time the `@fluvio/native` module is required to be updated is if a new platform needs to be added. In most cases, the `@fluvio/native` module <u>**SHOULD NOT**</u> need to be updated given changes to the `./src/**/*.{ts,rs}` files.</br></br>The `@fluvio/native` module is a thin wrapper that _installs_ and _requires_ the platform specific fluvio native modules, e.g. `@fluvio/native-<platform>`, when the package is installed.

3) When changes are made to the source Rust `node-bindgen` files (i.e. `./src/**/*.rs`), then an update must be published for the `@fluvio/native-<platform>` modules.

<hr/>

## Which Modules Should be Published First?

When there are changes to both the `.ts` and `.rs` files, make sure you publish the `@fluvio/native-<platform>` module before the `@fluvio/client` module.

Remember to bump the version numbers of each of the modules that have changes.

Again, in most cases, there is no need to publish the `@fluvio/native` module, unless you are adding a new platform.


# Changelog

All notable changes to this project will be documented in this file.

## [0.14.5] - 2023-09-28

### Fixes

- Use crates.io release for node bindgen (#384)
  Fixes node bindgen bugs interacting with recent versions of Node 18 and 20

### Miscellaneous Tasks

- Bump fluvio-future from 0.5.1 to 0.6.0 (#370)
- Bump actions/checkout from 3 to 4 (#373)
- Bump typedoc from 0.24.4 to 0.25.1 (#374)
- Bump prettier from 2.8.7 to 3.0.3 (#369)
- Bump @types/node from 20.3.2 to 20.7.0 (#381)
- Bump typescript from 5.0.4 to 5.2.2 (#366)
- Cargo update (#383)

## [0.14.4] - 2023-08-11

### Features

- Use recommended TSConfig and remove `typeRoots` (#356)

### Miscellaneous Tasks

- Bump fluvio from v0.10.12 to v0.10.14 (#348)
- Update packages, incl fluvio 0.10.14 (#355)
- Bump fluvio version to 0.10.12-dev-1 (#334)
- Bump openssl from 0.10.52 to 0.10.55 (#333)
- Update to fluvio release 0.10.12 (#338)
- Bump typescript from 5.0.4 to 5.1.6 (#339)

### Security

- Bump @types/node from 20.2.3 to 20.3.2 (#335)

## [0.14.3] - 2023-06-10

### Build

- Update fluvio version (#329)

## [0.14.2] - 2023-05-29

### Miscellaneous Tasks

- Bump version (#327)

## [0.14.1] - 2023-05-12

### Miscellaneous Tasks

- Update fluvio to 0.10.9 (#314)

## 0.9.0
### Improvements
* Updates to fluvio 0.9.0. ([#120](https://github.com/infinyon/fluvio-client-node/pull/120))
* Remove `error_code` from `FetchablePartitionResponse`. ([#120](https://github.com/infinyon/fluvio-client-node/pull/120))
* Make CI use k3d rather than minikube. ([#120](https://github.com/infinyon/fluvio-client-node/pull/120))
### Fixed

## 0.7.2

### Improvements

- Add `sendAll` method for producing batches of records at once

## 0.6

### Improvements
- Add `toRecord` method for `FetchablePartitionResponse` ([#56](https://github.com/infinyon/fluvio-client-node/pull/56))
- Add `AsyncIterator` support for streams ([#66](https://github.com/infinyon/fluvio-client-node/pull/66))

### Fixed

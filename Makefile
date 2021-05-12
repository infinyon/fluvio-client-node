all:	build

install:
	npm install

build: install
	npm run build:platform
	npm run build:ts

test_all: build
	RUST_BACKTRACE=full RUST_LOG=fluvio_client_node=debug FLUVIO_DEV=$(shell uname | tr '[:upper:]' '[:lower:]') npx jest -w 1

npm_lint:
	npm run prettier:check

run_docs:
	npm run docs

pack:
	npm	pack
	mv fluvio-client* /tmp

run_publish:
	npm publish

clean:
	rm -rf dist

examples: example_produce example_list_topic example_create_topic \
	example_find_topic example_create_custom_spu \
	example_delete_custom_spu example_create_managed_spu \
	example_delete_managed_spu # TODO: example_consume example_delete_topic


example_produce:	build
	FLUVIO_DEV=1 npx ts-node ./examples/produce.ts

example_consume:	build
	FLUVIO_DEV=1 npx ts-node ./examples/consume.ts

example_iterator:	build
	FLUVIO_DEV=1 npx ts-node ./examples/iterator.ts

example_list_topic:	build
	FLUVIO_DEV=1 npx ts-node ./examples/listTopic.ts

example_create_topic:	build
	FLUVIO_DEV=1 npx ts-node ./examples/createTopic.ts

example_delete_topic:	build
	FLUVIO_DEV=1 npx ts-node ./examples/deleteTopic.ts

example_find_topic:	build
	FLUVIO_DEV=1 npx ts-node ./examples/findTopic.ts

example_list_spu:	build
	FLUVIO_DEV=1 npx ts-node ./examples/listSpu.ts

example_create_custom_spu:	build
	FLUVIO_DEV=1 npx ts-node ./examples/createCustomSpu.ts

example_delete_custom_spu:	build
	FLUVIO_DEV=1 npx ts-node ./examples/deleteCustomSpu.ts

example_create_managed_spu:	build
	FLUVIO_DEV=1 npx ts-node ./examples/createManagedSpu.ts

example_delete_managed_spu:	build
	FLUVIO_DEV=1 npx ts-node ./examples/deleteManagedSpu.ts

install-clippy:
	rustup component add clippy --toolchain stable

check-clippy: install-clippy
	cargo +stable clippy --all --all-features --all-targets -- \
		-D warnings \
		-A clippy::needless_question_mark \
		-A clippy::upper_case_acronyms

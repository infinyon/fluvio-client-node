all:	build

install:
	npm install

build: install
	npm run build:platform
	npm run build:ts


JEST=./node_modules/.bin/jest -w 1
FLUVIO_DEV=FLUVIO_DEV=$(shell uname | tr '[:upper:]' '[:lower:]')
RUST_ENVS=RUST_BACKTRACE=full RUST_LOG=fluvio_client_node=debug
test_all: build
	$(RUST_ENVS) $(FLUVIO_DEV) $(JEST) --testNamePattern '^(?!MacOSCi).*'

test_macos_ci: build
	$(RUST_ENVS) $(FLUVIO_DEV) $(JEST) --testNamePattern 'MacOSCi'

npm_lint:
	npm run prettier:check

run_docs: install
	npm run docs

pack:
	npm	pack
	mv fluvio-client* /tmp

run_publish:
	npm publish

clean:
	rm -rf dist

examples: example_produce example_list_topic example_create_topic \
	example_find_topic


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

install-clippy:
	rustup component add clippy --toolchain stable

check-clippy: install-clippy
	cargo +stable clippy --all --all-features --all-targets -- \
		-D warnings \
		-A clippy::needless_question_mark \
		-A clippy::upper_case_acronyms

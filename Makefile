all:	build

build:
	npm run build:platform

run_test: npm_lint
	npm run test

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

test_produce:	build
	npx ts-node ./examples/produce.ts

test_consume:	build
	npx ts-node ./examples/consume.ts

test_list_topic:	build
	npx ts-node ./examples/listTopic.ts

test_create_topic:	build
	npx ts-node ./examples/createTopic.ts

test_delete_topic:	build
	npx ts-node ./examples/deleteTopic.ts

test_find_topic:	build
	npx ts-node ./examples/findTopic.ts

test_list_spu:	build
	npx ts-node ./examples/listSpu.ts

test_create_custom_spu:	build
	npx ts-node ./examples/createCustomSpu.ts

test_delete_custom_spu:	build
	npx ts-node ./examples/deleteCustomSpu.ts

test_create_managed_spu:	build
	npx ts-node ./examples/createManagedSpu.ts

test_delete_managed_spu:	build
	npx ts-node ./examples/deleteManagedSpu.ts

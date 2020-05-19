all:	build

build:	
	nj-cli build



pack:
	npm	pack
	mv fluvio-client* /tmp


publish:
	npm publish --access public


clean:
	rm -rf dist

test_consume:	build
	node examples/consume.js

test_produce:	build
	node examples/produce_consume.js

test_event:	build
	node examples/event_to_produce.js

test_fetch:	build
	node examples/consume_batches.js

test_list:	build
	node examples/list_topic.js

test_create:	build
	node examples/create_topic.js

test_delete:	build
	node examples/delete_topic.js

test_find:	build
	node examples/find_topic.js

test_spu:	build
	node examples/list_spu.js

test_custom_create:	build
	node examples/create_custom_spu.js

test_custom_delete:	build
	node examples/delete_custom_spu.js

test_managed_create:	build
	node examples/create_managed_spu.js

test_managed_delete:	build
	node examples/delete_managed_spu.js
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

test_produce_fetch:	build
	node examples/produce_fetch.js

test_produce_consume:	build
	node examples/produce_consume.js



test_list_topic:	build
	node examples/list_topic.js

test_create_topic:	build
	node examples/create_topic.js

test_delete_topic:	build
	node examples/delete_topic.js

test_find_topic:	build
	node examples/find_topic.js

test_list_spu:	build
	node examples/list_spu.js

test_create_custom_spu:	build
	node examples/create_custom_spu.js

test_delete_custom_spu:	build
	node examples/delete_custom_spu.js

test_create_managed_spu:	build
	node examples/create_managed_spu.js

test_delete_managed_spu:	build
	node examples/delete_managed_spu.js


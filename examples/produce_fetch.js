let flv = require('../dist');

const TOPIC_NAME = "message";
const MESSAGE_COUNT = 10;

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
} 


async function fetch() {

    try {
        console.log("connecting client to sc");
        let sc = await flv.connect();
        console.log("connect to", sc.addr());

        /// create topic if doesn't exists
        let admin = sc.admin();
        let topic = await admin.findTopic(TOPIC_NAME);

        // creat topic if topic doesn't exists
        if (topic === undefined) {
            console.log("topic %s not found, creating",TOPIC_NAME);
            await admin.createTopic(TOPIC_NAME, { partition: 1, replication: 1 });
            await sleep(2000);
        } 
       

        // look up replica
        let replica = await sc.replica(TOPIC_NAME, 0);

        // produce message
        for (var i = 1; i <= MESSAGE_COUNT; i++) {
            const recordStr = `{x: ${i}}`;
            await replica.produce(recordStr);
            console.log('>> ', recordStr);
        }

        // fetch
        let batches = await replica.fetchBatches('earliest');
        console.log("batches: {}",batches.length);
        batches.forEach(batch => {
            console.log("base offset: {}",batch.base_offset);
            batch.records.forEach(record => {
                console.log("record ",Buffer.from(record).toString());
            })
        }); 
        
    } catch (ex) {
        console.log("error", ex);
    }
}


fetch()
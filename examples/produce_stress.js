let flv = require('../dist');
const TEST_TOPIC = "test1";
const WRITE_COUNT = 10;
async function loopTest() {
    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    try {
        let sc = await flv.connect();
        console.log("sc addr", sc.addr());
        let admin = sc.admin();
        // create topic
        /*
        let topic = await admin.findTopic(TEST_TOPIC);

        if (!topic) {
            console.log(`topic '${TEST_TOPIC}' not founded`);
           // await admin.createTopic(TEST_TOPIC, { partition: 1, replication: 2 });
           // sleep(2000);
            console.log(`topic '${TEST_TOPIC}' created`);
        } else {
            console.log(`topic '${TEST_TOPIC}' exists`);
        }
        /*/
        // produce entries in a loop
        let replica = await sc.replica(TEST_TOPIC, 0);
        for (var i = 1; i <= WRITE_COUNT; i++) {
            const recordStr = `{x: ${i}}`;
            await replica.produce(recordStr);
            console.log('>> ', recordStr);
        }
        
    } catch (e) {
        console.log("loop test: ", e);
    }
}
loopTest()
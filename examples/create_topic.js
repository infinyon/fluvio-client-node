let addon = require('../dist');

console.log("connecting client to sc");

async function createTopic() {

    try {
        let sc = await addon.connect();
        console.log("sc addr",sc.addr());
        let admin = sc.admin();
        await admin.createTopic("test3",{ partition: 2, replication: 2});
        //await admin.createTopic("test3",[{"id": 0,"replicas": [0,1]}]);
        console.log("topic created");
    } catch (ex) {
        console.log("problem creating topic", ex);
    }
}


createTopic()
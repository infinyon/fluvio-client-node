let flv = require('../dist');

console.log("connecting client to sc");

async function list_topics() {

    try {
        let sc = await flv.connect();
        let admin = sc.admin();
        await admin.deleteTopic("test3");
        console.log("topic test3 deleted");
    } catch (ex) {
        console.log("problem creating topic", ex);
    }
}


list_topics()
let addon = require('../dist');

console.log("connecting client to sc");

async function list_topics() {

    try {
        let sc = await addon.connect();
        console.log("sc addr",sc.addr());
        let admin = sc.admin();
        let buffer = Buffer.from(await admin.listTopic());
        console.log("topics", JSON.parse(buffer));
    } catch (ex) {
        console.log("problem getting topic", ex);
    }
}


list_topics()
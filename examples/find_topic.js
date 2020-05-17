let flv = require('../dist');

async function findTopic() {

    try {
        let sc = await flv.connect();
        console.log("connect to flv",sc.addr());
        let admin = sc.admin();
        let topic = await admin.findTopic("test3");
        if (topic === undefined) {
            console.log("test3 is not setup");
        } else {
            let buffer = Buffer.from(topic);
            console.log("test3", JSON.parse(buffer));
        }
        
    } catch (ex) {
        console.log("problem getting topic", ex);
    }
}


findTopic()
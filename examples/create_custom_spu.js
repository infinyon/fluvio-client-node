let addon = require('../dist');

console.log("connecting client to sc");

async function createCustomSpu() {

    try {
        let sc = await addon.connect();
        console.log("sc addr",sc.addr());
        let admin = sc.admin();
        await admin.createCustomSpu({
            id: 5001,
            name: "custom-1",
            public: "localhost:9005",
            private: "localhost:9006"
        });
        console.log("custom spu created");
    } catch (ex) {
        console.log("problem creating spu", ex);
    }
}


createCustomSpu()
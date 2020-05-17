let flv = require('../dist');

console.log("connecting client to sc");

async function createManagedSpu() {

    try {
        let sc = await flv.connect();
        console.log("sc addr", sc.addr());
        let admin = sc.admin();
        await admin.createManagedSpu({
            name: "test",
            replicas: 2,
            minId: 10
        });
        console.log("managed spu created");
    } catch (ex) {
        console.log("problem creating spu", ex);
    }
}


createManagedSpu()
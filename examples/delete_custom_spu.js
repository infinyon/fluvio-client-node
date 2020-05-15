let addon = require('../dist');

console.log("connecting client to sc");

async function deleteCustomSpu() {

    try {
        let sc = await addon.connect();
        console.log("sc addr",sc.addr());
        let admin = sc.admin();
        await admin.deleteCustomSpu(5001);
        console.log("custom spu deleted");
    } catch (ex) {
        console.log("problem delete spu", ex);
    }
}


deleteCustomSpu()
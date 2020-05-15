let addon = require('../dist');

console.log("connecting client to sc");

async function deleteManagedSpu() {

    try {
        let sc = await addon.connect();
        console.log("sc addr",sc.addr());
        let admin = sc.admin();
        await admin.deleteManagedSpu("test");
    } catch (ex) {
        console.log("problem deleting spu", ex);
    }
}


deleteManagedSpu()
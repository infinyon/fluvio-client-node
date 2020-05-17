let flv = require('../dist');

console.log("connecting client to sc");

async function list_spu() {

    try {
        let sc = await flv.connect();
        let admin = sc.admin();
        let buffer = Buffer.from(await admin.listSpu());
        console.log("spu", JSON.parse(buffer));
    } catch (ex) {
        console.log("problem getting spu", ex);
    }
}


list_spu()
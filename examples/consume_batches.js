let flv = require('../dist');

console.log("connecting client to sc");

async function fetch() {

    try {
        let sc = await flv.connect();
        console.log("connect to", sc.addr());
        let replica = await sc.replica("test1", 0);
        console.log("found topic test1,0");
        let batches = await replica.fetchBatches('earliest');
        console.log("batches: {}",batches.length);
        batches.forEach(batch => {
            console.log("base offset: {}",batch.base_offset);
            batch.records.forEach(record => {
                console.log("record ",Buffer.from(record).toString());
            })
        }); 
        
    } catch (ex) {
        console.log("problem getting topic", ex);
    }
}


fetch()
let flv = require('../dist');

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
} 

async function produce() {

    try {
        let sc = await flv.connect();
        console.log("connect to flv",sc.addr());

        let replica = await sc.replica("test1", 0);
        console.log("found replica");

        for(let i=0; i< 10; i++) {
            let batches = await replica.fetchBatches('earliest');
            console.log("got batches: {}",batches.length);
            console.log("sleeping for 1 seconds");
            await sleep(1000);
        }

        
     
        
        
    } catch (ex) {
        console.log("problem getting topic", ex);
    }
}


produce()
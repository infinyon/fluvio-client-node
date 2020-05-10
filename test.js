// run test
// this assume stream controller is running at localhost: 9003
// use flv-integration-test to run locally

let addon = require('./dist');
// let addon = require('@fluvio/client');


const EventEmitter = require('events').EventEmitter;
const emitter = new EventEmitter();

console.log("loaded client");

emitter.on('data', (record) => {

    console.log("received record",record);
    console.log("received event",record.offset,Buffer.from(record.record).toString());
    
})

console.log("connecting client to sc");
addon.connect().then( sc => {
    console.log("connect to sc at ",sc.addr());
    
    sc.replica("test1",0).then( leader => {
        
        try {

            leader.consume(
                emitter.emit.bind(emitter),
                "earliest"
            );
        } catch(ex) {
            console.log(ex);
        } 
    })
})
.catch((err) => console.log(err));


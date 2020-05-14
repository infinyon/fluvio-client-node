// run test
// this assume stream controller is running at localhost: 9003
// use flv-integration-test to run locally

let addon = require('./dist');
// let addon = require('@fluvio/client');


const EventEmitter = require('events').EventEmitter;
const emitter = new EventEmitter();

console.log("loaded client");

emitter.on('data', (record) => {

   // console.log("received record",record);
    console.log("received event",record.offset,Buffer.from(record.record).toString());
    
})

console.log("connecting client to sc");
addon.connect().then( sc => {
    console.log("connect to sc at ",sc.addr());
    
    sc.replica("test1",0).then( leader => {
        
        try {

            /*
            leader.consume(
                emitter.emit.bind(emitter),
                "earliest"
            );
            */

            /*
            // start from absolute offset 5
            leader.consume(
                emitter.emit.bind(emitter),
                5
            );
            */

            /*
            // start from last 2
            leader.consume(
                emitter.emit.bind(emitter),
                {
                    offset: 2,
                    start: 'latest'
                }
            );
            */

            /*
            // start from 2 offset from begining
            leader.consume(
                emitter.emit.bind(emitter),
                {
                    offset: 2,
                    start: 'earliest'
                }
            );
            */

            // start from absolute offset 5
            leader.consume(
                emitter.emit.bind(emitter),
                {
                    offset: 6
                }
            );
            

        } catch(ex) {
            console.log(ex);
        } 
    })
})
.catch((err) => console.log(err));


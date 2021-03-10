/* tslint:disable:no-console */
import Fluvio, { Offset, Record } from '../src/index'
import { v4 as uuidV4 } from 'uuid'

// Set unique topic name
const TOPIC_NAME = uuidV4()
const PARTITION = 0

async function consume() {
    const fluvio = new Fluvio()

    // Explicitly call `.connect()` to connect to the cluster;
    // This allows for lazily-loading the connection, useful in
    // situations where the fluvio client does not need to immediately
    // connect.
    await fluvio.connect()

    // Set the admin client to create and find topics;
    const admin = await fluvio.admin()

    // Create the topic
    await admin.createTopic(TOPIC_NAME)

    console.log('TOPIC_NAME', TOPIC_NAME)

    const consumer = await fluvio.partitionConsumer("node", PARTITION)

    const offset: Offset = new Offset()

    console.log('listening for events')
    await consumer.stream(offset, async (record: Record) => {
        // handle record;
        console.log('record', record)
        console.log("key", record.key())
        console.log("value", record.value())
        console.log("key buffer", record.keyBuffer())
        console.log("value buffer", record.valueBuffer())
    })
}

consume()

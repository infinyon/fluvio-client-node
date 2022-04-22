/* tslint:disable:no-console */
import Fluvio, { Offset, Record } from '../'
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

    const consumer = await fluvio.partitionConsumer(TOPIC_NAME, PARTITION)

    const offset: Offset = new Offset()

    console.log('listening for events')
    await consumer.stream(offset, async (record: Record) => {
        // handle record;
        console.log(`Key=${record.keyString()}, Value=${record.valueString()}`)
    })
}

consume()

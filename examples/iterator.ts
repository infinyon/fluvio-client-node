/* tslint:disable:no-console */
import Fluvio, { Offset } from '@fluvio/client'
import { v4 as uuidV4 } from 'uuid'

// Set unique topic name
const TOPIC_NAME = uuidV4()
const PARTITION = 0

async function iterate() {
    // Explicitly call `.connect()` to connect to the cluster;
    // This allows for lazily-loading the connection, useful in
    // situations where the fluvio client does not need to immediately
    // connect.
    const fluvio = await Fluvio.connect()

    // Set the admin client to create and find topics;
    const admin = await fluvio.admin()

    // Create the topic
    await admin.createTopic(TOPIC_NAME)

    const consumer = await fluvio.partitionConsumer(TOPIC_NAME, PARTITION)

    console.log(`Listening for events for topic ${TOPIC_NAME}`)

    let count = 1
    let stream = await consumer.createStream(Offset.FromBeginning())

    for await (const record of stream) {
        const key = record.keyString()
        const value = record.valueString()
        console.log(`Consumed record: Key=${key}, value=${value}`)
        if (count >= 10) break
        count++
    }
}

iterate()

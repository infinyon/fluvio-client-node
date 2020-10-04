/* tslint:disable:no-console */
import Fluvio, { TopicReplicaParam, Offset } from '../src/index'
import { v4 as uuidV4 } from 'uuid'

// Set delay for creating a topic;
async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

// Set unique topic name
const TOPIC_NAME = uuidV4()
const PARTITION = 0

// Define a topic spec;
const TOPIC_SPEC = {
    partitions: 1,
    replicationFactor: 1,
    ignoreRackAssignment: false,
} as TopicReplicaParam

// const MESSAGE_COUNT = 100

async function consume() {
    try {
        const fluvio = new Fluvio()

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client to create and find topics;
        const admin = await fluvio.admin()

        // Create the topic
        await admin.createTopic(TOPIC_NAME, TOPIC_SPEC)

        // Wait for topic to finalize creation
        await sleep(2000)

        // Stringify message
        const message = JSON.stringify({
            data: {},
            message: 'Stringified JSON',
        })

        console.log('TOPIC_NAME', TOPIC_NAME)

        const producer = await fluvio.topicProducer(TOPIC_NAME)

        // Send a record using the default producer set above
        await producer.sendRecord(message, PARTITION)

        // Consume the newly created topic;
        // Wait for topic to finalize creation
        // await sleep(2000)

        const consumer = await fluvio.partitionConsumer(TOPIC_NAME, PARTITION)

        const offset: Offset = new Offset()

        console.log('listening for events')
        await consumer.stream(offset, async (record: string) => {
            // handle record;
            console.log('record', record)
        })
    } catch (ex) {
        console.log('error', ex)
    }
}

consume()

/* tslint:disable:no-console */
import Fluvio, { TopicReplicaParam } from '../src/index'

// Set delay for creating a topic;
async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

// Set unique topic name
const TOPIC_NAME = 'topic-22' // uuidV4()

// Define a topic spec;
const TOPIC_SPEC = {
    partitions: 1,
    replicationFactor: 3,
    ignoreRackAssignment: true,
} as TopicReplicaParam

// const MESSAGE_COUNT = 100

async function produce() {
    try {
        const fluvio = new Fluvio({
            host: '0.0.0.0',
            port: 9003,
            topic: TOPIC_NAME,
        })

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // Create the topic
        await admin.createTopic(TOPIC_NAME, TOPIC_SPEC)

        // Wait for topic to finalize creation
        await sleep(2000)

        const producer = await fluvio.topicProducer(TOPIC_NAME)

        // Stringify message
        const message = JSON.stringify({
            data: {},
            message: 'Stringified JSON',
        })

        // Send a record using the default producer set above
        await producer.sendRecord(message, 0)
    } catch (ex) {
        console.log('error', ex)
    }
}

produce()

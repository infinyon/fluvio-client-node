/* tslint:disable:no-console */
import Fluvio from '../'
import { v4 as uuidV4 } from 'uuid'

// Set delay for creating a topic;
async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

// Set unique topic name
const TOPIC_NAME = uuidV4()

async function produce(keyValue: boolean = true) {
    try {
        const fluvio = new Fluvio()

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // Create the topic
        await admin.createTopic(TOPIC_NAME)
        console.log(`Producing on ${TOPIC_NAME} in 10 seconds`)
        await sleep(10000)

        const producer = await fluvio.topicProducer(TOPIC_NAME)
        for (let i: number = 1; i < 10; i++) {
            // Create a JSON message as our value
            const message = JSON.stringify({
                key: i,
                message: `This is message ${i}`,
            })

            // Send a key/value record
            if (keyValue) {
                // Here, we convert the key into an ArrayBuffer
                const encoder = new TextEncoder()
                const key: ArrayBuffer = encoder.encode(`KEY ${i}`)

                // Notice that 'key' is an ArrayBuffer and 'message' is a string. Both work!
                await producer.send(key, message)
            } else {
                // Send a simple record with no key
                await producer.sendRecord(message, 0)
            }
        }
    } catch (ex) {
        console.log('error', ex)
    }
}

produce()

/* tslint:disable:no-console */
import Fluvio from '../src/index'
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
        for (var counter: number = 1; counter < 10; counter++) {
            // Stringify message
            const message = JSON.stringify({
                counter,
                message: 'Stringified JSON',
            })

            if (keyValue) {
                // Send a key/value record
                const key = counter.toString();
                await producer.send(key, message);
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

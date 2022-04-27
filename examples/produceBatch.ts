/* tslint:disable:no-console */
import Fluvio, { KeyValue } from '@fluvio/client'

const TOPIC_NAME = 'node-examples'

async function produceBatch() {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to fluvio')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        const producer = await fluvio.topicProducer(TOPIC_NAME)
        const records: KeyValue[] = []
        for (let i: number = 1; i <= 10; i++) {
            // Create a JSON message as our value
            const message = JSON.stringify({
                key: i,
                message: `Message ${i}`,
            })

            const encoder = new TextEncoder()
            const key: ArrayBuffer = encoder.encode(`KEY ${i}`)
            records.push([key, message])
        }

        console.log(records)

        // send all records in a batch
        await producer.sendAll(records)
        await producer.flush()
    } catch (ex) {
        console.log('error', ex)
    }
}

produceBatch()

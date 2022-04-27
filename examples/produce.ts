/* tslint:disable:no-console */
import Fluvio from '@fluvio/client'

const TOPIC_NAME = 'node-examples'

async function produce(keyValue: boolean = true) {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to fluvio')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        const producer = await fluvio.topicProducer(TOPIC_NAME)
        for (let i: number = 1; i <= 10; i++) {
            // Create a JSON message as our value
            const message = JSON.stringify({
                key: i,
                message: `Value ${i}`,
            })

            console.log(message)

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
            await producer.flush()
        }
    } catch (ex) {
        console.log('error', ex)
    }
}

produce()

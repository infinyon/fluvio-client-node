/* tslint:disable:no-console */
import Fluvio, { Offset, Record } from '@fluvio/client'

const TOPIC_NAME = 'node-examples'
const PARTITION = 0

async function consumeIterator() {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to fluvio')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        // Create partition consumer
        const consumer = await fluvio.partitionConsumer(TOPIC_NAME, PARTITION)

        console.log(`read from ${TOPIC_NAME}`)

        let count = 1
        let stream = await consumer.createStream(Offset.FromBeginning())

        for await (const record of stream) {
            const key = record.keyString()
            const value = record.valueString()
            console.log(`Key=${key}, value=${value}`)
            if (count >= 10) break
            count++
        }
    } catch (ex) {
        console.log('error', ex)
    }
}

consumeIterator()

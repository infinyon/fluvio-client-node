/* tslint:disable:no-console */
import Fluvio, { Offset, Record } from '@fluvio/client'

const TOPIC_NAME = 'node-examples'
const PARTITION = 0

async function consume() {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to fluvio')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        // Create partition consumer
        const consumer = await fluvio.partitionConsumer(TOPIC_NAME, PARTITION)

        console.log('read from the beginning')

        await consumer.stream(
            Offset.FromBeginning(),
            async (record: Record) => {
                // handle record;
                console.log(
                    `Key=${record.keyString()}, Value=${record.valueString()}`
                )
            }
        )
    } catch (ex) {
        console.log('error', ex)
    }
}

consume()

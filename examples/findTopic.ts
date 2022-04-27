/* tslint:disable:no-console */
import Fluvio from '@fluvio/client'

const TOPIC_NAME = 'node-examples'

async function findTopic() {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to fluvio')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // Look-up a specific topic
        const topic = await admin.findTopic(TOPIC_NAME)

        console.log('topic: ', JSON.stringify(topic, undefined, 2))
    } catch (ex) {
        console.log('problem finding topic', ex)
    }
}

findTopic()

/* tslint:disable:no-console */
import Fluvio from '@fluvio/client'

const TOPIC_NAME = 'node-examples'

async function createTopic() {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to fluvio')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // create topic
        await admin.createTopic(TOPIC_NAME)

        console.log(`topic '${TOPIC_NAME}' created`)
    } catch (ex) {
        console.log('problem creating topic', ex)
    }
}

createTopic()

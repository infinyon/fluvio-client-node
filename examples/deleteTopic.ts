/* tslint:disable:no-console */
import Fluvio from '@fluvio/client'

const TOPIC_NAME = 'node-examples'

async function deleteTopic() {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to fluvio')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // delete topic
        await admin.deleteTopic(TOPIC_NAME)

        console.log(`topic '${TOPIC_NAME}' deleted`)
    } catch (ex) {
        console.log('problem deleting topic', ex)
    }
}

deleteTopic()

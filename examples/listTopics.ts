/* tslint:disable:no-console */
import Fluvio from '@fluvio/client'

async function listTopics() {
    try {
        const fluvio = new Fluvio()

        console.log('connecting client to sc')

        // Connect to the fluvio cluster referenced in the cli profile.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // List all topics
        const topics = await admin.listTopic()
        console.log(
            'topics: ',
            JSON.stringify(JSON.parse(topics), undefined, 2)
        )
    } catch (ex) {
        console.log('problem listing topics', ex)
    }
}

listTopics()

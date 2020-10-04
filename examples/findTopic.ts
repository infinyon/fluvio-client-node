/* tslint:disable:no-console */
import Fluvio from '../src/index'

async function findTopic() {
    try {
        const fluvio = new Fluvio()

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        const topic = await admin.findTopic('my-topic')

        console.log('topic: ', topic)
    } catch (ex) {
        console.log('problem getting topic', ex)
    }
}

findTopic()

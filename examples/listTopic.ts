/* tslint:disable:no-console */
import Fluvio from '../src/index'

console.log('connecting client to sc')

async function listTopics() {
    try {
        const fluvio = new Fluvio({
            host: '0.0.0.0',
            port: 9003,
        })

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        const topics = await admin.listTopic()

        console.log('received topics ', topics)
    } catch (ex) {
        console.log('problem getting topic', ex)
    }
}

listTopics()

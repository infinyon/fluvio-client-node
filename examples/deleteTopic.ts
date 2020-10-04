/* tslint:disable:no-console */
import Fluvio from '../src/index'

console.log('connecting client to sc')

async function deleteTopic() {
    try {
        const fluvio = new Fluvio()

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // delete topic
        await admin.deleteTopic('test3')

        console.log('topic test3 deleted')
    } catch (ex) {
        console.log('problem deleting topic', ex)
    }
}

deleteTopic()

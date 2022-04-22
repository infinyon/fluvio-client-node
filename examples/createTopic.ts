/* tslint:disable:no-console */
import Fluvio, { TopicReplicaParam } from '@fluvio/client'
import { v4 as uuidV4 } from 'uuid'

console.log('connecting client to sc')

async function createTopic() {
    try {
        const fluvio = new Fluvio()

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // Create a new unique topic name;
        const topicName = uuidV4()

        // create topic
        await admin.createTopic(topicName)

        console.log('topic created')
    } catch (ex) {
        console.log('problem creating topic', ex)
    }
}

createTopic()

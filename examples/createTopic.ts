import Fluvio, { TopicReplicaParam, TopicSpec } from '../src/index'
import { v4 as uuidV4 } from 'uuid'

console.log('connecting client to sc')

async function createTopic() {
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

        const spec = new TopicSpec({
            partitions: 1,
            replicationFactor: 1,
            ignoreRackAssignment: false,
        })

        // Create a new unique topic name;
        const topicName = uuidV4()

        // create topic
        await admin.createTopic(topicName, spec.opts)

        console.log('topic created')
    } catch (ex) {
        console.log('problem creating topic', ex)
    }
}

createTopic()

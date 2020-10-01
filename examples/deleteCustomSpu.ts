/* tslint:disable:no-console */
import Fluvio from '../src/index'

console.log('connecting client to sc')

async function deleteCustomSpu() {
    try {
        const fluvio = new Fluvio({
            host: '0.0.0.0',
            port: 9003,
            partitions: 1,
            replicationFactor: 3,
            ignoreRackAssignment: false,
        })

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        // delete custom spu
        await admin.deleteCustomSpu(5001)

        console.log('custom spu deleted')
    } catch (ex) {
        console.log('problem delete spu', ex)
    }
}

deleteCustomSpu()

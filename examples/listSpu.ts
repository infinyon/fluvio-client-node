/* tslint:disable:no-console */
import Fluvio from '../src/index'

console.log('connecting client to sc')

async function listSpu() {
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

        const spu = await admin.listSpu()

        console.log('spu', spu)
        return
    } catch (ex) {
        console.log('problem getting spu', ex)
        return
    }
}

listSpu()

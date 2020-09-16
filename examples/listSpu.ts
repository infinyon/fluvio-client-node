import Fluvio from '../src/index'

console.log('connecting client to sc')

async function list_spu() {
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

        let buffer = Buffer.from(spu)
        console.log('spu', buffer)
    } catch (ex) {
        console.log('problem getting spu', ex)
    }
}

list_spu()

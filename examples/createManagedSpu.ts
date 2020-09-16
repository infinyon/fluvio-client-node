import Fluvio, { Encryption, CustomSpuSpec } from '../src/index'
import { v4 as uuidV4 } from 'uuid'

console.log('connecting client to sc')

async function createManagedSpu() {
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

        // If you want to use defaults from above, you can leave
        // the spec undefined and it will generate a default spec;
        //
        // Otherwise, a developer can generate a new spec using
        // new SpuGroupSpec({ ...options })
        const spec = undefined

        const spuName = uuidV4()

        // create managed spu
        await admin.createManagedSpu(spuName, spec)

        console.log('managed spu created')
    } catch (ex) {
        console.log('problem creating spu', ex)
    }
}

createManagedSpu()

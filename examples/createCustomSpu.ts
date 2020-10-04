/* tslint:disable:no-console */
import Fluvio from '../src/index'
import { v4 as uuidV4 } from 'uuid'

console.log('connecting client to sc')

async function createCustomSpu() {
    try {
        const fluvio = new Fluvio()

        // Explicitly call `.connect()` to connect to the cluster;
        // This allows for lazily-loading the connection, useful in
        // situations where the fluvio client does not need to immediately
        // connect.
        await fluvio.connect()

        // Set the admin client;
        const admin = await fluvio.admin()

        const spuName = uuidV4()

        // Only available if admin has been set, otherwise
        // will error;
        // If you want to use defaults from above, you can leave
        // the spec undefined and it will generate a default spec;
        //
        // Otherwise, a developer can generate a new spec using
        // new CustomSpuSpec({ ...options })
        await admin.createCustomSpu(spuName)

        console.log('custom spu created')
    } catch (error) {
        console.log('problem creating spu', error)
    }
}

createCustomSpu()

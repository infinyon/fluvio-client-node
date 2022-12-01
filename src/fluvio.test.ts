import Fluvio, {
    FluvioAdmin,
    OffsetFrom,
    KeyValue,
    Offset,
    SmartModuleType,
} from '../src/index'
import { v4 as uuidV4 } from 'uuid'
import fs from 'fs'

const topic_create_timeout = 10000
async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

describe('Fluvio Admin', () => {
    test('Connect FluvioAdmin', async () => {
        const fluvio = await Fluvio.connect()
        expect(fluvio).toBeInstanceOf(Fluvio)
        const admin = await fluvio.admin()
        expect(admin).toBeInstanceOf(FluvioAdmin)
    })
})

describe('Fluvio Producer and Consume using AsyncIterator', () => {
    jest.setTimeout(100000) // 100 seconds
    let admin: FluvioAdmin
    let fluvio: Fluvio
    let topic: string

    beforeAll(async () => {
        topic = uuidV4()
        fluvio = await Fluvio.connect()
        admin = await fluvio.admin()
        console.log(`Creating topic ${topic}`)
        const new_topic = await admin.createTopic(topic)
        await sleep(topic_create_timeout)
    })

    afterAll(async () => {
        console.log(`Deleting topic ${topic}`)
        await admin.deleteTopic(topic)
        await sleep(topic_create_timeout)
    })

    test('Send and Consume using iterator!', async () => {
        const producer = await fluvio.topicProducer(topic)
        const messages: string[] = []

        const MAX_COUNT = 10
        console.log('send records')
        for (let i = 0; i < MAX_COUNT; i++) {
            const msg = `Message: ${i}`
            console.log(`sending message ${msg}`)
            let error
            for (let j = 0; j < 10; j++) {
                try {
                    await producer.send(i.toString(), msg)
                    error = undefined
                    break
                } catch (e) {
                    console.log(`ERROR error: ${e}`)
                    error = e
                }
            }
            if (error !== undefined) {
                throw error
            }
            expect(error).toBeUndefined()
            messages.push(msg)
            console.log(`sent message ${msg}`)
        }
        console.log(`Getting a consumer for ${topic}`)

        const consumer = await fluvio.partitionConsumer(topic, 0)
        let counter = 0
        const stream = await consumer.createStream(Offset.FromBeginning())
        for await (const record of stream) {
            expect(record.valueString()).toEqual(`Message: ${counter}`)
            counter++
            if (counter >= MAX_COUNT) break
        }
        expect(counter).toEqual(MAX_COUNT)
    })
})

describe('Fluvio Batch Producer', () => {
    jest.setTimeout(100000) // 100 seconds
    let admin: FluvioAdmin
    let fluvio: Fluvio
    let topic: string

    beforeAll(async () => {
        topic = uuidV4()
        fluvio = await Fluvio.connect()
        admin = await fluvio.admin()
        console.log(`Creating topic ${topic}`)
        const new_topic = await admin.createTopic(topic)
        await sleep(topic_create_timeout)
    })

    afterAll(async () => {
        console.log(`Deleting topic ${topic}`)
        await admin.deleteTopic(topic)
        await sleep(topic_create_timeout)
    })

    test('Send records using batch producer', async () => {
        const producer = await fluvio.topicProducer(topic)

        const MAX_COUNT = 10
        const records: KeyValue[] = []
        for (let i = 0; i < MAX_COUNT; i++) {
            const key = `${i}`
            const value = `This is record ${i}`
            const record: KeyValue = [key, value]
            records.push(record)
        }
        await producer.sendAll(records)
        const consumer = await fluvio.partitionConsumer(topic, 0)
        let counter = 0
        const stream = await consumer.createStream(Offset.FromBeginning())
        for await (const record of stream) {
            expect(record.valueString()).toEqual(`This is record ${counter}`)
            counter++
            if (counter >= MAX_COUNT) break
        }
        expect(counter).toEqual(MAX_COUNT)
    })
})

describe('Configures a SmartModule', () => {
    jest.setTimeout(100000) // 100 seconds
    let admin: FluvioAdmin
    let fluvio: Fluvio
    let topic: string

    beforeEach(async () => {
        topic = uuidV4()
        fluvio = await Fluvio.connect()
        admin = await fluvio.admin()

        console.log(`Creating topic ${topic}`)

        await admin.createTopic(topic)
        await sleep(topic_create_timeout)
    })

    afterEach(async () => {
        console.log(`Deleting topic ${topic}`)
        await admin.deleteTopic(topic)
        await sleep(topic_create_timeout)
    })

    test('Applies a SmartModule on the provided stream using `smartmoduleFile`', async () => {
        const producer = await fluvio.topicProducer(topic)
        const consumer = await fluvio.partitionConsumer(topic, 0)
        const serverLogsFile = await fs.promises.readFile(
            './fixtures/server_log.json',
            'utf8'
        )
        const serverLogs: { message: string; level: string }[] =
            JSON.parse(serverLogsFile)
        const stream = await consumer.streamWithConfig(Offset.FromBeginning(), {
            smartmoduleType: SmartModuleType.Filter,
            smartmoduleFile: './fixtures/server_logs_filter.wasm',
        })
        const receivedLogs = []

        for (let log of serverLogs) {
            producer.send(uuidV4(), JSON.stringify(log))
        }

        for await (const record of stream) {
            receivedLogs.push(JSON.parse(record.valueString()))

            if (receivedLogs.length >= 5) {
                break
            }
        }

        expect(
            receivedLogs.find((log) => log.level === 'debug')
        ).toBeUndefined()
        expect(receivedLogs.length).toBe(
            serverLogs.filter((log) => log.level !== 'debug').length
        )
    })

    test('Applies a SmartModule on the provided stream using `smartmoduleData`', async () => {
        const producer = await fluvio.topicProducer(topic)
        const consumer = await fluvio.partitionConsumer(topic, 0)
        const serverLogsFile = await fs.promises.readFile(
            './fixtures/server_log.json',
            'utf8'
        )
        const serverLogs: { message: string; level: string }[] =
            JSON.parse(serverLogsFile)
        const wasmSmartModule = await fs.promises.readFile(
            './fixtures/server_logs_filter.wasm.gz'
        )
        const stream = await consumer.streamWithConfig(Offset.FromBeginning(), {
            smartmoduleType: SmartModuleType.Filter,
            smartmoduleData: wasmSmartModule.toString('base64'),
        })
        const receivedLogs = []

        for (let log of serverLogs) {
            producer.send(uuidV4(), JSON.stringify(log))
        }

        for await (const record of stream) {
            receivedLogs.push(JSON.parse(record.valueString()))

            if (receivedLogs.length >= 5) {
                break
            }
        }

        expect(
            receivedLogs.find((log) => log.level === 'debug')
        ).toBeUndefined()
        expect(receivedLogs.length).toBe(
            serverLogs.filter((log) => log.level !== 'debug').length
        )
    })

    test('Complains when providing two SmartModule options at the same time', async () => {
        const consumer = await fluvio.partitionConsumer(topic, 0)
        const wasmSmartModule = await fs.promises.readFile(
            './fixtures/server_logs_filter.wasm.gz'
        )

        expect(
            async () =>
                await consumer.streamWithConfig(Offset.FromBeginning(), {
                    smartmoduleType: SmartModuleType.Filter,
                    smartmoduleFile: './fixtures/server_logs_filter.wasm',
                    smartmoduleData: wasmSmartModule.toString('base64'),
                })
        ).rejects.toThrowError(
            'You must either provide one of smartmoduleFile, smartmoduleName or smartmoduleData'
        )
    })
})

describe('MacOSCi', () => {
    test('', async () => {
        // The errors will either be ['Fluvio socket error'] or ['Fluvio config error']
        // Getting expect to work with either is annoying.
        let error = await expect(Fluvio.connect()).rejects.toEqual([
            'Config error: Config has no active profile',
        ])
    })
})

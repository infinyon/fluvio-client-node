import Fluvio, {
    FluvioAdmin,
    OffsetFrom,
    Offset,
} from '../src/index'
import { v4 as uuidV4 } from 'uuid'

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

describe('Fluvio Consumer and Producer', () => {
    jest.setTimeout(10000) // 100 seconds
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

    test('Send and Consume using fetch!', async () => {
        const producer = await fluvio.topicProducer(topic)
        const messages: string[] = []

        const MAX_COUNT = 10
        const partition = 0
        console.log('send records')
        for (let i = 0; i < MAX_COUNT; i++) {
            const msg = `Message: ${i}`
            console.log(`sending message ${msg}`)
            let error
            for (let j = 0; j < 10; j++) {
                try {
                    await producer.sendRecord(msg, partition)
                    error = undefined
                    break
                } catch (e) {
                    console.log(`ERROR error: ${e}`)
                    error = e
                }
            }
            expect(error).toBeUndefined()
            if (error !== undefined) {
                throw error
            }
            messages.push(msg)
            console.log(`sent message ${msg}`)
        }
        console.log(`Getting a consumer for ${topic}`)

        const offsetIndex = 0
        const consumer = await fluvio.partitionConsumer(topic, partition)
        for (let i = 0; i < MAX_COUNT; i++) {
            const offset = new Offset({ index: i, from: OffsetFrom.Beginning })

            console.log(`Fetching ${topic} at index ${i} from the beginning`)
            let error
            let response
            for (let j = 0; j < 10; j++) {
                try {
                    response = await consumer.fetch(offset)
                    console.log(
                        `Successfully fetched a record after the ${j}'th time`
                    )
                    break
                } catch (e) {
                    console.log(`ERROR error: ${e}`)
                    error = e
                }
            }
            expect(response).toBeDefined()
            if (response === undefined) {
                throw error
            }
            console.log(
                `Fetched ${topic} at index ${i} from the beginning ${JSON.stringify(
                    response
                )}`
            )
            console.log(`records: ${response.records}`)

            let batches = response.records.batches
            expect(batches.length).toBeGreaterThan(0)
            let records = batches[0].records
            expect(records.length).toBeGreaterThan(0)
            let record = records[0]
            let msg = record.value
            console.log(`Received ${msg}`)
            expect(msg).toEqual(`Message: ${i}`)

            let record_strings = response.toRecords()
            msg = record_strings[0]
            expect(msg).toEqual(`Message: ${i}`)
        }
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

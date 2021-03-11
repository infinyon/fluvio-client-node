import Fluvio, {
    arrayBufferToString,
    FluvioAdmin,
    OffsetFrom,
    PartitionConsumer,
    stringToArrayBuffer,
    TopicProducer,
    TopicReplicaParam,
    PartitionSpecMetadata,
    Offset,
    FetchablePartitionResponse,
} from '../src/index'
import { v4 as uuidV4 } from 'uuid'
import { exec } from 'child_process'

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

/*
 * These tests require a k8s cluster
 *
describe('Custom SPU', () => {
    let admin: FluvioAdmin
    beforeAll(async () => {
        const fluvio = await Fluvio.connect()
        admin = await fluvio.admin()
    })
    test('Create, Seach, and Delete custom SPU', async () => {
        expect(admin).toBeInstanceOf(FluvioAdmin)
        const spuName = uuidV4()

        const response = await admin.createCustomSpu(spuName)
        expect(response).toBeUndefined()
        await admin.deleteCustomSpu(spuName)

        // Check to ensure the spu is no longer listed;
        const data = await admin.listSpu()
        const spus: any[] = JSON.parse(data)

        const spu = spus.find((s: { name: string }) => {
            return s.name === spuName
        })

        // Expect SPU to no longer exist;
        expect(spu).toBeUndefined()
    })
})

describe('Fluvio Topics', () => {
    let admin: FluvioAdmin
    const topic = uuidV4()
    jest.setTimeout(100000) // 100 seconds
    beforeAll(async () => {
        const fluvio = await Fluvio.connect()
        admin = await fluvio.admin()
    })
    test('Create, List, and Delete Topics!', async () => {
        console.log(`Creating topic ${topic}`)
        const new_topic = await admin.createTopic(topic)
        await sleep(10000)
        expect(new_topic).toEqual(topic)

        console.log(`Listing topics`)
        let data = await admin.listTopic()
        let topics = JSON.parse(data)

        expect(topics.length).toBeGreaterThan(0)

        let this_topic = topics.find((topic: { name: string }) => {
            return topic.name === new_topic
        })

        console.log(`Found this topic ${this_topic}`)
        expect(this_topic).toBeDefined()

        console.log(`Deleting this topic ${topic}`)
        await admin.deleteTopic(topic)
        await sleep(10000)

        data = await admin.listTopic()
        topics = JSON.parse(data)
        this_topic = topics.find((t: { name: string }) => {
            return t.name === topic
        })

        expect(this_topic).toBeUndefined()
    })
})
/**/

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

    /*
    test('Send and Consume using Stream!', async () => {
        const producer = await fluvio.topicProducer(topic)
        const messages: string[] = []

        const MAX_COUNT = 10
        const partition = 0
        console.log('send records')
        for (let i = 0; i < MAX_COUNT; i++) {
            const msg = `Message: ${i}`
            console.log(`sending message ${msg}`)
            await producer.sendRecord(msg, partition)
            messages.push(msg)
            console.log(`sent message ${msg}`)
        }
        console.log('Creating consumer stream')
        const offsetIndex = 0
        const consumer = await fluvio.partitionConsumer(topic, partition)

        const stream = await consumer.stream(
            {
                index: offsetIndex,
                from: OffsetFrom.Beginning,
            }
        )

        let counter = 0
        console.log('STREAM CREATED')

        stream.on('data', (record: string) => {
            console.log('Ending stream: ', record)
            expect(record).toEqual(`Message: ${counter}`)
            counter++
            if(record == 'Message: 9') {
                console.log("Ending stream")
                consumer.endStream() // This is broken
                return
            }
        })
        stream.on('error', (err: string) => {
            console.error(err)
        })
    })
    */
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
        const producer = await fluvio.topicProducer(topic);
        const messages: string[] = [];

        const MAX_COUNT = 10;
        console.log('send records')
        for (let i = 0; i < MAX_COUNT; i++) {
            const msg = `Message: ${i}`
            console.log(`sending message ${msg}`)
            let error
            for (let j = 0; j < 10; j++) {
                try {
                    await producer.send(i.toString(), msg);
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
        const stream = await consumer.createStream(Offset.FromBeginning());
        for await (const record of stream) {
            expect(record.valueString()).toEqual(`Message: ${counter}`)
            counter++
            if (counter >= MAX_COUNT) break;
        }
        expect(counter).toEqual(MAX_COUNT)
    })
})

/*
describe('Multiple Fluvio Instances', () => {
    let admin1: FluvioAdmin
    let admin2: FluvioAdmin
    let admin3: FluvioAdmin
    const topic1 = uuidV4()
    const topic2 = uuidV4()
    const topic3 = uuidV4()
    beforeEach(async () => {
        console.log('Getting fluvio admin instances!')

        admin1 = await (await Fluvio.connect()).admin()
        expect(admin1).toBeInstanceOf(FluvioAdmin)
        console.log('Connected to first fluvio admin instances!')

        admin2 = await (await Fluvio.connect()).admin()
        expect(admin2).toBeInstanceOf(FluvioAdmin)
        console.log('Connected to second fluvio admin instances!')

        admin3 = await (await Fluvio.connect()).admin()
        expect(admin3).toBeInstanceOf(FluvioAdmin)
        console.log('Connected to third fluvio admin instances!')
        await admin1.createTopic(topic1)
        await admin2.createTopic(topic2)
        await admin3.createTopic(topic3)
        await sleep(topic_create_timeout)
    })
    afterEach(async () => {
        await admin1.deleteTopic(topic1)
        await admin2.deleteTopic(topic2)
        await admin3.deleteTopic(topic3)
        await sleep(topic_create_timeout)
    })
    test('Three admins create three different topics', async () => {
        ;[topic1, topic2, topic3].forEach(async (topic) => {
            let data = await admin1.listTopic()
            let topics = JSON.parse(data)
            console.log(`Looking for topic ${topic}`)
            console.log(`Current topics: ${data}`)
            let this_topic = topics.find((t: { name: string }) => {
                return t.name === topic
            })
            console.log(`Found this topic ${this_topic}`)
            expect(this_topic).toBeDefined()
        })
    })
})
*/

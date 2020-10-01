/* tslint:disable:no-console */
import {
    TestSuite,
    BeforeAll,
    Test,
    TestCase,
    expect,
    XTest,
    Timeout,
    AfterAll,
} from 'testyts'
import Fluvio, {
    arrayBufferToString,
    FluvioAdmin,
    OffsetFrom,
    PartitionConsumer,
    stringToArrayBuffer,
    TopicProducer,
    TopicReplicaParam,
    PartitionSpecMetadata,
} from '../src/index'
import { v4 as uuidV4 } from 'uuid'
import { exec } from 'child_process'

const DEFAULT_MAX_BUFFER = 1024 * 1024 // (1MB)

// Set delay for creating a topic;
async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

@TestSuite()
export class FluvioClientTests {
    admin!: FluvioAdmin
    producer!: TopicProducer
    consumer!: PartitionConsumer
    fluvio!: Fluvio
    spuName!: string
    defaultSpuName!: string
    tmpDir!: string
    managedSpuName!: string
    topic!: string

    @BeforeAll()
    @TestCase('Setup fluvio connection and create admin client')
    async beforeAll() {
        // Set fluvio client for test suite;
        this.fluvio = new Fluvio({
            host: '127.0.0.1',
            port: 9003,
        })

        expect.toBeEqual(this.fluvio instanceof Fluvio, true)

        // Connect to the fluvio cluster
        await this.fluvio.connect()

        // // Set the admin for the test suite;
        this.admin = await this.fluvio.admin()
        expect.toBeEqual(this.admin instanceof FluvioAdmin, true)

        // Test array buffer to string conversions
        const testStringConversion = 'test'
        const arrayBuffer = stringToArrayBuffer(testStringConversion)
        expect.toBeEqual(arrayBufferToString(arrayBuffer), testStringConversion)

        // Setup Default spu;
        this.defaultSpuName = 'default-spu'
        this.tmpDir = 'fluvio-test'

        // // Deletion of the default spu
        const spuList: any[] = JSON.parse(await this.admin.listSpu())

        const existingSpu = spuList.find((spu: { name: string }) => {
            return spu.name === this.defaultSpuName
        })

        if (!existingSpu || existingSpu.status.resolution === 'Offline') {
            console.log('creating default spu')

            if (existingSpu) {
                // If the default spu is offline, re-create the default spu;
                await this.admin.deleteCustomSpu(existingSpu.name)
            }

            await this.admin.createCustomSpu(this.defaultSpuName)

            const data = await this.admin.listSpu()
            const spus: any[] = JSON.parse(data)

            const defaultSpu = spus.find((spu: { name: string }) => {
                return spu.name === this.defaultSpuName
            })

            // Retrieve the default Spu id;
            const id = defaultSpu.spec.spuId
            expect.not.toBeEqual(id, undefined)

            // Run the fluvio cli command to start the custom spu;
            // This will start the spu in the background;
            await launchSpu(id, this.tmpDir)

            // Expect default SPU to exist;
            expect.not.toBeEqual(defaultSpu, undefined)
        }
    }

    @Test()
    @TestCase('Create a custom SPU')
    public async createCustomSpu() {
        this.spuName = uuidV4()
        const response = await this.admin.createCustomSpu(this.spuName)
        expect.toBeEqual(response, undefined)
    }

    @Test()
    @TestCase('Search for previously created SPU')
    public async listSpu() {
        const data = await this.admin.listSpu()
        const spus: any[] = JSON.parse(data)

        const spu = spus.find((s: { name: string }) => {
            return s.name === this.defaultSpuName
        })

        // Expect SPU to exist;
        expect.not.toBeEqual(spu, undefined)
    }

    @Test()
    @TestCase('Delete a previously created SPU')
    public async deleteSpu() {
        await this.admin.deleteCustomSpu(this.spuName)

        // Check to ensure the spu is no longer listed;
        const data = await this.admin.listSpu()
        const spus: any[] = JSON.parse(data)

        const spu = spus.find((s: { name: string }) => {
            return s.name === this.spuName
        })

        // Expect SPU to no longer exist;
        expect.toBeEqual(spu, undefined)
    }

    @XTest()
    @TestCase('Create a managed SPU')
    // @Timeout(12000)
    public async createManagedSpu() {
        this.managedSpuName = uuidV4()
        await this.admin.createManagedSpu(this.managedSpuName)

        // Check to ensure the spu exists;
        const data = await this.admin.listSpu()
        const spus: any[] = JSON.parse(data)

        const spu = spus.find((s: { name: string }) => {
            return s.name === this.managedSpuName
        })

        // Expect SPU to exist;
        expect.not.toBeEqual(spu, undefined)
    }

    @XTest()
    @TestCase('Delete a managed SPU')
    public async deleteManagedSpu() {
        expect.not.toBeEqual(this.managedSpuName, undefined)

        await this.admin.deleteManagedSpu(this.managedSpuName)

        // Check to ensure the spu exists;
        const data = await this.admin.listSpu()
        const spus: any[] = JSON.parse(data)

        const spu = spus.find((s: { name: string }) => {
            return s.name === this.managedSpuName
        })

        // Expect SPU to not exist;
        expect.toBeEqual(spu, undefined)
    }

    @Test()
    @TestCase('Create a new topic')
    // @Timeout(2e5)
    public async createTopic() {
        this.topic = uuidV4()
        const topic = await this.admin.createTopic(this.topic)
        expect.toBeEqual(topic, this.topic)
    }

    @Test()
    @TestCase('find a topic')
    public async findTopic() {
        expect.not.toBeEqual(this.topic, undefined)
        const topic = await this.admin.findTopic(this.topic)
        expect.toBeEqual(topic.name, this.topic)
    }

    @Test()
    @TestCase('List topics')
    public async listTopic() {
        expect.not.toBeEqual(this.topic, undefined)
        const data = await this.admin.listTopic()
        const topics = JSON.parse(data)

        expect.toBeTrue(topics.length > 0)

        expect.not.toBeEqual(
            topics.find((topic: { name: string }) => {
                return topic.name === this.topic
            }),
            undefined
        )
    }

    @Test()
    @TestCase('delete a topic')
    public async deleteTopic() {
        expect.not.toBeEqual(this.topic, undefined)
        await this.admin.deleteTopic(this.topic)

        const data = await this.admin.listTopic()
        const topics = JSON.parse(data)

        expect.toBeEqual(
            topics.find((topic: { name: string }) => {
                return topic.name === this.topic
            }),
            undefined
        )
    }

    @XTest()
    @TestCase('Create topic producer, send record and consume events')
    @Timeout(2e5)
    public async producerConsumer() {
        this.topic = uuidV4()
        await this.admin.createTopic(this.topic, {
            partitions: 1,
            replicationFactor: 2,
            ignoreRackAssignment: false,
        } as TopicReplicaParam)
        const targetTopic = await this.admin.findTopic(this.topic)

        expect.not.toBeEqual(targetTopic, undefined)

        const partition = 0
        const offsetIndex = 0

        console.log('create producer for topic: ', this.topic)

        const producer = await this.fluvio.topicProducer(this.topic)

        // wait for topic to be fully provisioned;
        // await this.waitForTopicProvision(this.topic)

        const messages: string[] = []

        console.log('send records')
        for (let i = 0; i < 10; i++) {
            const msg = `Message: ${i}`
            await producer.sendRecord(msg, partition)
            messages.push(msg)
            console.log('sent message')
        }

        console.log('create consumer')
        const consumer = await this.fluvio.partitionConsumer(
            this.topic,
            partition
        )

        // Listen for streaming events;
        await consumer.stream(
            {
                index: offsetIndex,
                from: OffsetFrom.Beginning,
            },
            async (record: string) => {
                console.log('received message')
                expect.toBeTruthy(messages.includes(record))
            }
        )
    }

    @Test()
    @Timeout(2e4)
    @TestCase('Produce and Consume Records given a pre-existing topic')
    public async sendAndConsumer() {
        try {
            const topic = 'my-topic'

            const producer = await this.fluvio.topicProducer(topic)

            const messages: string[] = []
            const partition = 0
            const offsetIndex = 0

            let counter = 10
            console.log('send records')
            for (let i = 0; i < counter; i++) {
                const msg = `Message: ${i}`
                console.log('sending message')
                await producer.sendRecord(msg, partition)
                messages.push(msg)
                console.log('sent message')
            }

            console.log('create consumer')
            const consumer = await this.fluvio.partitionConsumer(
                topic,
                partition
            )

            const listen = new Promise(async (resolve, reject) => {
                try {
                    // Listen for streaming events;
                    await consumer.stream(
                        {
                            index: offsetIndex,
                            from: OffsetFrom.Beginning,
                        },
                        async (record: string) => {
                            console.log('received message', record)
                            expect.toBeTruthy(messages.includes(record))
                            counter -= 1

                            if (counter == 0) {
                                return resolve(true)
                            }
                        }
                    )
                } catch (error) {
                    return reject(error)
                }
            })

            await listen
        } catch (error) {
            console.log('error', error)
        }
    }

    @AfterAll()
    @TestCase('Cleanup temporary test files')
    public async cleanup() {
        await removeTmpDir(this.tmpDir)
    }

    // Private utility function to wait for partition to be provisioned
    private async waitForTopicProvision(targetTopic: string): Promise<void> {
        try {
            let isPartitioned = false

            while (!isPartitioned) {
                const {
                    status: {
                        leader: { leo },
                    },
                } = (await this.admin.findPartition(
                    targetTopic
                )) as PartitionSpecMetadata

                isPartitioned = leo > 0
                console.log('waiting to find topic partition')
                if (!isPartitioned) {
                    await sleep(3000)
                }
            }

            return
        } catch (error) {
            await sleep(3000)
            return await this.waitForTopicProvision(targetTopic)
        }
    }
}

async function removeExistingSpu() {
    exec(
        `pkill -f fluvio run`,
        {
            maxBuffer: DEFAULT_MAX_BUFFER,
        },
        (err, stdout, stderr) => {
            if (err) {
                throw err
            }

            if (stderr) {
                throw new Error(stderr)
            }
            return
        }
    )
}

async function launchSpu(id: string, tmpDir: string) {
    // await removeExistingSpu()
    exec(
        `fluvio run spu -i ${id} --log-base-dir /tmp/${tmpDir} &`,
        {
            maxBuffer: DEFAULT_MAX_BUFFER,
        },
        (err, stdout, stderr) => {
            if (err) {
                throw err
            }

            if (stderr) {
                throw new Error(stderr)
            }
            return
        }
    )
}

async function removeTmpDir(tmpDir: string) {
    exec(
        `rm -rf /tmp/${tmpDir} &`,
        {
            maxBuffer: DEFAULT_MAX_BUFFER,
        },
        (err, stdout, stderr) => {
            if (err) {
                throw err
            }

            if (stderr) {
                throw new Error(stderr)
            }
            return
        }
    )
}

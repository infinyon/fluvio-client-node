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
    RecordSet,
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
            host: 'localhost',
            port: 9003,
        })

        expect.toBeEqual(this.fluvio instanceof Fluvio, true)

        // Connect to the fluvio cluster
        await this.fluvio.connect()

        // // Set the admin for the test suite;
        this.admin = await this.fluvio.admin()
        expect.toBeEqual(this.admin instanceof FluvioAdmin, true)

        // Test array buffer to string conversions
        const string = 'test'
        const arrayBuffer = stringToArrayBuffer(string)
        expect.toBeEqual(arrayBufferToString(arrayBuffer), string)

        console.log('Creating Default Spu')

        // Setup Default spu;
        this.defaultSpuName = 'default-spu'
        this.tmpDir = 'fluvio-test'

        // // Deletion of the default spu
        const spuList: any[] = JSON.parse(await this.admin.listSpu())

        const existingSpu = spuList.find((spu: { name: string }) => {
            return spu.name == this.defaultSpuName
        })

        if (!existingSpu || existingSpu.status.resolution == 'Offline') {
            console.log('creating default spu')

            if (existingSpu) {
                // If the default spu is offline, re-create the default spu;
                await this.admin.deleteCustomSpu(existingSpu.name)
            }

            await this.admin.createCustomSpu(this.defaultSpuName)

            const data = await this.admin.listSpu()
            const spus: any[] = JSON.parse(data)

            const defaultSpu = spus.find((spu: { name: string }) => {
                return spu.name == this.defaultSpuName
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

        let spu = spus.find((spu: { name: string }) => {
            return spu.name == this.defaultSpuName
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

        let spu = spus.find((spu: { name: string }) => {
            return spu.name == this.spuName
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

        let spu = spus.find((spu: { name: string }) => {
            return spu.name == this.managedSpuName
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

        let spu = spus.find((spu: { name: string }) => {
            return spu.name == this.managedSpuName
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
        const data = await this.admin.findTopic(this.topic)
        const topic = JSON.parse(data)
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
                return topic.name == this.topic
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
                return topic.name == this.topic
            }),
            undefined
        )
    }

    @Test()
    @TestCase('Create topic producer, send record and consume events')
    @Timeout(2e5)
    public async producerConsumer() {
        this.topic = uuidV4()
        await this.admin.createTopic(this.topic)
        const data = await this.admin.listTopic()
        const topics = JSON.parse(data)

        const targetTopic = topics.find((topic: { name: string }) => {
            return topic.name == this.topic
        })

        expect.not.toBeEqual(targetTopic, undefined)

        const partition = 0
        const offsetIndex = 0

        console.log('create producer for topic: ', this.topic)

        const producer = await this.fluvio.topicProducer(this.topic)

        // wait for topic to be fully provisioned;
        await this.waitForTopicProvision(this.topic)

        let messages: string[] = []

        console.log('send records')
        for (var i = 0; i < 10; i++) {
            let msg = `Message: ${i}`
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

    @XTest()
    @Timeout(2e4)
    @TestCase('Produce and Consume Records given a pre-existing topic')
    public async sendAndConsumer() {
        try {
            const topic = 'c0f7ada2-71f6-4119-b8f0-484ea8e11d72'

            const producer = await this.fluvio.topicProducer(topic)

            let messages: string[] = []
            const partition = 0
            const offsetIndex = 0

            console.log('send records')
            for (var i = 0; i < 10; i++) {
                let msg = `Message: ${i}`
                await producer.sendRecord(msg, partition)
                messages.push(msg)
                console.log('sent message')
            }

            console.log('create consumer')
            const consumer = await this.fluvio.partitionConsumer(
                topic,
                partition
            )

            // Listen for streaming events;
            await consumer.stream(
                {
                    index: offsetIndex,
                    from: OffsetFrom.Beginning,
                },
                async (record: string) => {
                    try {
                        console.log('received message', record)
                        // expect.toBeTruthy(messages.includes(record))
                    } catch (error) {
                        throw error
                    }
                }
            )
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
            const {
                status: {
                    leader: { leo },
                },
            } = (await this.admin.findPartition(
                targetTopic
            )) as PartitionSpecMetadata

            if (leo == 0) {
                console.log('Waiting for partition to be provisioned')
                await sleep(3000)
                return await this.waitForTopicProvision(targetTopic)
            }
            return
        } catch (error) {
            console.log('waiting to find partition')
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

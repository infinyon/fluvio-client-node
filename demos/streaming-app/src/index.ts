// Import Fluvio
import Fluvio, {
    FluvioAdmin,
    OffsetFrom,
    Options,
    PartitionConsumer,
    TopicProducer,
    Topic,
} from '@fluvio/client'

// Use Node.js `readline` module to read from command line;
// Ensure
import { createInterface, Interface } from 'readline'

// Create a StreamingApp Class to encapsulate our logic;
export default class StreamingApp {
    // The StreamingApp class has a `fluvio` client property
    // to produce and consumer topics;
    fluvio: Fluvio

    // The StreamingApp class has an `admin` FluvioAdmin
    // to manage topics;
    admin?: FluvioAdmin

    // Use Node.js' `readline` to relay messages to the topic producer
    // from the terminal;
    rl: Interface

    // Setup a topic producer;
    producer?: TopicProducer

    // Setup a topic consumer;
    consumer?: PartitionConsumer

    constructor(options?: { fluvio: Options }) {
        // Create a new Fluvio Client;
        this.fluvio = new Fluvio(options?.fluvio)

        // Setup readline
        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        })
    }

    // Create connection to cluster and setup fluvio clients;
    private async configure(
        topicName: string,
        partition?: number,
        isProducer?: boolean
    ) {
        console.log('Connecting to Fluvio Cluster')
        // Setup the connection for the fluvio client;
        await this.fluvio.connect()

        if (isProducer) {
            console.log('Configuring Streaming App for Producer')
            // Create fluvio admin client to create a new topic;
            this.admin = await this.fluvio.admin()
            const foundTopic = await this.admin.findTopic(topicName)

            if (!foundTopic) {
                await this.admin?.createTopic(topicName)
            }

            // Setup a producer for the topic;
            this.producer = await this.fluvio.topicProducer(topicName)
        } else {
            console.log('Configuring Streaming App for Consumer')
            // Setup a consumer for the topic;
            this.consumer = await this.fluvio.partitionConsumer(
                topicName,
                partition || 0
            )
        }
    }

    // send a message from the command line to the producer
    // Wait for the consumer to listen for the message;
    private async sendMessage(partition?: number) {
        console.log(
            'Started Fluvio Producer\n\nStart Typing Your Message in the Terminal\n\n>'
        )
        this.rl.on('line', async (input: string) => {
            await this.producer?.sendRecord(input, partition || 0)
        })
    }

    private async listen() {
        console.log('Started Fluvio Consumer')
        await this.consumer?.stream(
            {
                index: 0,
                from: OffsetFrom.Beginning,
            },
            async (msg: string) => {
                console.log(`Received Message:\n\n${msg}`)
            }
        )
    }

    public async run(topicName: string, partition?: number) {
        const cmd = process.argv[3]
        switch (cmd) {
            case 'producer':
                // Configure for the producer;
                await this.configure(topicName, partition, true)
                return await this.sendMessage()
            case 'consumer':
                // Configure for the consumer;
                await this.configure(topicName, partition)
                return await this.listen()
            default:
                console.log('Unknown command: ', cmd)
                return
        }
    }
}

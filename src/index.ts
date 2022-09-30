/* tslint:disable:max-classes-per-file */
import { EventEmitter } from 'events'

export const DEFAULT_HOST = '127.0.0.1'
export const DEFAULT_PORT = 9003
export const DEFAULT_PUBLIC_PORT = 9005
export const DEFAULT_PRIVATE_PORT = 9006
export const DEFAULT_REPLICAS = 3
export const DEFAULT_ID = 0
export const DEFAULT_TOPIC = 'message'
export const DEFAULT_PARTITIONS = 1
export const DEFAULT_REPLICATION_FACTOR = 1
export const DEFAULT_IGNORE_RACK_ASSIGNMENT = false
export const DEFAULT_MIN_ID = 0
export const DEFAULT_OFFSET = 0
export const DEFAULT_OFFSET_FROM = 'end'

// Set the path to the native module
// to be used for the client; Set `FLUVIO_DEV`
// for development mode

function getDistPath() {
    switch (process.platform) {
        case 'darwin':
            return './darwin'
        case 'freebsd':
        case 'netbsd':
        case 'linux':
        case 'openbsd':
        case 'sunos':
            return './linux'
        case 'win32':
        case 'cygwin':
            return './win'
        default:
            console.log('Platform is not supported')
    }
}
const native_path = !process.env.FLUVIO_DEV
    ? `${getDistPath()}/index.node`
    : `${process.cwd()}/dist/${getDistPath()}/index.node`

const native = require(`${native_path}`)

export const PartitionConsumerJS = native.PartitionConsumerJS

/**
 * Top-level Fluvio Client options;
 *
 * These options are unstable and may be categorized into
 * more specific interfaces; For now, this is the global options
 * used by the entirety of the fluvio client;
 *
 * It is best practice to use explicit arguments directly with the class methods
 * If an option or argument does not exist that is optional, a default value will be
 * used.
 */
export interface Options {
    host?: string
    port?: number
    ingress?: IngressAddr[]
    rack?: string
    encryption?: Encryption
    minId?: number
    replicas?: number
    env?: EnvVar[]
    replication?: ReplicationConfig
    storage?: StorageConfig
    partitions?: number
    replicationFactor?: number
    ignoreRackAssignment?: boolean
    maps?: PartitionMap[]
    topic?: string
    partition?: number
    id?: number
    offsetIndex?: number
    offsetFrom?: string
}

/**
 * Provides access to the data within a Record that was consumed
 */
export interface Record {
    /**
     * Returns the Key of this Record as a byte buffer, or null if there is no key
     */
    key(): ArrayBuffer | null

    /**
     * Returns true if this Record has a key, or false otherwise
     */
    hasKey(): boolean

    /**
     * Returns the Value of this Record as a byte buffer
     */
    value(): ArrayBuffer

    /**
     * Returns the Key of this Record as a string, or null if there is no key
     */
    keyString(): string | null

    /**
     * Returns the Value of this Record as a string
     */
    valueString(): string
}

/**
 * An item that may be sent via the Producer is a string or byte buffer.
 */
type ProducerItem = string | ArrayBuffer

/**
 * A key/value element that may be sent via the Producer.
 */
export type KeyValue = [ProducerItem, ProducerItem]

export interface TopicProducer {
    sendRecord(data: string, partition: number): Promise<void>
    send(key: ProducerItem, value: ProducerItem): Promise<void>
    sendAll(records: KeyValue[]): Promise<void>
    flush(): Promise<void>
}

/**
 * # Topic Producer
 *
 * ## Overview
 *
 * An interface for producing events to a particular topic
 *
 * A TopicProducer allows you to send events to the specific topic it was initialized for.
 * Once you have a TopicProducer, you can send events to the topic,
 * choosing which partition each event should be delivered to.
 *
 * ## Example Construction
 *
 * Do not construct this manually, instead use the following method:
 *
 * ```TypeScript
 * const fluvio = new Fluvio({ host, port })
 *
 * await fluvio.connect();
 *
 * const producer = await fluvio.topicProducer("topic-name")
 * ```
 *
 * This class constructor is used internally by the Fluvio client
 * to provision a topic producer.
 *
 * The `inner` object is a private object that is the native module
 * created by the top-level Fluvio client.
 *
 * This class is not intended to be constructed manually.
 *
 */
export class TopicProducer {
    private inner: TopicProducer
    /**
     * Private constructor
     *
     * This method is not intended to be used directly. This is a helper
     * method used by the `Fluvio` class to pass in a native object,
     * along with top-level Fluvio client options, if any.
     *
     * @param inner The native node module created by `await (new Fluvio().connect()).topicProducer()`
     */
    private constructor(inner: TopicProducer) {
        this.inner = inner
    }

    /**
     * Factory method for creating a new topic Producer; This method is used by the
     * `Fluvio` class. It is not meant to be called directly;
     *
     * @param inner The native node module created by `await (new Fluvio().connect()).topicProducer()`
     */
    public static create(inner: TopicProducer): TopicProducer {
        return new TopicProducer(inner)
    }

    /**
     * Sends an event to a specific partition within this producer's topic
     * @param value Buffered data to send to the Fluvio partition
     * @param partition The partition that this record will be sent to
     */
    async sendRecord(value: string, partition: number): Promise<void> {
        try {
            await this.inner.sendRecord(value, partition)
            return
        } catch (error) {
            throw new Error(`failed to send record due to: ${error}`)
        }
    }

    /**
     * Sends a key-value event to this producer's topic
     * @param key The Key data of the record to send
     * @param value The Value data of the record to send
     */
    async send(
        key: string | ArrayBuffer,
        value: string | ArrayBuffer
    ): Promise<void> {
        await this.inner.send(key, value)
    }

    /**
     * Sends a list of key-value elements to this producer's topic
     * @param elements
     */
    async sendAll(elements: KeyValue[]): Promise<void> {
        await this.inner.sendAll(elements)
    }
    async flush(): Promise<void> {
        await this.inner.flush()
    }
}

export interface PartitionConsumer {
    fetch(offset?: Offset): Promise<FetchablePartitionResponse>
    stream(offset: Offset, cb: (record: Record) => void): Promise<void>
    endStream(): Promise<void>
    createStream(offset: Offset): Promise<AsyncIterable<Record>>
    streamWithConfig(
        offset: Offset,
        config: ConsumerConfig
    ): Promise<AsyncIterable<Record>>
}

/**
 * # Partition Consumer
 *
 * ## Overview
 *
 * An interface for consuming events from a particular partition
 *
 * There are two ways to consume events: by "fetching" events and by "streaming" events.
 * Fetching involves specifying a range of events that you want to consume via their Offset.
 *
 * A fetch is a sort of one-time batch operation: you'll receive all of the events in your range all at once.
 *
 * When you consume events via Streaming, you specify a starting Offset and receive an object
 * that will continuously yield new events as they arrive.
 *
 * ## Example Construction
 *
 * Do not call this constructor manually, instead use the method below:
 *
 * ```TypeScript
 * const fluvio = new Fluvio({ host, port })
 *
 * const partition = 0;
 *
 * await fluvio.connect();
 * const consumer = await fluvio.partitionConsumer("topic-name", partition);
 * ```
 *
 * This class constructor is used internally by the Fluvio client
 * to provision a topic producer.
 *
 * The `inner` object is a private object that is the native module
 * created by the top-level Fluvio client.
 *
 * This class is not intended to be constructed manually.
 *
 */
export class PartitionConsumer {
    private inner: typeof PartitionConsumerJS // This is from the rust.

    /**
     * This method is not intended to be used directly. This is a helper
     * method used by the `Fluvio` class to pass in a native object,
     * along with top-level Fluvio client options, if any.
     *
     * @param inner The native node module created by `new Fluvio().connect().partitionConsumer()`
     * @param options Top-level Fluvio client options
     */
    private constructor(inner: PartitionConsumer) {
        this.inner = inner
    }

    public static create(inner: PartitionConsumer) {
        return new PartitionConsumer(inner)
    }

    /**
     * Fetches events from a particular offset in the consumer's partition
     *
     * A "fetch" is one of the two ways to consume events in Fluvio.
     * It is a batch request for records from a particular offset in the partition.
     *
     * You specify the position of records to retrieve using an Offset,
     * and receive the events as a list of records.
     *
     * @param {Offset} offset Describes the location of an event stored in a Fluvio partition
     */
    async fetch(offset?: Offset): Promise<FetchablePartitionResponse> {
        if (!offset) {
            offset = new Offset()
        }
        return await this.inner.fetch(offset)
    }

    async stream(offset: Offset, cb: (record: Record) => void): Promise<void> {
        await this.inner.stream(offset, cb)
        return
    }

    /**
     * This returns an [`AsyncIterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator).
     * Usage:
     * ```typescript
     * const stream = await consumer.getIterator(Offset.FromBeginning())
     * for await (const next of stream) {
     *     console.log(next)
     * }
     * ```
     */
    async createStream(offset: Offset): Promise<AsyncIterable<Record>> {
        let stream = await this.inner.createStream(offset)
        stream[Symbol.asyncIterator] = () => {
            return stream
        }
        return stream
    }

    async streamWithConfig(
        offset: Offset,
        config: ConsumerConfig
    ): Promise<AsyncIterable<Record>> {
        let stream = await this.inner.streamWithConfig(offset, config)
        stream[Symbol.asyncIterator] = () => {
            return stream
        }
        return stream
    }
}

export interface FluvioAdmin {
    createCustomSpu(name: string, spec?: CustomSpuSpec): Promise<void>
    createManagedSpu(name: string, spec?: SpuGroupSpec): Promise<void>
    createTopic(
        topic: string,
        spec?: PartitionMaps | TopicReplicaParam
    ): Promise<string>
    deleteCustomSpu(key: string | number): Promise<void>
    deleteManagedSpu(name: string): Promise<void>
    deleteTopic(topic: string): Promise<string>
    findTopic(topic: string): Promise<Topic>
    listSpu(): Promise<string>
    listTopic(): Promise<string>
    listPartitions(): Promise<string>
    findPartition(topic: string): Promise<PartitionSpecMetadata>
}

/**
 *  # Fluvio Admin Client
 *
 *  ## Overview
 *
 * An interface for managing a Fluvio cluster
 *
 * Most applications will not require administrator functionality. The FluvioAdmin interface is used to create,
 * edit, and manage Topics and other operational items. Think of the difference between regular clients of a Database
 * and its administrators. Regular clients may be applications which are reading and writing data to and from tables
 * that exist in the database. Database administrators would be the ones actually creating, editing, or deleting
 * tables. The same thing goes for Fluvio administrators.
 *
 * If you are writing an application whose purpose is to manage a Fluvio cluster for you,
 * you can gain access to the FluvioAdmin client via the regular Fluvio client
 *
 * ## Example Construction
 *
 * ```TypeScript
 * const fluvio = new Fluvio({ host, port })
 *
 * await fluvio.connect();
 *
 * const admin = await fluvio.admin();
 * ```
 *
 * ## Errors
 *
 * Creating an admin client will fail if you do not have admin authorization in the connected custer.
 *
 */
export class FluvioAdmin {
    private inner: FluvioAdmin
    options?: Partial<Options>
    /**
     * This method is not intended to be used directly. This is a helper
     * method used by the `Fluvio` class to pass in a native object,
     * along with top-level Fluvio client options, if any.
     *
     * @param inner The native FluvioAdmin module, must be the value returned from `await new Fluvio().admin()`;
     * @param options Optional values inherited from top-level options;
     */
    constructor(inner: FluvioAdmin, options?: Partial<Options>) {
        this.inner = inner
        this.options = options
    }

    /**
     *
     * Create a new custom Streaming Processing Unit (SPU)
     *
     * @param {string} name Name of the custom spu;
     * @param {CustomSpuSpec} spec Pass in a custom spec or use a default based on
     * top-level options;
     */
    async createCustomSpu(name: string, spec?: CustomSpuSpec): Promise<void> {
        const targetSpec = spec || new CustomSpuSpec(this.options)
        await this.inner.createCustomSpu(name, targetSpec)
        return
    }

    /**
     *
     * Create a new managed Streaming Processing Unit (SPU)
     *
     * @param {string} name name of the managed spu group
     * @param {SpuGroupSpec} spec Optional specification for the SpuGroup. If no spec
     * is provided, default settings will be used.
     */
    async createManagedSpu(name: string, spec?: SpuGroupSpec): Promise<void> {
        const targetSpec = spec || new SpuGroupSpec(this.options)
        await this.inner.createManagedSpu(name, targetSpec)
        return
    }

    /**
     *
     * Create a new topic with an optional topic specification;
     *
     * @param {string} topic name of the topic
     * @param {TopicSpec} spec Topic specification
     */
    async createTopic(
        topic: string,
        spec?: PartitionMaps | TopicReplicaParam
    ): Promise<string> {
        const targetSpec = new TopicSpec(spec || this.options)
        return await this.inner.createTopic(topic, targetSpec.opts)
    }

    /**
     * Delete a custom SPU using either a string or number;
     *
     * @param {string | number} key SPU key to target for deletion;
     */
    async deleteCustomSpu(key: string | number): Promise<void> {
        return await this.inner.deleteCustomSpu(key)
    }

    /**
     *
     * Delete a managed SPU by name
     *
     * @param {string} name Name of the managed SPU to delete;
     */
    async deleteManagedSpu(name: string): Promise<void> {
        await this.inner.deleteManagedSpu(name)
    }

    /**
     *
     * Delete a topic by name
     *
     * @param {string} topic Name of the topic to delete
     */
    async deleteTopic(topic: string): Promise<string> {
        return await this.inner.deleteTopic(topic)
    }

    /**
     *
     * Find a topic by name
     *
     * @param {string} topic Name of the topic to find;
     *
     */
    async findTopic(topic: string): Promise<Topic> {
        const buffer = await this.inner.findTopic(topic)
        return JSON.parse(arrayBufferToString(buffer as any)) as Topic
    }

    /**
     * List SPUs
     * TODO: convert stringified json to structured types;
     */
    async listSpu(): Promise<string> {
        const buffer = await this.inner.listSpu()
        return arrayBufferToString(buffer as any)
    }

    /**
     * List topics
     */
    async listTopic(): Promise<string> {
        const buffer = await this.inner.listTopic()
        return arrayBufferToString(buffer as any)
    }

    /**
     * List partitions
     */
    async listPartitions(): Promise<string> {
        const buffer = await this.inner.listPartitions()
        return arrayBufferToString(buffer as any)
    }

    /**
     * Find a partition by topic name;
     * @param topic topic name to search partition by
     */
    async findPartition(topic: string): Promise<PartitionSpecMetadata> {
        return await this.inner.findPartition(topic)
    }
}

export interface FluvioClient {
    connect(options?: Partial<Options>): Promise<FluvioClient>
    // connectWithConfig(config: any): Promise<this>
    topicProducer(topic: string): Promise<TopicProducer>
    partitionConsumer(
        topic: string,
        partition: number
    ): Promise<PartitionConsumer>
    admin(): Promise<FluvioAdmin>
}

/**
 *
 * # Fluvio TypeScript / NodeJS Client
 *
 * ## Overview
 *
 * The NodeJS client for communicating with Fluvio clusters.
 *
 * ## Example Construction
 *
 * ```TypeScript
 *
 * import Fluvio, { RecordSet } from '@fluvio/client';
 *
 * // define the name of the topic to use
 * const TOPIC_NAME = "my-topic"
 *
 * // define the partition where the topic
 * // records will be stored;
 * const PARTITION = 0
 *
 * // Instantiate a new fluvio client
 * const fluvio = new Fluvio({
 *  host: '127.0.0.1',
 *  port: 9003
 * });
 *
 * // Explicitly connect to the fluvio cluster;
 * await fluvio.connect();
 *
 * //// Fluvio Admin Client
 *
 * // Create a new Fluvio Admin Client to manage
 * // topics and partitions
 * const admin = await fluvio.admin();
 *
 * // Create a new topic
 * await admin.createTopic(TOPIC_NAME)
 *
 * //// Topic Producer
 *
 * // Create a topic producer for the topic;
 * const producer = await fluvio.topicProducer(TOPIC_NAME);
 *
 * // Send a new topic record
 * producer.sendRecord("stringified data", PARTITION)
 *
 * //// Partition Consumer
 *
 * // Instantiate a new topic listener;
 * const consumer = await fluvio.partitionConsumer(TOPIC_NAME, PARTITION)
 *
 * // Listen for new topics sent by a topic producer;
 * await consumer.listen(async (data: RecordSet) => {
 *   // handle data record
 * })
 * ```
 *
 * ## Uses Node Native Modules
 *
 * TypeScript wrapper around native fluvio core module written in Rust.
 *
 * Core module is generated from node-bindgen. This TypeScript
 * wrapper provides type definitions and generates the JavaScript
 * client.
 */
export default class Fluvio implements FluvioClient {
    // Native module required at time of construction;
    // This the built node binary from the node-bindgen rust source files
    private inner: any
    // Internal options passed in from the constructor that can be accessed
    // internally by the Fluvio client.
    private options: Options
    // set using await this.connect();
    private client?: FluvioClient

    /**
     *
     * @param { Options } options Options provides top-level access to common
     * configurable values used by the Fluvio client.
     */
    constructor(options?: Options) {
        // Use the native module as the core library;
        this.inner = native
        this.options = options || {}
    }

    /**
     * Add static method to quickly create a connected client;
     * @param options Fluvio options passed into new fluvio instance;
     */
    public static async connect(options?: Options): Promise<Fluvio> {
        const fluvio = new Fluvio(options)
        await fluvio.connect()
        return fluvio
    }

    /**
     *
     * @param options Optionally pass in connection host options (e.g. { host: '' })
     * uses the partial Options type; This does not override the default options,
     * only replaces default options in this case;
     */
    async connect(options?: Partial<Options>): Promise<FluvioClient> {
        // only set connection if client is undefined
        if (!this.client) {
            const host = options?.host ? options.host : this.options.host
            const port = options?.port ? options.port : this.options.port

            this.client =
                host && port
                    ? await this.inner.connect(`${host}:${port}`)
                    : await this.inner.connect()
        }

        return this as FluvioClient
    }

    /**
     * Check to ensure this.client has been set. This method is used internally to check
     * the connection status of the client before calling a method using the internal client.
     */
    private checkConnection() {
        if (!this.client) {
            throw new Error(
                'Failed to find socket; must call `.connect()` method to create a connection before calling this method;'
            )
        }
    }

    /**
     * Creates a new TopicProducer for the given topic name
     *
     * Currently, producers are scoped to a specific Fluvio topic.
     * That means when you send events via a producer,
     * you must specify which partition each event should go to.
     *
     * @param {string} topic Name of the topic to create a producer for
     */
    async topicProducer(topic: string): Promise<TopicProducer> {
        this.checkConnection()
        const inner = await this.client?.topicProducer(topic)
        if (!inner) {
            throw new Error('Failed to create topic producer')
        }
        return TopicProducer.create(inner)
    }

    /**
     *
     * Creates a new PartitionConsumer for the given topic and partition
     *
     * Currently, consumers are scoped to both a specific Fluvio topic and to a particular
     * partition within that topic. That means that if you have a topic with multiple partitions,
     * then in order to receive all of the events in all of the partitions,
     * you will need to create one consumer per partition.
     *
     * @param topic topic string
     * @param partition partition id
     */
    async partitionConsumer(
        topic: string,
        partition: number
    ): Promise<PartitionConsumer> {
        this.checkConnection()
        const inner = await this.client?.partitionConsumer(topic, partition)
        if (!inner) {
            throw new Error('Failed to create partition consumer')
        }
        return PartitionConsumer.create(inner)
    }

    /**
     * Provides an interface for managing a Fluvio cluster
     */
    async admin(): Promise<FluvioAdmin> {
        this.checkConnection()
        const inner = await this.client?.admin()
        if (!inner) {
            throw new Error('Failed to create FluvioAdmin client')
        }
        return new FluvioAdmin(inner, this.options)
    }
}

export enum Encryption {
    Plaintext = 'Plaintext',
    Ssl = 'Ssl',
}

export interface Endpoint {
    port: number
    host: string
    encryption: string
}

export interface IngressAddr {
    hostname?: string
    ip?: string
}

export interface IngressPort {
    port: number
    ingress: IngressAddr[]
    encryption: string
}

export interface CustomSpuSpec {
    id: number
    publicEndpoint: IngressPort
    privateEndpoint: Endpoint
    rack?: string
}

export class CustomSpuSpec {
    constructor(options?: Partial<Options>) {
        this.id = options?.id || getRandomId()
        this.privateEndpoint = {
            host: options?.host || DEFAULT_HOST,
            port: DEFAULT_PRIVATE_PORT,
            encryption: options?.encryption || Encryption.Plaintext,
        }

        this.publicEndpoint = {
            port: DEFAULT_PUBLIC_PORT,
            ingress: options?.ingress || [
                {
                    hostname: DEFAULT_HOST,
                },
            ],
            encryption: options?.encryption || Encryption.Plaintext,
        }

        if (options?.rack) {
            this.rack = options.rack
        }
    }
}

export interface EnvVar {
    name: string
    value: string
}

export interface StorageConfig {
    logDir?: string
    size?: string
}

export interface ReplicationConfig {
    inSyncReplicaMin?: number
}

export interface SpuConfig {
    env: EnvVar[]
    storage?: StorageConfig
    replication?: ReplicationConfig
    rack?: string
}

export class SpuConfig {
    constructor(options?: SpuConfig | Partial<Options>) {
        this.env = options?.env || []

        if (options?.rack) {
            this.rack = options.rack
        }

        if (options?.replication) {
            this.replication = options.replication
        }

        if (options?.storage) {
            this.storage = options.storage
        }
    }
}

export interface ReplicaStatus {
    spu: number
    hw: number
    leo: number
}

export interface PartitionSpecMetadata {
    name: string
    spec: PartitionSpec
    status: PartitionSpecStatus
}

export interface PartitionSpecStatus {
    resolution: string
    leader: ReplicaStatus
    lsr: string
    replicas: ReplicaStatus[]
}

export interface PartitionSpec {
    leader: number
    replicas: number[]
}

export interface SpuGroupSpec {
    replicas: number
    minId: number
    spuConfig: SpuConfig
}

export class SpuGroupSpec {
    constructor(options?: SpuGroupSpec | Partial<Options>) {
        this.minId = options?.minId || DEFAULT_MIN_ID
        this.replicas = options?.replicas || DEFAULT_REPLICAS
        this.spuConfig = new SpuConfig(options)
    }
}

export interface PartitionMap {
    id: number
    replicas: number[]
}

export interface PartitionMaps {
    maps: PartitionMap[]
}

export interface TopicReplicaParam {
    partitions: number
    replicationFactor: number
    ignoreRackAssignment: boolean
}

export interface TopicSpec {
    opts: PartitionMaps | TopicReplicaParam
}

export class TopicSpec {
    constructor(
        options?: Partial<Options> | PartitionMaps | TopicReplicaParam | any
    ) {
        if (options.maps) {
            this.opts = {
                maps: options.maps,
            }
        } else {
            this.opts = {
                partitions: options.partitions || DEFAULT_PARTITIONS,
                replicationFactor:
                    options.replicationFactor || DEFAULT_REPLICATION_FACTOR,
                ignoreRackAssignment:
                    options.ignoreRackAssignment ||
                    DEFAULT_IGNORE_RACK_ASSIGNMENT,
            }
        }
    }
}

export enum OffsetFrom {
    Beginning = 'beginning',
    End = 'end',
}

export interface Offset {
    index: number
    from?: OffsetFrom | string
}

export class Offset {
    constructor(options?: Offset) {
        this.index = options?.index || DEFAULT_OFFSET
        this.from = options?.from || DEFAULT_OFFSET_FROM
    }
    public static FromBeginning(): Offset {
        return new Offset({ index: 0, from: OffsetFrom.Beginning })
    }

    public static FromEnd(): Offset {
        return new Offset({ index: 0, from: OffsetFrom.End })
    }
}

export enum SmartModuleType {
    Filter = 'filter',
    Map = 'map',
    ArrayMap = 'array_map',
    FilterMap = 'filter_map',
}

export interface ConsumerConfig {
    maxBytes?: number
    smartmoduleType: SmartModuleType
    /**
     * Path to a SmartModule WASM file.
     *
     * @remarks
     * Internally replaces the value provided to `smartmoduleData`,
     * you must provide one, either `smartmoduleFile` or `smartmoduleData`.
     */
    smartmoduleFile?: string

    /**
     * Gzipped and Base64 encoded SmartModule WASM file.
     */
    smartmoduleData?: string
    smartmoduleName?: string
}

export interface BatchHeader {
    partitionLeaderEpoch: number
    magic: number
    crc: number
    attributes: number
    lastOffsetDelta: number
    firstTimestamp: number
    maxTimeStamp: number
    producerId: number
    producerEpoch: number
    firstSequence: number
}

export interface DefaultRecord {
    key: string
    value: string
    headers: number
}

export interface Batch {
    baseOffset: number
    batchLength: number
    header: BatchHeader
    records: DefaultRecord[]
}
export interface RecordSet {
    batches: Batch[]
}

export enum ErrorCode {
    UnknownServerError,
    None,
    OffsetOutOfRange,
    NotLeaderForPartition,
    StorageError,
    SpuError,
    SpuRegisterationFailed,
    SpuOffline,
    SpuNotFound,
    SpuAlreadyExists,
    TopicError,
    TopicNotFound,
    TopicAlreadyExists,
    TopicPendingInitialization,
    TopicInvalidConfiguration,
    PartitionPendingInitialization,
    PartitionNotLeader,
}

export interface FetchablePartitionResponse {
    partitionIndex: number
    errorCode: ErrorCode
    highWatermark: number
    lastStableOffset: number
    logStartOffset: number
    records: RecordSet
    /**
     * ```typescript
     * let response = await this.fluvioConsumer.fetch(Offset.FromStart())
     * response.toRecords().forEach(msg => {
     *    console.log(msg)
     * })
     * ```
     */
    toRecords(): Array<string>
    aborted?: ArrayBuffer
}

// utility methods

function getRandomId(): number {
    // NOTE: Determine a better id than timestamp + random;
    return +(Math.random() * 1e4).toFixed(0) + 1
}

export function stringToArrayBuffer(data: string): ArrayBuffer {
    const buf = new ArrayBuffer(data.length)
    const bufView = new Uint8Array(buf)
    for (let i = 0; i < data.length; i++) {
        bufView[i] = data.charCodeAt(i)
    }
    return buf
}

export function arrayBufferToString(data: ArrayBuffer): string {
    return Buffer.from(data).toString('utf8')
}

export interface Topic {
    name: string
    spec: {
        type: string
        partitions: number
        replicationFactor: number
        ignoreRackAssignment: boolean
    }
    status: {
        resolution: string
        replicaMap: {
            [key: string]: string
        }
        reason: string
    }
}

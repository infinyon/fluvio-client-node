import fs from 'fs/promises'
import zlib from 'zlib'

/**
 * Opens a WASM file provided as `path`, compresses the file using
 * GZIP compression and retrieves the compressed file `Buffer`.
 *
 *  @param path The path of the file in the fs
 */
export async function openWasmFile(path: string): Promise<Buffer> {
    const file = await fs.readFile(path)
    const compressed = await compressGzip(file)

    return compressed
}

/**
 * Compresses the provided `Buffer` using GZIP compression and retrieves a
 * `Buffer` containing the compressed bytes.
 *
 *  @param buff The `Buffer` instance to compress
 */
export function compressGzip(buff: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        zlib.gzip(buff, (error, compressed) => {
            if (error) {
                return reject(error)
            }

            resolve(compressed)
        })
    })
}

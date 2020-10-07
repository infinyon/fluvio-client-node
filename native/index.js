console.log('requiring module')
let fluvio

if (process.platform === 'darwin') {
    fluvio = require('@fluvio/native-darwin')
} else if (process.platform === 'freebsd') {
    fluvio = require('@fluvio/native-linux')
} else if (process.platform === 'linux') {
    fluvio = require('@fluvio/native-linux')
} else if (process.platform === 'openbsd') {
    fluvio = require('@fluvio/native-linux')
} else if (process.platform === 'sunos') {
    fluvio = require('@fluvio/native-linux')
} else if (process.platform === 'win32') {
    fluvio = require('@fluvio/native-win')
} else if (process.platform === 'cygwin') {
    fluvio = require('@fluvio/native-win')
} else if (process.platform === 'netbsd') {
    fluvio = require('@fluvio/native-linux')
} else {
    throw new Error('Platform is not supported')
}

export default fluvio

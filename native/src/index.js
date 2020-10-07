export default async function() {
    switch(process.platform) {
        case 'darwin':
            return;
            // return require('@fluvio/native-darwin')
        case 'freebsd':
            return;
            // return require('@fluvio/native-linux')
        case 'linux':
            return;
            // return require('@fluvio/native-linux')
        case 'openbsd':
            return;
            // return require('@fluvio/native-linux')
        case 'sunos':
            return;
            // return require('@fluvio/native-linux')
        case 'win32':
            return;
            // return require('@fluvio/native-win')
        case 'cygwin':
            return;
            // return require('@fluvio/native-win')
        case 'netbsd':
            return;
            // return require('@fluvio/native-linux')
        default:
            console.log("Platform is not supported");
    }
}
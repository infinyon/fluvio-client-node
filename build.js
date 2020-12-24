const exec = require('child_process').exec
const spawn = require('child_process').spawn
const args = process.argv
let release = ''
if(args[args.length - 1] === '--release') {
    release = '--release'
}

const asyncExec = async (cmd) => {
    const events = exec(cmd, (error, stdout, stderr) => {
        if (error) {
            throw error
        }
        return true
    })
    events.stdout.on('data', (stdout) => {
        process.stdout.write(stdout);
    })
    events.stderr.on('data', (stderr) => {
        process.stderr.write(stderr);
    })
}

// Dynamically build native package;
(async () => {
    switch(process.platform) {
        case 'darwin':
            return await asyncExec(`nj-cli build -o ./native/src/darwin ${release}`);
        case 'freebsd':
        case 'netbsd':
        case 'linux':
        case 'openbsd':
        case 'sunos':
            return await asyncExec(`nj-cli build -o ./native/src/linux ${release}`);
        case 'win32':
        case 'cygwin':
            return await asyncExec(`nj-cli build -o ./native/src/win ${release}`);
            return await asyncExec(`nj-cli build -o ./native/src/win ${release}`);
        default:
            console.log("Platform is not supported");
    }
})()

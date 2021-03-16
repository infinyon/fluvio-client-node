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

function getDistPath() {
    switch(process.platform) {
        case 'darwin':
            return './dist/darwin'
        case 'freebsd':
        case 'netbsd':
        case 'linux':
        case 'openbsd':
        case 'sunos':
            return './dist/linux'
        case 'win32':
        case 'cygwin':
            return './dist/win'
        default:
            console.log("Platform is not supported");
    }
}

// Dynamically build native package;
(async () => {
  return await asyncExec(`nj-cli build -o ${getDistPath()} ${release}`);
})()

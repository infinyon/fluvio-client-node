const exec = require('child_process').exec

const asyncExec = async (cmd) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            throw error
        }

        if (stderr) {
            console.log('stderr: ', stderr)
        }

        return true
    })
}

// Dynamically build native package;
(async () => {
    switch(process.platform) {
        case 'darwin':
            return await asyncExec("npm run build:darwin");
        case 'freebsd':
            return await asyncExec("npm run build:linux");
        case 'linux':
            return await asyncExec("npm run build:linux");
        case 'openbsd':
            return await asyncExec("npm run build:linux");
        case 'sunos':
            return await asyncExec("npm run build:linux");
        case 'win32':
            return await asyncExec("npm run build:win");
        case 'cygwin':
            return await asyncExec("npm run build:win");
        case 'netbsd':
            return await asyncExec("npm run build:linux");
        default:
            console.log("Platform is not supported");
    }
})()

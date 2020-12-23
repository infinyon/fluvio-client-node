const exec = require('child_process').exec

const asyncExec = async (cmd) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            throw error
        }

        console.log(stderr)
        console.log(stdout)

        return true
    })
}

// Dynamically publish native package;
;(async () => {
    switch (process.platform) {
        case 'darwin':
            return await asyncExec('npm publish ./src/darwin --access public')
        case 'freebsd':
        case 'linux':
        case 'openbsd':
        case 'sunos':
        case 'netbsd':
            return await asyncExec('npm publish ./src/linux --access public')
        case 'win32':
        case 'cygwin':
            return await asyncExec('npm publish ./src/win --access public')
        default:
            throw new Error('Platform is not supported')
    }
})()

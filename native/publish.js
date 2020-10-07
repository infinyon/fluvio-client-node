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

// Dynamically publish native package;
;(async () => {
    switch (process.platform) {
        case 'darwin':
            return await asyncExec('npm publish ./src/darwin --access public')
        case 'freebsd':
            return await asyncExec('npm publish ./src/linux --access public')
        case 'linux':
            return await asyncExec('npm publish ./src/linux --access public')
        case 'openbsd':
            return await asyncExec('npm publish ./src/linux --access public')
        case 'sunos':
            return await asyncExec('npm publish ./src/linux --access public')
        case 'win32':
            return await asyncExec('npm publish ./src/win --access public')
        case 'cygwin':
            return await asyncExec('npm publish ./src/win --access public')
        case 'netbsd':
            return await asyncExec('npm publish ./src/linux --access public')
        default:
            throw new Error('Platform is not supported')
    }
})()

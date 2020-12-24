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

// Dynamically install native package;
;(async () => {
    try {
        switch (process.platform) {
            case 'darwin':
                return await asyncExec(`npm i @fluvio/native-darwin -S`)
            case 'freebsd':
            case 'linux':
            case 'openbsd':
            case 'sunos':
            case 'netbsd':
                return await asyncExec(`npm i @fluvio/native-linux -S`)
            case 'win32':
            case 'cygwin':
                return await asyncExec(`npm i @fluvio/native-win -S`)
            default:
                throw new Error('Platform is not supported')
        }
    } catch (error) {
        console.error('installation errors: ', error)
    }
})()

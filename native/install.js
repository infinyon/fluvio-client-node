const exec = require('child_process').exec

const asyncExec = async (cmd) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            throw error
        }

        if (stderr) {
            console.log('stderr: ', stderr)
        }

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
                return await asyncExec(`npm i @fluvio/native-linux -S`)
            case 'linux':
                return await asyncExec(`npm i @fluvio/native-linux -S`)
            case 'openbsd':
                return await asyncExec(`npm i @fluvio/native-linux -S`)
            case 'sunos':
                return await asyncExec(`npm i @fluvio/native-linux -S`)
            case 'win32':
                return await asyncExec(`npm i @fluvio/native-win -S`)
            case 'cygwin':
                return await asyncExec(`npm i @fluvio/native-win -S`)
            case 'netbsd':
                return await asyncExec(`npm i @fluvio/native-linux -S`)
            default:
                throw new Error('Platform is not supported')
        }
    } catch (error) {
        console.error('installation errors: ', error)
    }
})()

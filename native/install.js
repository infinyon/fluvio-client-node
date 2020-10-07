const exec = require('child_process').exec

exports.asyncExec = async (cmd) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            throw error
        }

        if (stderr) {
            console.log('error: ', stderr)
        }

        return true
    })
}

// Dynamically install native package;
;(async () => {
    try {
        switch (process.platform) {
            case 'darwin':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/darwin`
                )
            case 'freebsd':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/linux`
                )
            case 'linux':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/linux`
                )
            case 'openbsd':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/linux`
                )
            case 'sunos':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/linux`
                )
            case 'win32':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/win`
                )
            case 'cygwin':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/win`
                )
            case 'netbsd':
                return await exports.asyncExec(
                    `npm install ${process.cwd()}/src/linux`
                )
            default:
                throw new Error('Platform is not supported')
        }
    } catch (error) {
        console.error('installation errors: ', error)
    }
})()

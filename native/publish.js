const { asyncExec } = require('./install')

// Dynamically publish native package;
;(async () => {
    switch (process.platform) {
        case 'darwin':
            return await asyncExec('npm publish ./darwin')
        case 'freebsd':
            return await asyncExec('npm publish ./linux')
        case 'linux':
            return await asyncExec('npm publish ./linux')
        case 'openbsd':
            return await asyncExec('npm publish ./linux')
        case 'sunos':
            return await asyncExec('npm publish ./linux')
        case 'win32':
            return await asyncExec('npm publish ./win')
        case 'cygwin':
            return await asyncExec('npm publish ./win')
        case 'netbsd':
            return await asyncExec('npm publish ./linux')
        default:
            throw new Error('Platform is not supported')
    }
})()

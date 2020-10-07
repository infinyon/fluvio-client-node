import { exec } from 'child_process';

export const asyncExec = async (cmd) => {
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            throw error;
        }

        if (stderr) {
            throw stderr
        }

        return true;
    })
}

// Dynamically install native package;
(async () => {
    switch(process.platform) {
        case 'darwin':
            return await asyncExec("npm install ./darwin");
        case 'freebsd':
            return await asyncExec("npm install ./linux");
        case 'linux':
            return await asyncExec("npm install ./linux");
        case 'openbsd':
            return await asyncExec("npm install ./linux");
        case 'sunos':
            return await asyncExec("npm install ./linux");
        case 'win32':
            return await asyncExec("npm install ./win");
        case 'cygwin':
            return await asyncExec("npm install ./win");
        case 'netbsd':
            return await asyncExec("npm install ./linux");
        default:
            console.log("Platform is not supported");
    }
})()

// packages/mcp/scripts/server-configs.js
export const SERVER_CONFIG = {
    fetch: {
        type: 'python',
        contextPath: 'src/fetch',
    },
    git: {
        type: 'python',
        contextPath: 'src/git',
    },
    // gdrive: {
    //     type: 'node',
    //     // copyFiles: {
    //     //     'replace_open.sh': '/replace_open.sh'
    //     // }
    // },
    sentry: {
        type: 'python',
        contextPath: 'src/sentry',
    },
    sqlite: {
        type: 'python',
        contextPath: 'src/sqlite',
    },
    time: {
        type: 'python',
        contextPath: 'src/time',
    }
};
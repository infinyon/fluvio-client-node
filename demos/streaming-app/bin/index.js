const StreamingApp = require('../dist').default

const app = new StreamingApp({
    fluvio: {
        host: '127.0.0.1',
        port: 9003,
    },
})

const TOPIC_NAME = 'test-42'

// Configure the application for topic;
app.run(TOPIC_NAME).catch((error) => {
    console.log(`Streaming App Exited with: ${error}`)
})

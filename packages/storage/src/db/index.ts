// scripts/db.ts
import { devConfig } from './config'
import { DatabaseManager } from './manager'

const dbManager = new DatabaseManager(devConfig)

// Handle command line arguments
const command = process.argv[2]
switch (command) {
    case 'start':
        dbManager.start()
        break
    case 'stop':
        dbManager.stopContainer()
        break
    case 'clean':
        dbManager.cleanDb()
        break
    default:
        console.log('Usage: npm run db [start|stop|clean]')
}

export * from './config'
export * from './manager'
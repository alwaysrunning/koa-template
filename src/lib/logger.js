const bunyan = require('bunyan')
const fs = require('fs')

const LOG_OUTPUT = 'log'

if (fs.existsSync(LOG_OUTPUT) === false) {
  console.log('mkdir log')
  fs.mkdirSync(LOG_OUTPUT)
}

const dbLogger = bunyan.createLogger({
  name: 'db',
  streams: [
    {
      type: 'rotating-file',
      level: 'info',
      path: 'log/db.log',
      period: '1d',
      count: 3
    }
  ]
})

const requestLogger = bunyan.createLogger({
  name: 'api',
  streams: [
    {
      type: 'rotating-file',
      level: 'info',
      path: 'log/req.log',
      period: '1d',
      count: 3
    }
  ]
})

module.exports = {
  dbLogger,
  requestLogger
}

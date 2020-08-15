const logger = require('koa-logger')
const strip = require('strip-ansi')
const { requestLogger: log } = require('./logger')

exports.logger = () => {
  return logger((str, args) => {
    log.info(strip(str))
  })
}

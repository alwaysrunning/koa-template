const Sequelize = require('sequelize')
const db = require('../config/database')
const { dbLogger: logger } = require('../lib/logger')

const conn = new Sequelize(db.name, db.username, db.password, {
  host: db.host,
  pool: db.pool,
  dialect: db.dialect,
  operatorsAliases: false,
  storage: db.storage,
  logging: msg => logger.info(msg)
})

module.exports = conn

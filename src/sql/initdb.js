/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 初始化数据库，建表
 * @Date: 2018-11-15 16:20:47
 * @LastEditTime: 2018-12-20 16:08:47
 */
const fs = require('fs')
const path = require('path')
const config = require('../config/database')

console.log('\n======================================')
console.log('开始初始化数据库...')

// 初始化 SQL 文件路径
const INIT_DB_FILE = path.join(__dirname, './init.sql')

const DB = require('knex')({
  client: 'mysql',
  connection: {
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.name,
    charset: 'utf8mb4',
    multipleStatements: true
  }
})

console.log(`准备读取 SQL 文件：${INIT_DB_FILE}`)

// 读取 .sql 文件内容
const content = fs.readFileSync(INIT_DB_FILE, 'utf8')

console.log('开始执行 SQL 文件...')

// 执行 .sql 文件内容
DB.raw(content).then(res => {
  console.log('数据库初始化成功！')
  process.exit(0)
}, err => {
  throw new Error(err)
})

module.exports = DB

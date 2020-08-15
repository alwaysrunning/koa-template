module.exports = {
  // host: '10.1.241.36',
  host: 'localhost',
  storage: 'data/aid-api.db',
  port: 3306,
  dialect: 'mysql',
  name: 'portal',
  username: 'root',
  password: '123456',
  // password: 'root',
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  jwtSecret: 'CD$JY411502!@*'
}

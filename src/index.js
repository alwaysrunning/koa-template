let Koa = require('koa')
let bodyParser = require('koa-body')
let methodOverride = require('koa-methodoverride')
let helmet = require('koa-helmet')
let cors = require('@koa/cors')
let Sequelize = require('sequelize')
let staticServe = require('koa-static')
let IO = require('koa-socket-2')
let path = require('path')
let jwt = require('koa-jwt')
let { logger } = require('./lib/middleware')
// let logger = require('koa-logger')
let model = require('./model')
let router = require('./router')
const FormatResponse = require('./lib/format-response')
const config = require('./config/database')
// const errorHandle = require('./lib/error-handle')
// const interceptor = require('./lib/interceptor')

let app = new Koa()

// app.use(staticServe(path.join(__dirname, '/api-doc/api')))

// app.use(interceptor)

app.use(bodyParser())
app.use(methodOverride())
app.use(helmet())
app.use(cors())
app.use(logger())
app.use(staticServe(path.join(__dirname, '..', 'upload')))

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    if (err.status === 401) {
      ctx.status = 401
      ctx.body = {
        code: -1,
        message: err.originalError ? err.originalError.message : err.message,
        data: {}
      }
    } else {
      ctx.status = 200
      if (err instanceof Sequelize.ValidationError) {
        ctx.body = FormatResponse.fail(err.errors.map(e => e.message), -1)
      } else {
        ctx.body = FormatResponse.fail(err.message, -1)
      }
    }
  }
})

app.use(jwt({
  secret: config.jwtSecret
}).unless({
  path: [/\/api\/auth\/login/, /\/api\/saveUser/]
}))

app.on('error', err => {
  console.error(err)
})

app.use(model)
let monitor = new IO('monitor')
monitor.attach(app)

app.use(router.routes())
  .use(router.allowedMethods())
module.exports = app

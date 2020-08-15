let Router = require('koa-router')
let glob = require('glob')

let router = new Router({
  prefix: '/api'
})

let applyRoutes = () => {
  let files = glob.sync('controller/*.js', { cwd: 'src' })
  files.forEach(v => {
    require(`./${v}`)(router)
  })
}

applyRoutes()

// router.use('/api', router.routes(), router.allowedMethods())
// router.prefix('/api')

router.all('*', async ctx => {
  ctx.body = 'not found'
})

module.exports = router

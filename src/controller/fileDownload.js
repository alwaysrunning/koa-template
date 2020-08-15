const bcrypt = require('bcrypt')
const uuidv4 = require('uuid/v4')

const saveDownloadInfo = async ctx => {
  const { FileDownload } = ctx.models
  const { username,givenName,fileName } = ctx.request.body
  console.log(username)
  let fileDownload
  try {
    fileDownload = await FileDownload.create({
      username,
      givenName,
      fileName
    })
    ctx.status = 200
    ctx.body = { done: true }
  } catch (err) {
    ctx.throw(err)
  }
}

const downloadInfo = async ctx => {
  const { FileDownload } = ctx.models
  let { page, limit } = ctx.request.query
  page = page ? parseInt(page) : 1
  limit = limit ? parseInt(limit) : 10
  let all
  try {
    all = await FileDownload.findAndCountAll({
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit
    })
    ctx.body = all
  } catch (err) {
    ctx.throw(err)
  }
}

const downloadInfoByUser = async ctx => {
  const { FileDownload } = ctx.models
  let { username, page, limit } = ctx.request.query
  page = page ? parseInt(page) : 1
  limit = limit ? parseInt(limit) : 10
  let all
  try {
    all = await FileDownload.findAndCountAll({
      where: {
        username: username
      },
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit
    })
    ctx.body = all
  } catch (err) {
    ctx.throw(err)
  }
}

module.exports = router => {
  router.put('/api/saveDownloadInfo', saveDownloadInfo)
  router.get('/api/downloadInfo', downloadInfo)
  router.get('/api/downloadInfoByUser', downloadInfoByUser)
}

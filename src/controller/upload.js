/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 用于上传
 * @Date: 2018-12-12 18:51:14
 * @LastEditTime: 2018-12-12 18:59:59
 */
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')
const FormatResponse = require('../lib/format-response')
/**
 * 上传文件接口
 * @param {*} ctx
 * @param {*} next
 */
const uploadAsset = async (ctx, next) => {
  const file = ctx.req.file
  let result = {
    url: ''
  }
  try {
    if (file) {
      let uploadWithSftp = new UploadWithSftp(file, 1)
      result.url = await uploadWithSftp.uploadFileToFtp('news')
    }
    ctx.body = FormatResponse.success(result, '上传成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.post('/upload/asset', upload.single('file'), uploadAsset)
}

/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 上传文件
 * @Date: 2018-12-10 15:29:41
 * @LastEditTime: 2019-06-25 17:52:43
 */
const multer = require('koa-multer')
const md5 = require('md5')

const storage = multer.diskStorage({
  destination: '/tmp/uploads/' + new Date().getFullYear() + (new Date().getMonth() + 1) + new Date().getDate(),
  filename: (req, file, cb) => {
    const fileFormat = (file.originalname).split('.')
    cb(null, md5(file + Date.now()) + '.' + fileFormat[fileFormat.length - 1])
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (/.+[htm|html|gif|jpg|jpeg|png|pdf|zip|rar|tar|doc|docx|ppt|pptx|rplib|xls|xlsx|avi|mp4|mov|mpeg|mpg|qt|ram|mp3|wav|midi|sketch|psd]$/.test(file.originalname.toLowerCase())) {
      cb(null, true)
    } else {
      cb(null, false)
    }
  }
})

module.exports = upload

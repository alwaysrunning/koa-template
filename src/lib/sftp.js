/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 上传ftp
 * @Date: 2018-12-10 15:30:47
 * @LastEditTime: 2019-06-24 17:20:32
 */
/**
 * https://cloud.tencent.com/developer/ask/124243
 * https://juejin.im/post/5abc451ff265da23a2292dd4
 */

const PromiseFtp = require('promise-ftp')
const md5 = require('md5')
// const PromisePool = require('es6-promise-pool')
const fs = require('fs')

class UploadWithSftp {
  constructor (files, concurrency) {
    this.count = 0
    this.files = files
    this.concurrency = concurrency
    this.config = {
      // host: 'localhost',
      host: '10.1.241.36',
      port: '21',
      user: 'admin',
      password: 'a89$az',
      connTimeout: 10000
    }
    this.baseDir = {
      host: 'http://10.1.241.36:81/',
      root: '/guest-data/',
      relative: 'asiainfo-product-portal1/',
      product: '/guest-data/asiainfo-product-portal1/product',
      news: '/guest-data/asiainfo-product-portal1/news',
      lab: '/guest-data/asiainfo-product-portal1/lab',
      case: '/guest-data/asiainfo-product-portal1/case',
      team: '/guest-data/asiainfo-product-portal1/team'
    }
  }

  uploadFileToFtp (uploadRoot = 'news', config = this.config, file = this.files) {
    return new Promise((resolve, reject) => {
      const fileFormat = (file.originalname).split('.')
      let fileDir = this.baseDir[uploadRoot]
      let fileName = md5(file.originalname + Date.now()) + '.' + fileFormat[fileFormat.length - 1]
      const fileRoot = fileDir + '/' + fileName
      let ftp = new PromiseFtp()
      ftp.connect(config).then(function (serverMessage) {
        return ftp.put(file.path, fileRoot)
      }).then(() => {
        console.log('sftp文件上传完成 -> ' + fileRoot)
        this.deleteTempFile('../tmp/uploads')
        resolve(fileRoot.replace(this.baseDir.root, this.baseDir.host))
        return ftp.end()
      }).catch(err => {
        console.log(err)
        console.log('-> sftp文件上传失败')
        return reject(err)
      })
    })
  }

  /**
   * 删除缓存文件
   * @param {*} path
   */
  deleteTempFile (path) {
    let files = []
    if (fs.existsSync(path)) {
      files = fs.readdirSync(path)
      files.forEach(function (file, index) {
        var curPath = path + '/' + file
        if (fs.statSync(curPath).isDirectory()) { // recurse
          this.deleteTempFile(curPath)
        } else { // delete file
          fs.unlinkSync(curPath)
        }
      })
      fs.rmdirSync(path)
    }
  }
  /**
   * 删除无用文件
   * @param {*} path
   */
  removeFile (path, uploadRoot = 'news', config = this.config) {
    let fileDir = this.baseDir[uploadRoot]
    let fileName = path.replace(this.baseDir.host + this.baseDir.relative + uploadRoot, '')
    let ftp = new PromiseFtp()
    ftp.connect(config).then(() => {
      return ftp.delete(fileDir + fileName)
    }).then(() => {
      console.log('-> 文件删除成功')
      return ftp.end()
    }).catch(err => {
      console.log(err)
    })
  }

  /**
   * 用于批量上传
   */
  /* sendFileProducer() {
    if (this.count < this.concurrency) {
      this.count++
      return this.sendFile(this.config, this.files)
    } else {
      return null
    }
  }

  start() {
    const pool = new PromisePool(this.sendFileProducer(), this.concurrency)

    return pool.start().then(function (arr) {
      console.log(arr)
      console.log('-> sftp文件上传完成')
    })
  } */
}

module.exports = UploadWithSftp

/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: jwt 中间件处理错误
 * @Date: 2018-12-24 19:43:28
 * @LastEditTime: 2018-12-24 19:44:22
 */

const errorHandle = (ctx, next) => {
  return next().catch((err) => {
    if (err.status === 401) {
      ctx.status = 401
      ctx.body = {
        code: -1,
        message: err.originalError ? err.originalError.message : err.message,
        data: {}
      }
    } else {
      throw err
    }
  })
}

module.exports = errorHandle

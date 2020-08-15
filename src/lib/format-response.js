/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: format response
 * @Date: 2018-12-04 15:29:46
 * @LastEditTime: 2018-12-04 15:30:50
 */
exports.success = (data = {}, message, code = 0) => {
  return {
    code,
    message,
    data
  }
}

exports.fail = (error, code) => {
  const message = error.errmsg || error.message || error
  return {
    code,
    message,
    data: {}
  }
}

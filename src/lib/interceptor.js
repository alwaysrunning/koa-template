/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 拦截请求标志，用于设置接口权限拦截
 * @Date: 2018-12-24 20:05:22
 * @LastEditTime: 2018-12-25 16:40:42
 */
const apis = require('../config/api')
module.exports = (ctx, next) => {
  return next().then(() => {
    let role = ctx.state.user && ctx.state.user.data && ctx.state.user.data.role
    if (role && role.length) {
      // 如果存在角色

    } else {
      // 不存在角色

    }
  })
}

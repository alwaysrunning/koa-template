/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 接口权限配置
 * @Date: 2018-12-24 20:51:53
 * @LastEditTime: 2018-12-26 15:25:41
 */
module.exports = {
  api: [{
    auth: '110000', // 超级管理员
    apis: [
      // 用户的增删改查
      '/api/auth/user/add',
      '/api/auth/user/delete',
      '/api/auth/user/edit',
      '/api/auth/user/fetch',
      '/api/auth/user/fetch/:id',
      // 角色的增删改查
      '/api/role/add',
      '/api/role/delete',
      '/api/role/edit',
      '/api/role/fetch',
      '/api/role/fetch/:id'
    ]
  }, {
    auth: '001100', // 管理员
    apis: [
    ]
  }, {
    auth: '000011', // 产品管理员
    apis: [
      '/api/product/news/fetch',
      '/api/news/add',
      '/api/news/delete',
      '/api/news/edit',
      '/api/news/fetch',
      '/api/news/fetch/:id',
      '/api/lab/add',
      '/api/lab/delete',
      '/api/lab/edit',
      '/api/lab/fetch',
      '/api/lab/fetch/:id',
      '/api/product/lab/fetch',
      '/api/team/role/add',
      '/api/team/role/fetch',
      '/api/team/role/fetch/:id',
      '/api/team/role/delete',
      '/api/team/role/edit',
      '/api/team/member/fetch',
      '/api/team/member/fetch/:id',
      '/api/team/member/add',
      '/api/team/member/delete',
      '/api/team/member/edit',
      '/api/team/fetch',
      '/api/team/fetch/:id',
      '/api/team/add',
      '/api/team/delete',
      '/api/team/edit'
    ]
  }, {
    // 对于无角色
    auth: '',
    apis: [
      '/api/news/fetch',
      '/api/news/fetch/:id',
      '/api/news/product/:productId',
      '/api/lab/fetch',
      '/api/lab/fetch/:id',
      '/api/lab/new',
      '/api/lab/product/:productId',
      '/api/lab/new/:productId',
      '/api/team/fetch',
      '/api/team/fetch/:id',
      '/api/product/fetch',
      '/api/product/fetch/:id',
      '/api/product/search',
      '/api/product/star',
      '/api/user/product/star',
      '/api/product/hot',
      '/api/productDoc/fetch/:productId',
      '/api/productDoc/download',
      '/api/productDoc/praise',
      '/api/productDoc/collect',
      '/api/user/collect/productDoc',
      '/api/user/download/productDoc',
      '/api/user/praise/productDoc',
      '/api/productCase/product/fetch/:productId',
      '/api/productCase/fetch/:id',
      '/api/product/productRoute/fetch/:id',
      '/api/product/productRoute/product/fetch/:productId',
      '/api/product/productRouteType/fetch',
      '/api/product/developPlan/product/fetch/:productId',
      '/api/product/developPlan/fetch/:id',
      '/api/product/deliveryPlan/fetch/:id',
      '/api/product/deliveryPlan/product/fetch/:productId'
    ]
  }]
}

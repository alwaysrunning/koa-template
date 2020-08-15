/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 菜单相关
 * @Date: 2018-12-25 20:01:52
 * @LastEditTime: 2019-03-21 11:23:47
 */
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const xss = require('xss')
const _ = require('lodash')
/**
 * 查询菜单
 * @param {*} ctx
 * @param {*} next
 */
const fetchMenu = async (ctx, next) => {
  let {
    Catalog,
    Menu,
    Role
  } = ctx.models
  let result = {}
  try {
    let role = ctx.state.user && ctx.state.user.data && ctx.state.user.data.role
    // 暂时先放开
    if (!role || !role.length) throw new Error('您还没有登录，请先登录！')
    // let roleId = role && role.length && role[0].id
    let code = role && role.length && role[0].code
    let options = {
      include: [{
        model: Role,
        attributes: ['id', 'name', 'code'],
        // 暂时先去除token验证权限
        where: {
          code: code
        },
        required: true
      }, {
        model: Menu,
        include: [{
          model: Role,
          // 暂时先去除token验证权限
          attributes: ['id', 'name', 'code'],
          where: {
            code: code
          },
          required: true
        }],
        where: {
          level: {
            [Sequelize.Op.lt]: 12
          }
        },
        order: [
          ['level', 'ASC']
        ]
      }],
      order: [
        ['level', 'ASC']
      ]
    }
    result = await Catalog.findAll(options)
    result = result.map(item => {
      return item.get({
        plain: true
      })
    })
    result = result.map(item => {
      item.menus = item.menus.sort((a, b) => {
        return a.level - b.level
      })
      return item
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增产品种类
 * @param {*} ctx
 * @param {*} next
 */
const addProductKind = async (ctx, next) => {
  let {
    ProductKind
  } = ctx.models
  let result = {}
  try {
    let {
      name
    } = ctx.request.body
    const schema = Joi.object().keys({
      name: Joi.string().required()
    })
    name = xss(name)
    await Joi.validate({
      name
    }, schema)
    await ProductKind.findOrCreate({
      where: {
        name
      }
    }).spread((productKind, created) => {
      if (!created) {
        throw new Error(`ProductKind with name (${name}) is already exist!`)
      }
      result = productKind
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑产品种类
 * @param {*} ctx
 * @param {*} next
 */
const editProductKind = async (ctx, next) => {
  let {
    ProductKind
  } = ctx.models
  let result = {}
  try {
    let {
      name,
      id
    } = ctx.request.body
    const schema = Joi.object().keys({
      name: Joi.string().required(),
      id: Joi.string().required()
    })
    name = xss(name)
    id = xss(id)
    await Joi.validate({
      name,
      id
    }, schema)
    result = await ProductKind.update({
      name
    }, {
      where: {
        id
      }
    })
    ctx.body = FormatResponse.success(result, '修改成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除产品种类
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductKind = async (ctx, next) => {
  let {
    ProductKind
  } = ctx.models
  let result = {}
  try {
    let { ids } = ctx.request.body
    const schema = Joi.object().keys({
      ids: Joi.array().items(Joi.string().required()).min(1)
    })
    await Joi.validate({
      ids
    }, schema)
    result = await ProductKind.destroyed({
      where: {
        id: {
          [Sequelize.Op.in]: ids
        }
      }
    })
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询产品种类及相关产品
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductKind = async (ctx, next) => {
  let {
    ProductKind,
    Product,
    ProductType
  } = ctx.models
  let result = {}
  try {
    result = await ProductKind.findAndCountAll({
      include: [{
        model: Product,
        attributes: ['id', 'title', 'isHot'],
        where: {
          inMenu: 1
        },
        include: [{
          model: ProductType,
          attributes: ['id', 'name']
        }]
      }],
      order: [
        ['created_at', 'ASC']
      ],
      distinct: true
    })
    result.rows = result.rows.map(item => {
      let menu = item.get({
        plain: true
      })
      menu.products = _.groupBy(menu.products, product => {
        return product.productTypes.map(type => {
          return type.name
        }).join(',')
      })
      return menu
    })

    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询产品种类
 * @type {{}}
 */
const fetchProductKindOnly = async (ctx, next) => {
  let {
    ProductKind
  } = ctx.models
  let result = {}
  try {
    result = await ProductKind.findAll({
      order: [
        ['created_at', 'ASC']
      ]
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.get('/menu/fetch', fetchMenu)
  router.post('/menu/productKind/add', addProductKind)
  router.post('/menu/productKind/edit', editProductKind)
  router.post('/menu/productKind/delete', deleteProductKind)
  router.get('/menu/productKind/fetch', fetchProductKind)
  router.get('/menu/productKindOnly/fetch', fetchProductKindOnly)
}

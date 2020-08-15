/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 角色相关
 * @Date: 2018-12-20 10:59:21
 * @LastEditTime: 2018-12-26 11:03:41
 */
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const xss = require('xss')

/**
 * 新增角色
 * @param {*} ctx
 * @param {*} next
 */
const addRole = async (ctx, next) => {
  let { Role } = ctx.models
  let result = {}
  try {
    let {
      name,
      roleDesc,
      code
    } = ctx.request.body
    const schema = Joi.object().keys({
      name: Joi.string().required(),
      roleDesc: Joi.string().required(),
      code: Joi.number().required()
    })
    await Joi.validate({
      name,
      roleDesc,
      code
    }, schema)
    name = xss(name)
    roleDesc = xss(roleDesc)
    code = xss(code)

    result = await Role.findOrCreate({
      where: {
        name
      },
      defaults: {
        roleDesc,
        code
      }
    }).spread((role, created) => {
      if (!created) {
        throw new Error(`Role with name (${name}) is already exist!`)
      }
      result = role
    })
    ctx.body = FormatResponse.success(result, '保存成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除角色
 * @param {*} ctx
 * @param {*} next
 */
const deleteRole = async (ctx, next) => {
  let { Role } = ctx.models
  let result = {}
  try {
    let { ids } = ctx.request.body
    const schema = Joi.object().keys({
      ids: Joi.array().items(Joi.string().required()).min(1)
    })
    await Joi.validate({
      ids
    }, schema)
    result = await Role.destroy({
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
 * 编辑角色
 * @param {*} ctx
 * @param {*} next
 */
const editRole = async (ctx, next) => {
  let { Role } = ctx.models
  let result = {}
  try {
    let {
      id,
      name,
      roleDesc,
      code
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      name: Joi.string().required(),
      roleDesc: Joi.string().required(),
      code: Joi.string().required()
    })
    await Joi.validate({
      id,
      name,
      roleDesc,
      code
    }, schema)
    id = xss(id)
    name = xss(name)
    roleDesc = xss(roleDesc)
    code = xss(code)
    result = await Role.update({
      name,
      roleDesc,
      code
    }, {
      where: {
        id
      }
    })
    ctx.body = FormatResponse.success(result, '更新成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询角色
 * @param {*} ctx
 * @param {*} next
 */
const fetchRole = async (ctx, next) => {
  let { Role } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      currentPage = 1,
      pageSize = 10,
      name
    } = ctx.models
    const schema = Joi.object().keys({
      currentPage: Joi.number().integer().required(),
      pageSize: Joi.number().integer().required(),
      name: Joi.string().allow('')
    })
    await Joi.validate({
      currentPage,
      pageSize,
      name
    }, schema)
    name = xss(name)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    options = {
      where: {},
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    if (name) {
      options['where']['name'] = {
        [Sequelize.Op.like]: `%${name}%`
      }
    }
    result = await Role.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 按id查询
 * @param {*} ctx
 * @param {*} next
 */
const fetchRoleById = async (ctx, next) => {
  let {
    Role
  } = ctx.models
  let result = {}
  try {
    let {
      id
    } = ctx.params
    const schema = Joi.object().keys({
      id: Joi.string().required()
    })
    await Joi.validate({
      id
    }, schema)
    id = xss(id)
    result = await Role.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.post('/role/add', addRole)
  router.post('/role/delete', deleteRole)
  router.post('/role/delete', editRole)
  router.get('/role/fetch', fetchRole)
  router.get('/role/fetch/:id', fetchRoleById)
}

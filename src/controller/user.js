/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 后台用户相关
 * @Date: 2018-12-20 10:59:28
 * @LastEditTime: 2019-01-16 15:54:20
 */

const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const xss = require('xss')
const sequelize = require('../model/connect')

/**
 * 新增用户
 * @param {*} ctx
 * @param {*} next
 */
const addUser = async (ctx, next) => {
  let {
    User,
    Role
  } = ctx.models
  let result = {}
  try {
    let {
      username,
      email,
      roleId
    } = ctx.request.body
    const schema = Joi.object().keys({
      username: Joi.string().required(),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      roleId: Joi.string().required()
    })
    await Joi.validate({
      username,
      email,
      roleId
    }, schema)
    username = xss(username)
    email = xss(email)
    roleId = xss(roleId)

    await sequelize.transaction(t => {
      return Role.findById(roleId, {
        transaction: t
      }).then(role => {
        if (!role) throw new Error(`Role with id (${roleId}) is not exist !`)
        return User.findOrCreate({
          where: {
            username
          },
          defaults: {
            email
          },
          transaction: t
        }).then(([user, created]) => {
          if (!created) throw new Error(`User with username(${username}) is already exist!`)
          result = user
          return role.addUser(user, {
            transaction: t
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除用户
 * @param {*} ctx
 * @param {*} next
 */
const deleteUser = async (ctx, next) => {
  let {
    User
  } = ctx.models
  let result = {}
  try {
    let {
      ids
    } = ctx.request.body
    const schema = Joi.object().keys({
      ids: Joi.array().items(Joi.string().required()).min(1)
    })
    await Joi.validate({
      ids
    }, schema)

    result = User.destroy({
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
 * 编辑用户
 * @param {*} ctx
 * @param {*} next
 */
const editUser = async (ctx, next) => {
  let {
    User,
    Role
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      username,
      email,
      roleId
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      username: Joi.string().required(),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      roleId: Joi.string().required()
    })
    await Joi.validate({
      id,
      username,
      email,
      roleId
    }, schema)
    id = xss(id)
    username = xss(username)
    email = xss(email)
    roleId = xss(roleId)
    await sequelize.transaction(t => {
      return User.findById(id, {
        transaction: t
      }).then(user => {
        if (!user) throw new Error(`User with id(${id}) is not exist !`)
        result = user
        return Role.findById(roleId, {
          transaction: t
        }).then(role => {
          if (!role) throw new Error(`Role with id(${roleId}) is not exist!`)
          return User.update({
            username,
            email
          }, {
            where: {
              id
            },
            transaction: t
          }).then(() => {
            return user.setRoles([], {
              transaction: t
            }).then(() => {
              return user.addRole(role, {
                transaction: t
              })
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '修改成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询用户
 * @param {*} ctx
 * @param {*} next
 */
const fetchUser = async (ctx, next) => {
  let {
    User,
    Role
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      username,
      currentPage = 1,
      pageSize = 10
    } = ctx.request.query
    const schema = Joi.object().keys({
      username: Joi.string().allow(''),
      currentPage: Joi.number().integer().required(),
      pageSize: Joi.number().integer().required()
    })
    await Joi.validate({
      username,
      currentPage,
      pageSize
    }, schema)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
    username = xss(username)
    options = {
      include: [{
        model: Role,
        as: 'roles',
        where: {
          code: {
            [Sequelize.Op.in]: ['001100', '000011']
          }
        },
        required: true
      }],
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'ASC']
      ]
    }
    if (username) {
      options['where']['username'] = {
        [Sequelize.Op.like]: `%${username}%`
      }
    }
    result = await User.findAndCountAll(options)
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
const fetchUserById = async (ctx, next) => {
  let {
    User,
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
    result = await User.findById(id, {
      include: [{
        model: Role
      }]
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.post('/auth/user/add', addUser)
  router.post('/auth/user/delete', deleteUser)
  router.post('/auth/user/edit', editUser)
  router.get('/auth/user/fetch', fetchUser)
  router.get('/auth/user/fetch/:id', fetchUserById)
}

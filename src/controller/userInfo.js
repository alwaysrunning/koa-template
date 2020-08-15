const bcrypt = require('bcrypt')
const uuidv4 = require('uuid/v4')
const moment = require('moment')
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const xss = require('xss')
const sequelize = require('../model/connect')
const jsonwebtoken = require('jsonwebtoken')
const config = require('../config/database')

const saveUser = async ctx => {
  const { UserInfo } = ctx.models
  const { username, mail, displayName, givenName, fullName, company, department, info } = ctx.request.body
  let userInfo
  try {
    userInfo = await UserInfo.findOne({
      where: { username }
    })
    if (!userInfo) {
      userInfo = await UserInfo.create({
        username,
        mail,
        displayName,
        givenName,
        fullName,
        company,
        department,
        info
      })
      ctx.status = 200

      let token = jsonwebtoken.sign({
        data: {
          id: userInfo.id,
          username: userInfo.username,
          mail: userInfo.mail
        },
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 一个小时
      }, config.jwtSecret)
      ctx.cookies.set(
        'login',
        token,
        {
          maxAge: 10 * 60 * 1000, // cookie有效时长
          httpOnly: true
        }
      )
      console.log(ctx.cookies.get('login'))
      ctx.body = {
        done: true,
        token
      }
    } else {
      userInfo.username = username
      userInfo.mail = mail
      userInfo.displayName = displayName
      userInfo.givenName = givenName
      userInfo.fullName = fullName
      userInfo.company = company
      userInfo.department = department
      userInfo.info = info
      userInfo.last = moment().format('YYYY-MM-DD HH:mm:ss')
      await userInfo.save()
      ctx.status = 200
      let token = jsonwebtoken.sign({
        data: userInfo,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 一个小时
      }, config.jwtSecret)
      ctx.cookies.set(
        'login',
        token,
        {
          maxAge: 10 * 60 * 1000, // cookie有效时长
          httpOnly: true
        }
      )
      console.log(ctx.cookies.get('login'))
      ctx.body = {
        done: true,
        token
      }
    }
  } catch (err) {
    ctx.throw(err)
  }
}

const users = async ctx => {
  const { UserInfo } = ctx.models
  let { page, limit } = ctx.request.query
  page = page ? parseInt(page) : 1
  limit = limit ? parseInt(limit) : 10
  let all
  try {
    all = await UserInfo.findAndCountAll({
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit
    })
    ctx.body = all
  } catch (err) {
    ctx.throw(err)
  }
}

const loginInfoByUser = async ctx => {
  const { UserInfo } = ctx.models
  let { username, page, limit } = ctx.request.query
  page = page ? parseInt(page) : 1
  limit = limit ? parseInt(limit) : 30
  let all
  try {
    all = await UserInfo.findAndCountAll({
      where: {
        username: username
      },
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit
    })
    ctx.body = all
  } catch (err) {
    ctx.throw(err)
  }
}

const userAuthLogin = async (ctx, next) => {
  const {
    UserInfo,
    User,
    Role
  } = ctx.models
  let {
    username,
    mail,
    displayName,
    givenName,
    fullName,
    company,
    department,
    info
  } = ctx.request.body
  let result = {}
  try {
    const schema = Joi.object().keys({
      username: Joi.string(),
      mail: Joi.string(),
      displayName: Joi.string(),
      givenName: Joi.string(),
      fullName: Joi.string(),
      company: Joi.string(),
      department: Joi.string(),
      info: Joi.string()
    })
    await Joi.validate({
      username,
      mail,
      displayName,
      givenName,
      fullName,
      company,
      department,
      info
    }, schema)

    username = xss(username)
    mail = xss(mail)
    displayName = xss(displayName)
    givenName = xss(givenName)
    fullName = xss(fullName)
    company = xss(company)
    department = xss(department)
    info = xss(info)

    await sequelize.transaction(t => {
      return User.findOne({
        where: {
          username
        },
        include: [{
          model: Role,
          through: {
            where: {
              user_id: Sequelize.col('id')
            }
          }
        }],
        transaction: t
      }).then(user => {
        if (!user) throw new Error(`您还没有创建帐号，请联系超级管理员为您添加帐号`)
        ctx.user = user
        return UserInfo.findOrCreate({
          where: {
            username
          },
          defaults: {
            mail,
            displayName,
            givenName,
            fullName,
            company,
            department,
            info
          },
          transaction: t
        }).then(([userInfo, created]) => {
          let role = []
          if (user.roles && user.roles.length) {
            role = user.roles.map(item => {
              return {
                id: item.id,
                code: item.code
              }
            })
          }
          let token = jsonwebtoken.sign({
            data: {
              username: user.username,
              mail: user.email,
              role: role
            },
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 一个小时
          }, config.jwtSecret)
          result = {
            userInfo,
            user,
            token
          }
        })
      })
    })
    ctx.body = FormatResponse.success(result, '登录成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.put('/saveUser', saveUser)
  router.get('/users', users)
  router.get('/loginInfoByUser', loginInfoByUser)
  router.post('/auth/login', userAuthLogin)
}

/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 实验室
 * @Date: 2018-12-04 18:19:28
 * @LastEditTime: 2019-01-15 15:01:32
 */
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')
const xss = require('xss')
const sequelize = require('../model/connect')

/**
 * 1. 增加事务 done
 * 2. 做产品关联 done
 * 3. 做接口权限 todo
 * 4. 做xss相关的验证 done
 */

/**
 * 查询实验室新闻
 * @param {*} ctx
 * @param {*} next
 */
const fetchLab = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  let options = {}
  try {
    const schema = Joi.object().keys({
      title: Joi.string().allow(''),
      pageSize: Joi.number().integer().default(10),
      currentPage: Joi.number().integer().default(1)
    })
    let {
      currentPage = 1, pageSize = 10, title = '', status
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    await Joi.validate({
      title,
      pageSize,
      currentPage
    }, schema)

    title = xss(title)

    options = {
      where: {},
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    if (title) {
      options['where']['title'] = {
        [Sequelize.Op.like]: `%${title}%`
      }
    }
    if (status) {
      options['where']['status'] = {
        [Sequelize.Op.eq]: status
      }
    } else {
      options['where']['status'] = {
        [Sequelize.Op.lt]: 2
      }
    }
    result = await Lab.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询实验室Lab
 * @param {*} ctx
 * @param {*} next
 */
const fetchLabById = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  try {
    const schema = Joi.object().keys({
      id: Joi.string().required()
    })
    let {
      id
    } = ctx.params
    await Joi.validate({
      id
    }, schema)

    id = xss(id)

    result = await Lab.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 添加实验室新闻
 * @param {*} ctx
 * @param {*} next
 */
const addLab = async (ctx, next) => {
  let {
    Lab,
    Product,
    User
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    thumbnail,
    title,
    short = '',
    content,
    productId,
    userCode
  } = ctx.req.body
  try {
    const schema = Joi.object().keys({
      title: Joi.string().required(),
      short: Joi.string().allow(''),
      content: Joi.string().required(),
      productId: Joi.string(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      title,
      short,
      content,
      productId,
      userCode
    }, schema)

    // xss 验证
    title = xss(title)
    short = xss(short)
    content = xss(short)
    productId = xss(productId)
    userCode = xss(userCode)

    const file = ctx.req.file
    if (!file) throw new Error(`未选择相关的封面图片`)
    uploadWithSftp = new UploadWithSftp(file, 1)
    thumbnail = await uploadWithSftp.uploadFileToFtp('lab')
    /**
     * 采用事务来做相关的操作
     */
    await sequelize.transaction(t => {
      return Lab.findOrCreate({
        where: {
          title
        },
        defaults: {
          thumbnail,
          short,
          content,
          status: 1
        },
        transaction: t
      }).then(([lab, created]) => {
        if (!created) {
          throw new Error(`Lab with title (${title}) is already exist!`)
        }
        result = lab
        return Product.findById(productId, {
          transaction: t
        }).then(p => {
          if (!p) {
            throw new Error(`Product with productId(${productId}) is not exist !`)
          }
          return p.addLab(lab, {
            transaction: t
          }).then(() => {
            return User.findOne({
              where: {
                username: userCode
              },
              transaction: t
            }).then(user => {
              return user.addLab(lab, {
                transaction: t
              })
            })
          })
        })
      })
    })
    /* result = await Lab.findOrCreate({
      where: {
        title
      },
      defaults: {
        thumbnail,
        short,
        content,
        status: 2
      }
    }).spread((lab, created) => {
      if (!created) {
        throw new Error(`Lab with title (${title}) is already exist!`)
      }
      result = lab
    })
    if (productId) {
      let p = await Product.findById(productId)
      p.setLabs(result)
    } */
    ctx.body = FormatResponse.success(result, '保存成功')
  } catch (error) {
    /**
     * 如果发现有报错，我们需要将已经上传的文件进行删除
     */
    if (uploadWithSftp && thumbnail) {
      uploadWithSftp.removeFile(thumbnail, 'lab')
    }
    throw new Error(error)
  }
}

/**
 * 插入实验室新闻
 * @param {*} ctx
 * @param {*} next
 */
const insertLab = async (ctx, next) => {
  let {
    Lab,
    Product
  } = ctx.models
  let result = {}
  try {
    let {
      thumbnail = '',
      title,
      short = '',
      content,
      productId
    } = ctx.request.body
    const schema = Joi.object().keys({
      thumbnail: Joi.string().allow(''),
      title: Joi.string().required(),
      short: Joi.string().allow(''),
      content: Joi.string().required(),
      productId: Joi.string()
    })
    await Joi.validate({
      thumbnail,
      title,
      short,
      content,
      productId
    }, schema)

    // 做xss 验证
    thumbnail = xss(thumbnail)
    title = xss(title)
    short = xss(short)
    content = xss(content)
    productId = xss(productId)

    result = await Lab.findOrCreate({
      where: {
        title
      },
      defaults: {
        thumbnail,
        short,
        content,
        status: 2
      }
    }).spread((lab, created) => {
      if (!created) {
        throw new Error(`Lab with title (${title}) is already exist!`)
      }
      result = lab
    })

    if (productId) {
      let p = await Product.findById(productId)
      p.setLabs(result)
    }
    ctx.body = FormatResponse.success(result, '保存成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除实验室新闻
 * @param {*} ctx
 * @param {*} next
 */
const deleteLabByIds = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      ids
    } = ctx.request.body
    const schema = Joi.object().keys({
      ids: Joi.array().min(1)
    })
    await Joi.validate({
      ids
    }, schema)
    if (ids && ids.length) {
      options['where'] = {
        id: {
          [Sequelize.Op.in]: ids
        }
      }
    }
    result = await Lab.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑实验室新闻
 * @param {*} ctx
 * @param {*} next
 */
const editLab = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      title,
      thumbnail,
      short,
      content
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      title: Joi.string().required(),
      thumbnail: Joi.string().allow(''),
      short: Joi.string().allow(''),
      content: Joi.string().required()
    })
    await Joi.validate({
      id,
      title,
      thumbnail,
      short,
      content
    }, schema)
    // xss 验证
    title = xss(title)
    thumbnail = xss(thumbnail)
    short = xss(short)
    content = xss(content)
    result = await Lab.update({
      title,
      thumbnail,
      short,
      content
    }, {
      where: {
        id
      }
    })
    ctx.body = FormatResponse.success(result, '编辑成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询最新实验室新闻
 * @param {*} ctx
 * @param {*} next
 */
const fetchNew = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      size = 4
    } = ctx.request.query
    const schema = Joi.object().keys({
      size: Joi.number().integer().default(4)
    })
    await Joi.validate({
      size
    }, schema)
    options = {
      limit: size,
      order: [
        ['created_at', 'DESC']
      ]
    }
    result = await Lab.findAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 审批实验室新闻
 * @param {*} ctx
 * @param {*} next
 */
const approveLab = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  try {
    let {
      status,
      ids
    } = ctx.request.body
    const schema = Joi.object().keys({
      status: Joi.number().integer().required(),
      ids: Joi.array().min(1)
    })
    await Joi.validate({
      status,
      ids
    }, schema)
    status = parseInt(status)
    result = await Lab.update({
      status: status
    }, {
      where: {
        id: {
          [Sequelize.Op.in]: ids
        }
      }
    })
    ctx.body = FormatResponse.success(result, '审批成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品查询该产品的实验室Lab+
 * @param {*} ctx
 * @param {*} next
 */
const fetchLabByProductId = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      productId
    } = ctx.params
    let {
      currentPage = 1, pageSize = 10, title = '', status
    } = ctx.request.query
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      title: Joi.string().allow(''),
      pageSize: Joi.number().integer().default(10),
      currentPage: Joi.number().integer().default(1)
    })
    /**
     * 将 string 类型做 xss 验证
     */
    title = xss(title)
    productId = xss(productId)

    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    await Joi.validate({
      productId,
      title,
      pageSize,
      currentPage
    }, schema)
    options = {
      where: {
        product_id: productId
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    if (title) {
      options['where']['title'] = {
        [Sequelize.Op.like]: `%${title}%`
      }
    }
    if (status) {
      options['where']['status'] = {
        [Sequelize.Op.eq]: status
      }
    } else {
      options['where']['status'] = {
        [Sequelize.Op.lt]: 2
      }
    }
    result = await Lab.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品查询该产品的最新实验室Lab +
 * @param {*} ctx
 * @param {*} next
 */
const fetchLabNewByProductId = async (ctx, next) => {
  let {
    Lab
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      productId
    } = ctx.params
    let {
      size = 4
    } = ctx.request.query
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      size: Joi.number().integer().default(4)
    })
    await Joi.validate({
      size,
      productId
    }, schema)

    // 做xss验证
    productId = xss(productId)

    options = {
      where: {
        product_id: productId
      },
      limit: size,
      order: [
        ['created_at', 'DESC']
      ]
    }
    result = await Lab.findAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据用户查询实验室
 * @param {*} ctx
 * @param {*} next
 */
const fetchLabByUser = async (ctx, next) => {
  let {
    User,
    Lab,
    Product
  } = ctx.models
  let result = {}
  try {
    let {
      currentPage = 1,
      pageSize = 10,
      userCode,
      title
    } = ctx.request.query
    const schema = Joi.object().keys({
      title: Joi.string().allow(''),
      currentPage: Joi.number().integer().required(),
      pageSize: Joi.number().integer().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      title,
      currentPage,
      pageSize,
      userCode
    }, schema)
    // xss
    title = xss(title)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    userCode = xss(userCode)

    await sequelize.transaction(t => {
      return User.findOne({
        where: {
          username: userCode
        },
        transaction: t
      }).then(user => {
        if (!user) throw new Error(`User with username(${userCode}) is not exist !`)
        let options = {
          where: {
            user_id: user.id
          },
          include: [{
            model: User
          }, {
            model: Product
          }],
          offset: (currentPage - 1) * pageSize,
          limit: pageSize,
          order: [
            ['created_at', 'DESC']
          ],
          distinct: true,
          transaction: t
        }
        if (title) {
          options['where']['title'] = {
            [Sequelize.Op.like]: `%${title}%`
          }
        }
        return Lab.findAndCountAll(options).then(lab => {
          result = lab
        })
      })
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.get('/lab/fetch', fetchLab)
  router.get('/lab/fetch/:id', fetchLabById)
  router.post('/lab/add', upload.single('file'), addLab)
  router.post('/lab/delete', deleteLabByIds)
  router.post('/lab/edit', editLab)
  router.get('/lab/new', fetchNew)
  router.get('/lab/approve', approveLab)
  router.post('/lab/insert', insertLab)

  /**
   * 根据产品查询该产品的实验室
   */
  router.get('/lab/product/:productId', fetchLabByProductId)
  router.get('/lab/new/:productId', fetchLabNewByProductId)

  /**
   * 根据用户查询实验室
   */
  router.get('/product/lab/fetch', fetchLabByUser)
}

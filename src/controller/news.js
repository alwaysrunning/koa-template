/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 新闻相关操作
 * @Date: 2018-12-04 16:09:31
 * @LastEditTime: 2019-01-15 15:02:15
 */
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')
const xss = require('xss')
const sequelize = require('../model/connect')

/**
 * TODO: 团队要根据username来查询
 * TODO: 查询新闻 LAB列表时需要给出团队信息
 * TODO: 新建团队时需要传username
 */
/**
 * 查询新闻
 * @param {*} ctx
 * @param {*} next
 */
const fetchNews = async (ctx, next) => {
  let {
    News
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

    // 做xss验证
    title = xss(title)

    await Joi.validate({
      title,
      pageSize,
      currentPage
    }, schema)
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
    result = await News.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据id查询
 * @param {*} ctx
 * @param {*} next
 */
const fetchNewsById = async (ctx, next) => {
  let {
    News
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
    result = await News.findById(id)
    let hotUpdate = ++result.hotUpdate
    await News.update({
      hotUpdate
    }, {
      where: {
        id
      }
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增新闻
 * @param {*} ctx
 * @param {*} next
 */
const addNews = async (ctx, next) => {
  let {
    News,
    Product,
    User
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    thumbnail = '',
    title,
    short = '',
    content,
    productId,
    userCode
  } = ctx.req.body
  try {
    const schema = Joi.object().keys({
      thumbnail: Joi.string().allow(''),
      title: Joi.string().required(),
      short: Joi.string().allow(''),
      content: Joi.string().required(),
      productId: Joi.string(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      thumbnail,
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
    thumbnail = await uploadWithSftp.uploadFileToFtp('news')

    /**
     * 采用事务来做相关的操作
     */
    await sequelize.transaction(t => {
      return News.findOrCreate({
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
      }).then(([news, created]) => {
        if (!created) {
          throw new Error(`News with title (${title}) is already exist!`)
        }
        result = news
        return Product.findById(productId, {
          transaction: t
        }).then(p => {
          if (!p) {
            throw new Error(`Product with productId(${productId}) is not exist !`)
          }
          return p.addNews(news, {
            transaction: t
          }).then(() => {
            return User.findOne({
              where: {
                username: userCode
              },
              transaction: t
            }).then(user => {
              return user.addNews(news, {
                transaction: t
              })
            })
          })
        })
      })
    })
    /* result = await News.findOrCreate({
      where: {
        title
      },
      defaults: {
        thumbnail,
        short,
        content,
        status: 2
      }
    }).spread((news, created) => {
      if (!created) {
        throw new Error(`News with title (${title}) is already exist!`)
      }
      result = news
    })
    if (productId) {
      let p = await Product.findById(productId)
      p.setNews(result)
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
 * 直接插入数据
 * @param {*} ctx
 * @param {*} next
 */
const insertNews = async (ctx, next) => {
  let {
    News,
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

    result = await News.findOrCreate({
      where: {
        title
      },
      defaults: {
        thumbnail,
        short,
        content,
        status: 2
      }
    }).spread((news, created) => {
      if (!created) {
        throw new Error(`News with title (${title}) is already exist!`)
      }
      result = news
    })
    if (productId) {
      let p = await Product.findById(productId)
      p.setNews(result)
    }
    ctx.body = FormatResponse.success(result, '保存成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量删除新闻
 * @param {*} ctx
 * @param {*} next
 */
const deleteNewsByIds = async (ctx, next) => {
  let {
    News
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
    result = await News.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑新闻
 * @param {*} ctx
 * @param {*} next
 */
const editNews = async (ctx, next) => {
  let {
    News
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

    result = await News.update({
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
 * 查询热门新闻
 * @param {*} ctx
 * @param {*} next
 */
const fetchHot = async (ctx, next) => {
  let {
    News
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { size = 4 } = ctx.request.query
    const schema = Joi.object().keys({
      size: Joi.number().integer().default(4)
    })
    await Joi.validate({
      size
    }, schema)
    options = {
      limit: size,
      order: [
        ['hotUpdate', 'DESC']
      ]
    }
    result = await News.findAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量审核新闻
 * @param {*} ctx
 * @param {*} next
 */
const approveNews = async (ctx, next) => {
  let {
    News
  } = ctx.models
  let result = {}
  try {
    let {
      status,
      ids
    } = ctx.request.body
    const schema = Joi.object().keys({
      status: Joi.number().required(),
      ids: Joi.array().min(1)
    })
    await Joi.validate({
      status,
      ids
    }, schema)
    status = parseInt(status)
    result = await News.update({
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
 * 根据产品查询该产品的新闻
 * @param {*} ctx
 * @param {*} next
 */
const fetchNewsWithProduct = async (ctx, next) => {
  let {
    News
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
    result = await News.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品负责人查询产品新闻
 * @param {*} ctx
 * @param {*} next
 */
const fetchNewsByUser = async (ctx, next) => {
  let {
    User,
    News,
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
        return News.findAndCountAll(options).then(news => {
          result = news
        })
      })
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.get('/news/fetch', fetchNews)
  router.get('/news/fetch/:id', fetchNewsById)
  router.post('/news/add', upload.single('file'), addNews)
  router.post('/news/delete', deleteNewsByIds)
  router.post('/news/edit', editNews)
  router.get('/news/hot', fetchHot)
  router.post('/news/approve', approveNews)
  router.post('/news/insert', insertNews)

  /**
   * 根据产品查询该产品的新闻
   */
  router.get('/news/product/:productId', fetchNewsWithProduct)
  /**
   * 根据产品负责人查询产品新闻
   */
  router.get('/product/news/fetch', fetchNewsByUser)
}

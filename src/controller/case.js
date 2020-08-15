/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 产品案例
 * @Date: 2018-12-04 17:09:02
 * @LastEditTime: 2018-12-25 17:14:46
 */
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')

const fetchCase = async (ctx, next) => {
  let {
    Case
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
    result = await Case.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

const fetchCaseById = async (ctx, next) => {
  let {
    Case
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
    result = await Case.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

const addCase = async (ctx, next) => {
  let {
    Case
  } = ctx.models
  let result = {}
  try {
    let {
      thumbnail = '',
      title,
      short = '',
      content
    } = ctx.req.body
    const schema = Joi.object().keys({
      thumbnail: Joi.string().allow(''),
      title: Joi.string().required(),
      short: Joi.string().allow(''),
      content: Joi.string().required()
    })
    await Joi.validate({
      thumbnail,
      title,
      short,
      content
    }, schema)
    const file = ctx.req.file
    if (file) {
      let uploadWithSftp = new UploadWithSftp(file, 1)
      thumbnail = await uploadWithSftp.uploadFileToFtp('case')
    }
    result = await Case.findOrCreate({
      where: {
        title
      },
      defaults: {
        thumbnail,
        short,
        content
      }
    }).spread((cases, created) => {
      if (!created) {
        throw new Error(`Case with title (${title}) is already exist!`)
      }
    })
    ctx.body = FormatResponse.success(result, '保存成功')
  } catch (error) {
    throw new Error(error)
  }
}

const deleteCaseByIds = async (ctx, next) => {
  let {
    Case
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
    result = await Case.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

const editCase = async (ctx, next) => {
  let {
    Case
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
    result = await Case.update({
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

const fetchNew = async (ctx, next) => {
  let {
    Case
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      size = 4
    } = ctx.request.query
    const schema = Joi.object().keys({
      size: Joi.number().default(4)
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
    result = await Case.findAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

const approveCase = async (ctx, next) => {
  let { Case } = ctx.models
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
    result = await Case.update({
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

module.exports = router => {
  router.get('/case/fetch', fetchCase)
  router.get('/case/fetch/:id', fetchCaseById)
  router.post('/case/add', upload.single('file'), addCase)
  router.post('/case/delete', deleteCaseByIds)
  router.post('/case/edit', editCase)
  router.get('/case/new', fetchNew)
  router.post('/case/approve', approveCase)
}

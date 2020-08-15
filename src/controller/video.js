/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 产品视频相关接口
 * @Date: 2019-06-25 11:34:06
 * @LastEditTime: 2019-06-27 09:23:17
 */
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')
const xss = require('xss')
const sequelize = require('../model/connect')
const Sequelize = require('sequelize')

const addVideo = async (ctx, next) => {
  let { Release, ProductVideo } = ctx.models
  let result = {}
  let sourceUrl = null
  let uploadWithSftp = null
  let { productId, poster = '', userCode, size = 0, title = '', desc = '' } = ctx.req.body
  try {
    let schema = Joi.object().keys({
      productId: Joi.string().required(),
      poster: Joi.string().allow(''),
      userCode: Joi.string().required(),
      title: Joi.string().allow(''),
      desc: Joi.string().allow('')
    })
    await Joi.validate(
      {
        productId,
        poster,
        userCode,
        title,
        desc
      },
      schema
    )
    // xss
    productId = xss(productId)
    poster = xss(poster)
    title = xss(title)
    desc = xss(desc)
    const file = ctx.req.file
    if (!file) throw new Error('请先选择产品视频')
    size = file.size || 0
    title = title || file.originalname
    uploadWithSftp = new UploadWithSftp(file, 1)
    sourceUrl = await uploadWithSftp.uploadFileToFtp('product')
    await sequelize.transaction(t => {
      return ProductVideo.create({
        title,
        size,
        desc,
        sourceUrl,
        poster
      }, {
        transaction: t
      }).then(video => {
        return Release.findById(productId, {
          transaction: t
        }).then(product => {
          if (!product) throw new Error(`Product with id(${productId}) is not exist !`)
          return product
            .addProductVideo(video, {
              transaction: t
            })
            .then(() => {
              result = video
            })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    if (uploadWithSftp && sourceUrl) {
      uploadWithSftp.removeFile(sourceUrl, 'product')
    }
    throw new Error(error)
  }
}

const deleteVideo = async (ctx, next) => {
  const { ProductVideo } = ctx.models
  let result = {}
  let options = {}
  let videos = null
  try {
    let { ids } = ctx.request.body
    const schema = Joi.object().keys({
      ids: Joi.array().min(1)
    })
    await Joi.validate(
      {
        ids
      },
      schema
    )
    if (ids && ids.length) {
      options['where'] = {
        id: {
          [Sequelize.Op.in]: ids
        }
      }
    }
    videos = await ProductVideo.find(options)
    if (videos && videos.length) {
      let uploadWithSftp = new UploadWithSftp()
      videos.forEach(async item => {
        uploadWithSftp.removeFile(item.poster, 'news')
        uploadWithSftp.removeFile(item.sourceUrl, 'product')
      })
    }
    result = await ProductVideo.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

const editVideo = async (ctx, next) => {
  const { ProductVideo } = ctx.models
  let result = null
  let sourceUrl = null
  let uploadWithSftp = null
  let model = {}
  try {
    let {
      videoId,
      poster = '',
      userCode,
      size = 0,
      title = '',
      desc = ''
    } = ctx.req.file ? ctx.req.body : ctx.request.body
    const schema = Joi.object().keys({
      videoId: Joi.string().required(),
      poster: Joi.string().allow(''),
      userCode: Joi.string().required(),
      title: Joi.string().allow(''),
      desc: Joi.string().allow('')
    })
    await Joi.validate(
      {
        videoId,
        poster,
        userCode,
        title,
        desc
      },
      schema
    )
    videoId = xss(videoId)
    poster = xss(poster)
    userCode = xss(userCode)
    title = xss(title)
    desc = xss(desc)

    model = {
      poster,
      title,
      desc
    }

    const file = ctx.req.file
    if (file) {
      size = file.size || 0
      title = title || file.originalname
      uploadWithSftp = new UploadWithSftp(file, 1)
      sourceUrl = await uploadWithSftp.uploadFileToFtp('product')
    }
    if (sourceUrl) model['sourceUrl'] = sourceUrl
    if (size) model['size'] = size
    if (title) model['title'] = title
    await ProductVideo.update(
      {
        ...model
      },
      {
        where: {
          id: videoId
        }
      }
    )
    result = await ProductVideo.findById(videoId)
    ctx.body = FormatResponse.success(result, '修改成功')
  } catch (error) {
    throw new Error(error)
  }
}

const fetchProductVideoByProductId = async (ctx, next) => {
  let { ProductVideo } = ctx.models
  let result = {}
  let options = {}
  try {
    let { productId } = ctx.params
    const schema = Joi.object().keys({
      productId: Joi.string().required()
    })
    await Joi.validate(
      {
        productId
      },
      schema
    )
    productId = xss(productId)
    options = {
      where: {
        product_id: productId
      },
      order: [['created_at', 'DESC']]
    }
    result = await ProductVideo.findAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.post('/product/video/upload', upload.single('file'), addVideo)
  router.post('/product/video/delete', deleteVideo)
  router.post('/product/video/edit', upload.single('file'), editVideo)
  router.get('/product/video/fetch/:productId', fetchProductVideoByProductId)
}

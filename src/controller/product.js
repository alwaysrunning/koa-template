/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 产品相关路由
 * @Date: 2018-12-10 18:54:35
 * @LastEditTime: 2019-06-26 14:33:18
 */

const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')
const xss = require('xss')
const sequelize = require('../model/connect')
const formatDiffTime = require('../lib/diff-time')

/**
 * 新建产品
 * 分成几个步骤操作
 * 1、新建产品
 * 2、上传文档
 * 3、上传案例
 * 4、产品路线图
 * 5、上传交付计划
 * 6、产品研发计划
 * @param {*} ctx
 * @param {*} next
 */
const addProduct = async (ctx, next) => {
  let {
    Product,
    ProductType,
    Team,
    User
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    title,
    desc,
    topImg = '',
    productTypes,
    teamId,
    userCode
  } = ctx.req.body
  try {
    let schema = Joi.object().keys({
      title: Joi.string().required(),
      desc: Joi.string().required(),
      topImg: Joi.string().allow(''),
      productTypes: Joi.string().required(),
      teamId: Joi.string().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      title,
      desc,
      topImg,
      productTypes,
      teamId,
      userCode
    }, schema)

    // xss
    title = xss(title)
    desc = xss(desc)
    topImg = xss(topImg)
    teamId = xss(teamId)
    userCode = xss(userCode)
    const file = ctx.req.file
    if (!file) throw new Error('未选择封面图片')
    uploadWithSftp = new UploadWithSftp(file, 1)
    topImg = await uploadWithSftp.uploadFileToFtp('product')

    /**
     * 使用事务处理新增和建立关联的问题
     */

    await sequelize.transaction(t => {
      return Product.findOrCreate({
        where: {
          title
        },
        defaults: {
          desc,
          topImg,
          status: 2 // 新建产品为待审批
        },
        transaction: t
      }).then(([release, created]) => {
        if (!created) {
          throw new Error(`Product with title (${title}) is already exist!`)
        }
        result = release
        productTypes = productTypes.split(',')
        return ProductType.findAll({
          where: {
            id: {
              [Sequelize.Op.in]: productTypes
            }
          },
          transaction: t
        }).then(prodTypes => {
          if (!prodTypes || !prodTypes.length || prodTypes.length !== productTypes.length) throw new Error(`ProductType with id(${productTypes.join(',')}) is not exist !`)
          return release.addProductTypes(prodTypes, {
            transaction: t
          }).then(() => {
            return Team.findById(teamId, {
              transaction: t
            }).then(team => {
              if (!team) throw new Error(`Team with id (${teamId}) is not exist !`)
              return team.addReleases(release, {
                transaction: t
              }).then(() => {
                return User.findOne({
                  where: {
                    username: userCode
                  },
                  transaction: t
                }).then(user => {
                  if (!user) throw new Error(`User with username(${userCode}) is not exist !`)
                  return user.addProducts(release, {
                    transaction: t
                  })
                })
              })
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    /**
     * 如果发现有报错，我们需要将已经上传的文件进行删除
     */
    if (uploadWithSftp && topImg) {
      uploadWithSftp.removeFile(topImg, 'product')
    }
    throw new Error(error)
  }
}
/**
 * 直接插入产品数据
 * @param {*} ctx
 * @param {*} next
 */
const insertProduct = async (ctx, next) => {
  let {
    Product,
    ProductType,
    Team
  } = ctx.models
  let result = {}
  try {
    let {
      title,
      desc,
      topImg = '',
      productTypes,
      teamId
    } = ctx.request.body
    let schema = Joi.object().keys({
      title: Joi.string().required(),
      desc: Joi.string().required(),
      topImg: Joi.string().allow(''),
      productTypes: Joi.array(),
      teamId: Joi.string()
    })
    await Joi.validate({
      title,
      desc,
      topImg,
      productTypes,
      teamId
    }, schema)

    // xss
    title = xss(title)
    desc = xss(desc)
    topImg = xss(topImg)
    teamId = xss(teamId)

    await Product.findOrCreate({
      where: {
        title
      },
      defaults: {
        desc,
        topImg,
        status: 2 // 新建产品为待审批
      }
    }).spread((products, created) => {
      result = products
      if (!created) {
        throw new Error(`Case with title (${title}) is already exist!`)
      }
    })
    let pt = await ProductType.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: productTypes
        }
      }
    })
    /**
     * 建立外键
     */
    if (pt && pt.length) {
      result.addProductTypes(pt)
    }
    let tm = await Team.findById(teamId)
    if (tm) {
      tm.addProducts(result)
    }
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量删除产品
 * @param {*} ctx
 * @param {*} next
 */
const deleteProduct = async (ctx, next) => {
  let {
    Product
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { ids } = ctx.request.body
    let schema = Joi.object().keys({
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
    result = await Product.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 修改产品
 * @param {*} ctx
 * @param {*} next
 */
const editProduct = async (ctx, next) => {
  let {
    Product,
    ProductType,
    ProductDoc,
    ProductCase,
    ProductRoute,
    DevelopPlan,
    DeliveryPlan,
    Team
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      title,
      desc,
      topImg = '',
      productTypes,
      teamId,
      productDocs,
      productCases,
      productRoutes,
      developPlans,
      deliveryPlans
    } = ctx.request.body
    let schema = Joi.object().keys({
      id: Joi.string().required(),
      title: Joi.string().required(),
      desc: Joi.string().required(),
      topImg: Joi.string().allow(''),
      teamId: Joi.string().required(),
      productTypes: Joi.array().items(Joi.string().required()).min(1),
      productDocs: Joi.array(),
      productCases: Joi.array(),
      productRoutes: Joi.array(),
      developPlans: Joi.array(),
      deliveryPlans: Joi.array()
    })
    await Joi.validate({
      id,
      title,
      desc,
      topImg,
      productTypes,
      teamId,
      productDocs,
      productCases,
      productRoutes,
      developPlans,
      deliveryPlans
    }, schema)

    // xss
    id = xss(id)
    title = xss(title)
    desc = xss(desc)
    topImg = xss(topImg)
    teamId = xss(teamId)

    await sequelize.transaction(t => {
      return Product.update({
        title,
        desc,
        topImg,
        status: 1
      }, {
        where: {
          id
        },
        transaction: t
      }).then(changed => {
        // if (changed[0] !== 1) throw new Error(`Product with id (${id} is not exist !`)
        return Product.findById(id, {
          transaction: t
        }).then(release => {
          result = release
          return ProductDoc.findAll({
            where: {
              id: {
                [Sequelize.Op.in]: productDocs
              }
            },
            transaction: t
          }).then(prodDocs => {
            if (!prodDocs || !prodDocs.length || prodDocs.length !== productDocs.length) throw new Error(`ProductDoc with id(${productDocs.join(',')}) is not exist!`)
            return release.addProductDocs(prodDocs, {
              transaction: t
            })
          }).then(() => {
            return ProductCase.findAll({
              where: {
                id: {
                  [Sequelize.Op.in]: productCases
                }
              },
              transaction: t
            }).then(prodCases => {
              if (!prodCases || !prodCases.length || prodCases.length !== productCases.length) throw new Error(`ProductCase with id(${productCases.join(',')}) is not exist!`)
              return release.addProductCases(prodCases, {
                transaction: t
              })
            })
          }).then(() => {
            return ProductRoute.findAll({
              where: {
                id: {
                  [Sequelize.Op.in]: productRoutes
                }
              },
              transaction: t
            }).then(prodRoutes => {
              if (!prodRoutes || !prodRoutes.length || prodRoutes.length !== productRoutes.length) throw new Error(`ProductRoute with id(${productRoutes.join(',')}) is not exist!`)
              return release.addProductRoutes(prodRoutes)
            })
          }).then(() => {
            return DevelopPlan.findAll({
              where: {
                id: {
                  [Sequelize.Op.in]: developPlans
                }
              },
              transaction: t
            }).then(dePlans => {
              if (!dePlans || !dePlans.length || dePlans.length !== developPlans.length) throw new Error(`DevelopPlan with id(${developPlans.join(',')}) is not exist!`)
              return release.addDevelopPlans(dePlans, {
                transaction: t
              })
            })
          }).then(() => {
            return DeliveryPlan.findAll({
              where: {
                id: {
                  [Sequelize.Op.in]: deliveryPlans
                }
              },
              transaction: t
            }).then(delPlans => {
              if (!delPlans || !delPlans.length || delPlans.length !== deliveryPlans.length) throw new Error(`DeliveryPlan with id(${deliveryPlans.join(',')}) is not exist!`)
              return release.addDeliveryPlans(delPlans, {
                transaction: t
              })
            })
          }).then(() => {
            return ProductType.findAll({
              where: {
                id: {
                  [Sequelize.Op.in]: productTypes
                }
              },
              transaction: t
            }).then(prodTypes => {
              if (!prodTypes || !prodTypes.length || prodTypes.length !== productTypes.length) throw new Error(`ProductType with id(${productTypes.join(',')}) is not exist!`)
              return release.addProductTypes(prodTypes, {
                transaction: t
              })
            })
          }).then(() => {
            return Team.findById(teamId, {
              transaction: t
            }).then(team => {
              if (!team) throw new Error(`Team with id(${teamId}) is not exist !`)
              return team.addReleases(release, {
                transaction: t
              })
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '编辑成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量查询产品
 * @param {*} ctx
 * @param {*} next
 */
const fetchProduct = async (ctx, next) => {
  let {
    Product,
    Team,
    TeamMember,
    UserInfo
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      title,
      pageSize = 10,
      currentPage = 1,
      userCode,
      product_kind_id
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    const schema = Joi.object().keys({
      title: Joi.string().allow(''),
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      userCode: Joi.string(),
      product_kind_id: Joi.string().allow('')
    })
    await Joi.validate({
      title,
      pageSize,
      currentPage,
      userCode,
      product_kind_id
    }, schema)

    let username = xss(userCode)
    title = xss(title)

    if (username) {
      options = {
        where: {
        },
        include: [{
          model: Team,
          include: [{
            model: TeamMember
          }]
        }, {
          model: UserInfo,
          attributes: ['username', 'mail'],
          through: {
            where: {
              product_id: Sequelize.col('id'),
              username
            }
          }
        }],
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        order: [
          ['created_at', 'ASC']
        ],
        distinct: true
      }
    } else {
      options = {
        where: {},
        include: [{
          model: Team,
          include: [{
            model: TeamMember
          }]
        }],
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        order: [
          ['created_at', 'DESC']
        ],
        distinct: true
      }
    }
    if (title) {
      options['where']['title'] = {
        [Sequelize.Op.like]: `%${title}%`
      }
    }
    if (product_kind_id) {
      options['where']['product_kind_id'] = product_kind_id
    }
    /**
     * 由于表中存的都是审核过后的产品，所以不需要按状态查询
     */
    /* if (status) {
      options['where']['status'] = {
        [Sequelize.Op.eq]: status
      }
    } else {
      options['where']['status'] = {
        [Sequelize.Op.lt]: 2
      }
    } */
    result = await Product.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}
/**
 * 按id查询产品
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductById = async (ctx, next) => {
  let {
    Product,
    ProductType,
    ProductDoc,
    ProductCase,
    ProductRoute,
    ProductRouteType,
    DevelopPlan,
    DeliveryPlan,
    Team,
    TeamMember,
    TeamRole,
    UserInfo
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { id } = ctx.params
    let { userCode } = ctx.request.query
    let username = xss(userCode)
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      username: Joi.string()
    })
    await Joi.validate({
      id,
      username
    }, schema)
    id = xss(id)

    options = {
      include: [{
        model: ProductType,
        through: {
          attributes: []
        }
      }, {
        model: ProductDoc,
        attributes: {
          exclude: ['product_id', 'release_id']
        }
      }, {
        model: ProductCase,
        attributes: {
          exclude: ['product_id', 'release_id']
        }
      }, {
        model: ProductRoute,
        attributes: {
          exclude: ['product_id', 'release_id']
        },
        include: [{
          model: ProductRouteType
        }]
      }, {
        model: DevelopPlan,
        attributes: {
          exclude: ['product_id', 'release_id']
        }
      }, {
        model: DeliveryPlan,
        attributes: {
          exclude: ['product_id', 'release_id']
        }
      }, /* , {
        model: Team,
        include: [{
          model: TeamMember,
          include: [TeamRole]
        }]
      } */ {
        model: UserInfo,
        attributes: ['username', 'mail'],
        through: {
          where: {
            product_id: id,
            username
          }
        }
      }]
    }

    result = await Product.findById(id, options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询产品基本信息
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductBaseById = async (ctx, next) => {
  let {
    Product,
    UserInfo
  } = ctx.models
  let result = {}
  try {
    let {
      id
    } = ctx.params
    let {
      userCode
    } = ctx.request.query
    let username = xss(userCode)
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      username: Joi.string().required()
    })
    await Joi.validate({
      id,
      username
    }, schema)
    id = xss(id)
    result = await Product.findById(id, {
      include: [{
        model: UserInfo,
        attributes: ['username', 'mail'],
        through: {
          where: {
            product_id: id,
            username
          }
        }
      }]
    })
    result = result.get({
      plain: true
    })
    let diffTime = formatDiffTime(result.updated_at)
    ctx.body = FormatResponse.success(Object.assign(result, {
      diffTime
    }), '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品查询所属团队
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamByProductId = async (ctx, next) => {
  let {
    Product,
    Team,
    TeamMember
  } = ctx.models
  let result = {}
  let options = {}
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

    options = {
      include: {
        model: Team,
        include: [{
          model: TeamMember
        }]
      }
    }
    result = await Product.findById(id, options)
    ctx.body = FormatResponse.success(result.team, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品名模糊搜索产品
 * @param {*} ctx
 * @param {*} next
 */
const searchProduct = async (ctx, next) => {
  let {
    Product
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      title,
      pageSize = 10,
      currentPage = 1,
      status
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    const schema = Joi.object().keys({
      title: Joi.string().allow(''),
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required()
    })
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
    result = await Product.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量审批
 * @param {*} ctx
 * @param {*} next
 */
const approveProject = async (ctx, next) => {
  let { Product } = ctx.models
  let result = {}
  try {
    let { status, ids } = ctx.request.body
    const schema = Joi.object().keys({
      status: Joi.number().required(),
      ids: Joi.array().min(1)
    })
    await Joi.validate({
      status,
      ids
    }, schema)
    status = parseInt(status)
    result = await Product.update({
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
 * 关注或者收藏产品
 * @param {*} ctx
 * @param {*} next
 */
const productStar = async (ctx, next) => {
  let {
    Product,
    UserInfo
  } = ctx.models
  let result = {}
  try {
    let {
      productId,
      userCode,
      status
    } = ctx.request.query
    status = parseInt(status)
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      userCode: Joi.string().required(),
      status: Joi.number().required()
    })
    await Joi.validate({
      productId,
      userCode,
      status
    }, schema)
    // xss
    productId = xss(productId)
    let username = xss(userCode)
    status = xss(status)

    let product = await Product.findById(productId)
    let user = await UserInfo.findOne({
      where: {
        username
      }
    })
    if (status) {
      await user.addProducts(product, {
        through: {
          username
        }
      })
    } else {
      await user.removeProduct(product)
    }
    await Product.update({
      follow: status ? ++product.follow : (--product.follow < 0 ? 0 : product.follow)
    }, {
      where: {
        id: productId
      }
    })
    ctx.body = FormatResponse.success(result, status ? '关注成功' : '取消关注成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询用户关注过的产品
 * @param {*} ctx
 * @param {*} next
 */
const getProductStar = async (ctx, next) => {
  let {
    Follow,
    Product
  } = ctx.models
  try {
    let {
      userCode,
      pageSize = 10,
      currentPage = 1
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      userCode,
      pageSize,
      currentPage
    }, schema)
    let username = xss(userCode)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    let options = {
      where: {
        username
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    let follows = await Follow.findAndCountAll(options)
    let prodIds = follows.rows.map(item => {
      return item.product_id
    })
    let prods = await Product.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: prodIds
        }
      }
    })
    ctx.body = FormatResponse.success({
      count: follows.count,
      rows: prods
    }, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询热门产品
 * @param {*} ctx
 * @param {*} next
 */
const getProductHot = async (ctx, next) => {
  let {
    Follow,
    Product
  } = ctx.models
  let result = {}
  let follows = []
  try {
    let {
      size = 4
    } = ctx.request.query
    const schema = Joi.object().keys({
      size: Joi.number().required()
    })
    await Joi.validate({
      size
    }, schema)
    size = parseInt(size)
    follows = await Follow.findAll({
      attributes: ['product_id', [Sequelize.fn('count', 'product_id'), 'total']],
      group: ['product_id'],
      order: [
        [Sequelize.fn('count', 'product_id'), 'desc']
      ],
      limit: size,
      raw: true
    })
    let ids = follows.map(item => {
      return item.product_id
    })
    let products = await Product.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: ids
        }
      },
      raw: true
    })
    result = products.map(item => {
      let n = item
      follows.forEach(follow => {
        if (follow.product_id === item.id) {
          n.total = follow.total
        }
      })
      return n
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增产品类型
 * @param {*} ctx
 * @param {*} next
 */
const addProductType = async (ctx, next) => {
  let { ProductType } = ctx.models
  let result = {}
  try {
    let {
      name
    } = ctx.request.body
    let schema = Joi.object().keys({
      name: Joi.string().required()
    })
    await Joi.validate({
      name
    }, schema)
    name = xss(name)
    result = await ProductType.findOrCreate({
      where: {
        name
      }
    }).spread((productType, created) => {
      if (!created) {
        throw new Error(`ProductType with name (${name}) is already exist!`)
      }
      result = productType
    })
    ctx.body = FormatResponse.success(result, '保存成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量新增产品类型
 * @param {*} ctx
 * @param {*} next
 */
const bulkAddProductType = async (ctx, next) => {
  let {
    ProductType
  } = ctx.models
  let result = {}
  try {
    let {
      productTypes
    } = ctx.request.body
    let schema = Joi.object().keys({
      productTypes: Joi.array().items(Joi.object({
        name: Joi.string().required()
      })).min(1)
    })
    await Joi.validate({
      productTypes
    }, schema)
    result = await ProductType.bulkCreate(productTypes, {
      validate: true
    }).catch(error => {
      throw new Error(`ProductType with name (${error.fields.name}) is already exist!`)
    })
    ctx.body = FormatResponse.success(result, '保存成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量删除产品类型
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductType = async (ctx, next) => {
  let {
    ProductType
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { ids } = ctx.request.body
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
    result = await ProductType.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑产品类型
 * @param {*} ctx
 * @param {*} next
 */
const editProductType = async (ctx, next) => {
  let {
    ProductType
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      name
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      name: Joi.string().required()
    })
    await Joi.validate({
      id,
      name
    }, schema)
    id = xss(id)
    name = xss(name)
    result = await ProductType.update({
      name
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
 * 查询产品类型
 * @param {*} ctx
 * @param {*} next
 */
const fetchProjectType = async (ctx, next) => {
  let result = {}
  let {
    ProductType
  } = ctx.models
  try {
    let {
      name,
      currentPage = 1,
      pageSize = 10
    } = ctx.request.query
    const schema = Joi.object().keys({
      name: Joi.string(),
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required()
    })
    await Joi.validate({
      name,
      currentPage,
      pageSize
    }, schema)
    name = xss(name)
    let options = {
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
    result = await ProductType.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 按id查询产品类型
 * @param {*} ctx
 * @param {*} next
 */
const fetchProjectTypeById = async (ctx, next) => {
  let result = {}
  let {
    ProductType
  } = ctx.models
  try {
    let { id } = ctx.params
    const schema = Joi.object().keys({
      id: Joi.string().required()
    })
    await Joi.validate({
      id
    }, schema)
    id = xss(id)
    result = await ProductType.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 产品文档
 */
/**
 * 新增产品文档
 * @param {*} ctx
 * @param {*} next
 */
const addProductDoc = async (ctx, next) => {
  let {
    ProductDoc,
    Product,
    ProductDocType,
    Release
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    downLoadUrl,
    fileType = 1,
    originalName,
    size
  } = {}
  try {
    let {
      productId,
      title,
      productDocType
    } = ctx.req.body
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      title: Joi.string().allow(''),
      productDocType: Joi.string().required()
    })
    await Joi.validate({
      productId,
      title,
      productDocType
    }, schema)
    productId = xss(productId)
    title = xss(title)

    const file = ctx.req.file
    if (!file) throw new Error(`为选择文件`)
    const fileFormat = (file.originalname).split('.')
    originalName = file.originalname
    size = file.size
    switch (fileFormat[fileFormat.length - 1].toLowerCase()) {
      case 'ppt':
      case 'pptx':
        fileType = 1
        break
      case 'doc':
      case 'docx':
        fileType = 2
        break
      case 'xlsx':
      case 'xls':
        fileType = 3
        break
      case 'pdf':
        fileType = 4
        break
      default:
        fileType = 1
        break
    }
    title = title || originalName
    uploadWithSftp = new UploadWithSftp(file, 1)
    downLoadUrl = await uploadWithSftp.uploadFileToFtp('product')
    await sequelize.transaction(t => {
      return ProductDoc.create({
        downLoadUrl,
        fileType,
        originalName,
        size,
        title
      }, {
        transaction: t
      }).then(productDoc => {
        return ProductDocType.findById(productDocType, {
          transaction: t
        }).then(prodDoctype => {
          if (!prodDoctype) throw new Error(`ProductDocType with id (${productDocType}) is not exist !`)
          return prodDoctype.addProductDoc(productDoc, {
            transaction: t
          }).then(() => {
            return Release.findById(productId, {
              transaction: t
            }).then(product => {
              if (!product) throw new Error(`Product with id(${productId}) is not exist !`)
              return product.addProductDoc(productDoc, {
                transaction: t
              }).then(() => {
                return ProductDoc.findById(productDoc.id, {
                  include: [{
                    model: ProductDocType
                  }],
                  transaction: t
                }).then(prodDoc => {
                  if (!prodDoc) throw new Error(`ProductDoc with id (${productDoc.id}) is not exist !`)
                  result = prodDoc
                })
              })
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    if (uploadWithSftp && downLoadUrl) {
      uploadWithSftp.removeFile(downLoadUrl, 'product')
    }
    throw new Error(error)
  }
}

/**
 * 插入产品文档
 * @param {*} ctx
 * @param {*} next
 */
const insertProductDoc = async (ctx, next) => {
  let {
    ProductDoc,
    Product,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      productId,
      title
    } = ctx.request.body
    let {
      downLoadUrl,
      fileType = 1,
      originalName,
      size
    } = {}
    const schema = Joi.object().keys({
      productId: Joi.string(),
      title: Joi.string().allow('')
    })
    await Joi.validate({
      productId,
      title
    }, schema)
    await ProductDoc.findOrCreate({
      where: {
        title
      },
      defaults: {
        downLoadUrl,
        fileType,
        originalName,
        size
      }
    }).spread((productDoc, created) => {
      if (!created) {
        throw new Error(`ProductDoc with title (${title}) is already exist!`)
      }
      result = productDoc
    })
    if (productId) {
      let product = await Release.findById(productId)
      product.addProductDocs(result)
    }
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增产品文档类型
 * @param {*} ctx
 * @param {*} next
 */
const addProductDocType = async (ctx, next) => {
  let {
    ProductDocType
  } = ctx.models
  let result = {}
  try {
    let {
      name
    } = ctx.request.body
    const schema = Joi.object().keys({
      name: Joi.string().required()
    })
    await Joi.validate({
      name
    }, schema)
    name = xss(name)
    result = await ProductDocType.findOrCreate({
      where: {
        name
      }
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除产品文档类型
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductDocType = async (ctx, next) => {
  let {
    ProductDocType
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
    result = await ProductDocType.destroy({
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
 * 查询产品文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductDocType = async (ctx, next) => {
  let {
    ProductDocType
  } = ctx.models
  let result = {}
  try {
    result = await ProductDocType.findAll({
      order: [
        ['created_at', 'ASC']
      ]
    })
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
const fetchProductDocTypeById = async (ctx, next) => {
  let {
    ProductDocType
  } = ctx.models
  let result = {}
  try {
    let { id } = ctx.params
    const schema = Joi.object().keys({
      id: Joi.string().required()
    })
    await Joi.validate({
      id
    }, schema)
    id = xss(id)
    result = await ProductDocType.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 修改产品文档类型
 * @param {*} ctx
 * @param {*} next
 */
const editProductDocType = async (ctx, next) => {
  let {
    ProductDocType
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      name
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      name: Joi.string().required()
    })
    await Joi.validate({
      id,
      name
    }, schema)
    id = xss(id)
    name = xss(name)
    result = await ProductDocType.update({
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
 * 删除产品文档
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductDoc = async (ctx, next) => {
  let {
    ProductDoc
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { ids } = ctx.request.body
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
    result = await ProductDoc.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量查询
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductDoc = async (ctx, next) => {
  let {
    ProductDoc
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      pageSize = 8,
      currentPage = 1,
      title
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      title: Joi.string().allow('')
    })
    await Joi.validate({
      pageSize,
      currentPage,
      title
    }, schema)
    title = xss(title)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
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
    result = await ProductDoc.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品查询文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductDocByProduct = async (ctx, next) => {
  let {
    ProductDoc,
    ProductDocType
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { productId } = ctx.params
    let {
      pageSize = 8, currentPage = 1, productDocType
    } = ctx.request.query
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      productDocType: Joi.string().allow('')
    })
    await Joi.validate({
      productId,
      pageSize,
      currentPage,
      productDocType
    }, schema)
    productId = xss(productId)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
    productDocType = xss(productDocType)
    options = {
      where: {
        product_id: productId
      },
      include: [{
        model: ProductDocType
      }],
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [['created_at', 'DESC']]
    }
    if (productDocType) {
      options['where']['product_doc_type_id'] = productDocType
    }
    result = await ProductDoc.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增产品案例
 * @param {*} ctx
 * @param {*} next
 */
const addProductCase = async (ctx, next) => {
  let {
    ProductCase,
    Product,
    Release
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    imgUrl
  } = {}
  try {
    let {
      productId,
      title,
      short,
      content
    } = ctx.req.body
    const schema = Joi.object().keys({
      productId: Joi.string(),
      title: Joi.string().allow(''),
      short: Joi.string().required(),
      content: Joi.string().required()
    })
    await Joi.validate({
      productId,
      title,
      short,
      content
    }, schema)
    // xss
    productId = xss(productId)
    title = xss(title)
    short = xss(short)
    content = xss(content)

    const file = ctx.req.file
    if (!file) throw new Error('为选择文件')
    uploadWithSftp = new UploadWithSftp(file, 1)
    imgUrl = await uploadWithSftp.uploadFileToFtp('product')

    await sequelize.transaction(t => {
      return ProductCase.findOrCreate({
        where: {
          title
        },
        defaults: {
          imgUrl,
          content,
          short,
          status: 2
        },
        transaction: t
      }).then(([productCase, created]) => {
        if (!created) {
          throw new Error(`ProductCase with title (${title}) is already exist!`)
        }
        result = productCase
        return Release.findById(productId, {
          transaction: t
        }).then(product => {
          return product.addProductCase(productCase, {
            transaction: t
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    if (uploadWithSftp && imgUrl) {
      uploadWithSftp.removeFile(imgUrl, 'product')
    }
    throw new Error(error)
  }
}

/**
 * 新增产品案例
 * @param {*} ctx
 * @param {*} next
 */
const insertProductCase = async (ctx, next) => {
  let {
    ProductCase,
    Product,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      productId = '',
      title,
      short,
      content,
      imgUrl
    } = ctx.request.body
    const schema = Joi.object().keys({
      productId: Joi.string().allow(''),
      title: Joi.string().required(''),
      short: Joi.string().required(),
      content: Joi.string().required(),
      imgUrl: Joi.string().required()
    })
    await Joi.validate({
      productId,
      title,
      short,
      content,
      imgUrl
    }, schema)
    await ProductCase.findOrCreate({
      where: {
        title
      },
      defaults: {
        imgUrl,
        content,
        short,
        status: 2
      }
    }).spread((productCase, created) => {
      if (!created) {
        throw new Error(`ProductCase with title (${title}) is already exist!`)
      }
      result = productCase
    })
    if (productId) {
      let product = await Release.findById(productId)
      product.addProductCase(result)
    }
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量删除产品案例
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductCase = async (ctx, next) => {
  let {
    ProductCase
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
    result = await ProductCase.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 修改案例
 * @param {*} ctx
 * @param {*} next
 */
const editProductCase = async (ctx, next) => {
  let {
    ProductCase, Product, Release
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      productId,
      title,
      short,
      content,
      imgUrl
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      productId: Joi.string(),
      title: Joi.string().required(),
      short: Joi.string().required(),
      content: Joi.string().required(),
      imgUrl: Joi.string().required()
    })
    await Joi.validate({
      id,
      productId,
      title,
      short,
      content,
      imgUrl
    }, schema)

    id = xss(id)
    productId = xss(productId)
    title = xss(title)
    short = xss(short)
    content = xss(content)
    imgUrl = xss(imgUrl)

    await sequelize.transaction(t => {
      return ProductCase.update({
        title,
        short,
        content,
        imgUrl
      }, {
        where: {
          id
        },
        transaction: t
      }).then(changed => {
        // if (changed[0] !== 1) throw new Error(`ProductCase with id (${id}) is not exist!`)
        return ProductCase.findById(id, {
          transaction: t
        }).then(productCase => {
          return Release.findById(productId, {
            transaction: t
          }).then(product => {
            if (!product) throw new Error(`Product with id(${productId}) is not exsit !`)
            return product.addProductCase(productCase, {
              transaction: t
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
 * 产品案例与产品建立关联
 * @param {*} ctx
 * @param {*} next
 */
const joinProductCaseWithProduct = async (ctx, next) => {
  let {
    Product,
    ProductCase,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      productId,
      productCases
    } = ctx.request.body
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      productCases: Joi.array().required()
    })
    await Joi.validate({
      productId,
      productCases
    }, schema)
    let prod = await Release.findById(productId)
    let prodCases = await ProductCase.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: productCases
        }
      }
    })
    if (!prod) {
      throw new Error(`产品(${productId})不存在`)
    }
    if (!prodCases || !prodCases.length) {
      throw new Error(`产品案例(${productCases.join(',')})不存在`)
    }
    prod.addProductCases(prodCases)
    ctx.body = FormatResponse.success(result, `产品(${productId})与产品案例(${productCases.join(',')})关联关系建立成功`)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询产品案例
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductCase = async (ctx, next) => {
  let {
    ProductCase
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      pageSize = 8,
      currentPage = 1,
      title
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      title: Joi.string().allow('')
    })
    await Joi.validate({
      pageSize,
      currentPage,
      title
    }, schema)
    title = xss(title)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
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
    result = await ProductCase.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据案例id查询
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductCaseById = async (ctx, next) => {
  let {
    ProductCase
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
    result = await ProductCase.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品查询文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductCaseByProduct = async (ctx, next) => {
  let {
    ProductCase
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      productId
    } = ctx.params
    let {
      pageSize = 9999, currentPage = 1
    } = ctx.request.query
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required()
    })
    await Joi.validate({
      productId,
      pageSize,
      currentPage
    }, schema)
    productId = xss(productId)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
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
    result = await ProductCase.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}
/**
 * 查询最新案例
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductCaseNew = async (ctx, next) => {
  let {
    ProductCase
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
    result = await ProductCase.findAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量审核案例
 * @param {*} ctx
 * @param {*} next
 */
const approveProductCase = async (ctx, next) => {
  let {
    ProductCase
  } = ctx.models
  let result = {}
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
    result = await ProductCase.update({
      status: 1
    }, {
      id: {
        [Sequelize.Op.in]: ids
      }
    })
    ctx.body = FormatResponse.success(result, '审核成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 更新下载数
 * @param {*} ctx
 * @param {*} next
 */
const updateProductDocDownload = async (ctx, next) => {
  let {
    UserInfo,
    ProductDoc
  } = ctx.models
  let result = {}
  try {
    let {
      productDocId,
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      productDocId: Joi.string().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      productDocId,
      userCode
    }, schema)
    let username = xss(userCode)
    productDocId = xss(productDocId)

    await sequelize.transaction(t => {
      return ProductDoc.findById(productDocId, {
        transaction: t
      }).then(prodDoc => {
        if (!prodDoc) throw new Error(`ProductDoc with id(${productDocId}) is not exist !`)
        result = prodDoc
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          return ProductDoc.update({
            downloadNum: ++prodDoc.downloadNum,
            username
          }, {
            where: {
              id: productDocId
            },
            transaction: t
          }).then(() => {
            return user.addProductDoc(prodDoc, {
              through: {
                download: 1,
                username
              },
              transaction: t
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '下载计数成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * TODO: 继续做事务模式改写
 */

/**
 * 更新点赞数
 * @param {*} ctx
 * @param {*} next
 */
const updateProductDocPraise = async (ctx, next) => {
  let {
    UserInfo,
    ProductDoc
  } = ctx.models
  let result = {}
  try {
    let {
      productDocId,
      userCode,
      status
    } = ctx.request.query
    const schema = Joi.object().keys({
      productDocId: Joi.string().required(),
      userCode: Joi.string().required(),
      status: Joi.number().integer().required()
    })
    await Joi.validate({
      productDocId,
      userCode,
      status
    }, schema)
    status = parseInt(status)
    let username = xss(userCode)
    productDocId = xss(productDocId)
    status = xss(status)

    await sequelize.transaction(t => {
      return ProductDoc.findById(productDocId, {
        transaction: t
      }).then(prodDoc => {
        if (!prodDoc) throw new Error(`ProductDoc width id(${productDocId}) is not exist !`)
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          return user.addProductDocs(prodDoc, {
            through: {
              praise: status,
              username
            },
            transaction: t
          }).then(() => {
            return ProductDoc.update({
              praiseNum: status ? ++prodDoc.praiseNum : (--prodDoc.praiseNum < 0 ? 0 : prodDoc.praiseNum)
            }, {
              where: {
                id: productDocId
              },
              transaction: t
            })
          })
        })
      })
    })

    ctx.body = FormatResponse.success(result, status ? '点赞成功' : '取消点赞成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 更新收藏数
 * @param {*} ctx
 * @param {*} next
 */
const updateProductDocCollect = async (ctx, next) => {
  let {
    UserInfo,
    ProductDoc
  } = ctx.models
  let result = {}
  try {
    let {
      productDocId,
      userCode,
      status
    } = ctx.request.query
    const schema = Joi.object().keys({
      productDocId: Joi.string().required(),
      userCode: Joi.string().required(),
      status: Joi.number().integer().required()
    })
    await Joi.validate({
      productDocId,
      userCode,
      status
    }, schema)
    status = parseInt(status)
    productDocId = xss(productDocId)
    let username = xss(userCode)

    await sequelize.transaction(t => {
      return ProductDoc.findById(productDocId, {
        transaction: t
      }).then(prodDoc => {
        if (!prodDoc) throw new Error(`ProductDoc width id(${productDocId}) is not exist !`)
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          return user.addProductDocs(prodDoc, {
            through: {
              collect: status,
              username
            },
            transaction: t
          }).then(() => {
            return ProductDoc.update({
              collectNum: status ? ++prodDoc.collectNum : (--prodDoc.collectNum < 0 ? 0 : prodDoc.collectNum)
            }, {
              where: {
                id: productDocId
              },
              transaction: t
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, status ? '收藏成功' : '取消收藏成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询用户收藏的文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchCollectProductDoc = async (ctx, next) => {
  let {
    ProductDoc,
    Comment
  } = ctx.models

  try {
    let {
      pageSize = 10,
      currentPage = 1,
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      pageSize,
      currentPage,
      userCode
    }, schema)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)

    let username = xss(userCode)
    let options = {
      where: {
        username,
        collect: 1
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    let comments = await Comment.findAndCountAll(options)
    let prodDocIds = comments.rows.map(item => {
      return item.product_doc_id
    })
    let proDocs = await ProductDoc.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: prodDocIds
        }
      },
      order: [
        ['created_at', 'DESC']
      ]
    })
    ctx.body = FormatResponse.success({
      count: comments.count,
      rows: proDocs
    }, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询用户下载的文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchDownloadProductDoc = async (ctx, next) => {
  let {
    ProductDoc,
    Comment
  } = ctx.models

  try {
    let {
      pageSize = 10,
      currentPage = 1,
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      pageSize,
      currentPage,
      userCode
    }, schema)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    let username = xss(userCode)
    let options = {
      where: {
        username,
        download: 1
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    let comments = await Comment.findAndCountAll(options)
    let prodDocIds = comments.rows.map(item => {
      return item.product_doc_id
    })
    let proDocs = await ProductDoc.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: prodDocIds
        }
      },
      order: [
        ['created_at', 'DESC']
      ]
    })
    ctx.body = FormatResponse.success({
      count: comments.count,
      rows: proDocs
    }, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 点赞过的文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchPraiseProductDoc = async (ctx, next) => {
  let {
    ProductDoc,
    Comment
  } = ctx.models

  try {
    let {
      pageSize = 10,
      currentPage = 1,
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      pageSize,
      currentPage,
      userCode
    }, schema)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    let username = xss(userCode)
    let options = {
      where: {
        username,
        praise: 1
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    let comments = await Comment.findAndCountAll(options)
    let prodDocIds = comments.rows.map(item => {
      return item.product_doc_id
    })
    let proDocs = await ProductDoc.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: prodDocIds
        }
      },
      order: [
        ['created_at', 'DESC']
      ]
    })
    ctx.body = FormatResponse.success({
      count: comments.count,
      rows: proDocs
    }, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 将产品文档和产品建立关联
 * @param {*} ctx
 * @param {*} next
 */
const joinProductDocWithProduct = async (ctx, next) => {
  let {
    Product,
    ProductDoc
  } = ctx.models
  let result = {}
  try {
    let {
      productId,
      productDocIds
    } = ctx.request.body
    let schema = Joi.object().keys({
      productId: Joi.string().required(),
      productDocIds: Joi.array().min(1)
    })
    await Joi.validate({
      productId,
      productDocIds
    }, schema)
    let prod = await Product.findById(productId)
    let prodDocs = await ProductDoc.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: productDocIds
        }
      }
    })
    if (!prod) {
      throw new Error(`产品(${productId})不存在`)
    }
    if (!prodDocs || !prodDocs.length) {
      throw new Error(`产品文档(${productDocIds.join(',')})不存在`)
    }
    prod.addProductDocs(prodDocs)
    ctx.body = FormatResponse.success(result, `产品(${productId})与产品文档(${productDocIds.join(',')})关联建立成功`)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增研发计划
 * @param {*} ctx
 * @param {*} next
 */
const addProductDevelopPlan = async (ctx, next) => {
  let {
    Product,
    Release,
    DevelopPlan
  } = ctx.models
  let result = {}
  try {
    let {
      title,
      timeRange,
      productId
    } = ctx.request.body
    const schema = Joi.object().keys({
      title: Joi.string().required(),
      timeRange: Joi.string().required(),
      productId: Joi.string().required()
    })
    await Joi.validate({
      title,
      timeRange,
      productId
    }, schema)
    title = xss(title)
    timeRange = xss(timeRange)
    productId = xss(productId)

    await sequelize.transaction(t => {
      return DevelopPlan.create({
        title,
        timeRange
      }, {
        transaction: t
      }).then(dPlan => {
        if (!dPlan) throw new Error(`create DevelopPlan failed!`)
        result = dPlan
        return Release.findById(productId, {
          transaction: t
        }).then(prod => {
          if (!prod) throw new Error(`Product with id(${productId}) is  not exist !`)
          return prod.addDevelopPlan(dPlan, {
            transaction: t
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量删除产品研发计划
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductDevelopPlan = async (ctx, next) => {
  let {
    DevelopPlan
  } = ctx.models
  let result = {}
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
    result = await DevelopPlan.destroy({
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
 * 编辑产品研发计划
 * @param {*} ctx
 * @param {*} next
 */
const editProductDevelopPlan = async (ctx, next) => {
  let {
    Product,
    Release,
    DevelopPlan
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      title,
      timeRange,
      productId
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      title: Joi.string().required(),
      timeRange: Joi.string().required(),
      productId: Joi.string().required()
    })
    await Joi.validate({
      id,
      title,
      timeRange,
      productId
    }, schema)

    id = xss(id)
    title = xss(title)
    timeRange = xss(timeRange)
    productId = xss(productId)

    await sequelize.transaction(t => {
      return Release.findById(productId, {
        transaction: t
      }).then(prod => {
        if (!prod) throw new Error(`Product with id(${productId}) is not exist !`)
        return DevelopPlan.findById(id, {
          transaction: t
        }).then(dPlan => {
          if (!dPlan) throw new Error(`DevelopPlan with id(${id}) is not exist !`)
          return prod.addDevelopPlan(dPlan, {
            transaction: t
          }).then(() => {
            return DevelopPlan.update({
              title,
              timeRange
            }, {
              where: {
                id
              },
              transaction: t
            })
          })
        })
      })
    })

    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询产品研发计划
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductDevelopPlan = async (ctx, next) => {
  let {
    DevelopPlan
  } = ctx.models
  let result = {}
  try {
    let { productId } = ctx.params
    let {
      currentPage = 1,
      pageSize = 9999
    } = ctx.request.query
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      currentPage: Joi.number().required(),
      pageSize: Joi.number().required()
    })
    await Joi.validate({
      productId,
      currentPage,
      pageSize
    }, schema)
    productId = xss(productId)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    let model = await DevelopPlan.findAndCountAll({
      where: {
        product_id: productId
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'ASC']
      ]
    })
    /**
     * TODO: 算出开始时间和结束时间
     */
    let startTimes = []
    let endTimes = []
    startTimes = model.rows.map(item => {
      return item.timeRange.split('-')[0]
    })
    endTimes = model.rows.map(item => {
      return item.timeRange.split('-')[1]
    })
    startTimes = startTimes.sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime()
    })
    endTimes = endTimes.sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })
    result = {
      ...model,
      startTime: startTimes[0],
      endTime: endTimes[0]
    }
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询所有的研发计划
 * @param {*} ctx
 * @param {*} next
 */
const fetchAllProductDevelopPlan = async (ctx, next) => {
  let {
    DevelopPlan
  } = ctx.models
  let result = {}
  try {
    let {
      title,
      currentPage = 1,
      pageSize = 10
    } = ctx.request.query
    const schema = Joi.object().keys({
      title: Joi.string(),
      currentPage: Joi.number().required(),
      pageSize: Joi.number().required()
    })
    await Joi.validate({
      title,
      currentPage,
      pageSize
    }, schema)
    title = xss(title)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    let options = {
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    if (title) {
      options['where'] = {
        title: {
          [Sequelize.Op.like]: `%${title}%`
        }
      }
    }
    result = await DevelopPlan.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

const fetchProductDevelopPlanById = async (ctx, next) => {
  let {
    DevelopPlan
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
    result = await DevelopPlan.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增产品路线类型
 * @param {*} ctx
 * @param {*} next
 */
const addProductRouteType = async (ctx, next) => {
  let {
    ProductRouteType
  } = ctx.models
  let result = {}
  try {
    let {
      name,
      color
    } = ctx.request.body
    const schema = Joi.object().keys({
      name: Joi.string().required(),
      color: Joi.string().allow('')
    })
    await Joi.validate({
      name,
      color
    }, schema)
    name = xss(name)
    color = xss(color)
    result = await ProductRouteType.create({
      name,
      color
    })
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除产品路线类型
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductRouteType = async (ctx, next) => {
  let {
    ProductRouteType
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
    result = await ProductRouteType.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑产品路线类型
 * @param {*} ctx
 * @param {*} next
 */
const editProductRouteType = async (ctx, next) => {
  let {
    ProductRouteType
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      name,
      color
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      name: Joi.string().required(),
      color: Joi.string().required()
    })
    await Joi.validate({
      id,
      name,
      color
    }, schema)
    result = await ProductRouteType.update({
      name,
      color
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
 * 查询产品路线类型
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductRouteType = async (ctx, next) => {
  let {
    ProductRouteType
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      pageSize = 10,
      currentPage = 1
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    const schema = Joi.object().keys({
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required()
    })
    await Joi.validate({
      pageSize,
      currentPage
    }, schema)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    options = {
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    result = await ProductRouteType.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询产品路线类型
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductRouteTypeById = async (ctx, next) => {
  let {
    ProductRouteType
  } = ctx.models
  let result = {}
  try {
    let { id } = ctx.params
    const schema = Joi.object().keys({
      id: Joi.string().required()
    })
    await Joi.validate({
      id
    }, schema)
    id = xss(id)
    result = await ProductRouteType.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增产品路线
 * @param {*} ctx
 * @param {*} next
 */
const addProductRoute = async (ctx, next) => {
  let {
    ProductRoute,
    ProductRouteType,
    Product,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      productId,
      productRouteTypeId,
      year,
      type,
      date,
      title,
      content
    } = ctx.request.body
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      productRouteTypeId: Joi.string().required(),
      year: Joi.number().required(),
      type: Joi.number(),
      date: Joi.string().required(),
      title: Joi.string().required(),
      content: Joi.string().required()
    })
    await Joi.validate({
      productId,
      productRouteTypeId,
      year,
      type,
      date,
      title,
      content
    }, schema)
    productId = xss(productId)
    productRouteTypeId = xss(productRouteTypeId)
    year = xss(year)
    type = xss(type)
    date = xss(date)
    title = xss(title)
    content = xss(content)

    await sequelize.transaction(t => {
      return ProductRoute.create({
        year,
        type,
        date,
        title,
        content
      }, {
        transaction: t
      }).then(pRoute => {
        result = pRoute
        return ProductRouteType.findById(productRouteTypeId, {
          transaction: t
        }).then(prodRouteType => {
          if (!prodRouteType) throw new Error(`ProductRouteType with id(${productRouteTypeId}) is not exist !`)
          return prodRouteType.addProductRoutes(pRoute, {
            transaction: t
          }).then(() => {
            return Release.findById(productId, {
              transaction: t
            }).then(prod => {
              if (!prod) throw new Error(`Product with id(${productId}) is not exist !`)
              return prod.addProductRoute(pRoute, {
                transaction: t
              })
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除产品路线
 * @param {*} ctx
 * @param {*} next
 */
const deleteProductRoute = async (ctx, next) => {
  let {
    ProductRoute
  } = ctx.models
  let result = {}
  try {
    let { ids } = ctx.request.body
    const schema = Joi.object().keys({
      ids: Joi.array().min(1)
    })
    await Joi.validate({
      ids
    }, schema)
    result = await ProductRoute.destroy({
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
 * 编辑产品路线
 * @param {*} ctx
 * @param {*} next
 */
const editProductRoute = async (ctx, next) => {
  let {
    ProductRoute,
    ProductRouteType,
    Product,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      productId,
      productRouteTypeId,
      year,
      type,
      date,
      title,
      content
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      productId: Joi.string().required(),
      productRouteTypeId: Joi.string().required(),
      year: Joi.number(),
      type: Joi.number(),
      date: Joi.string(),
      title: Joi.string(),
      content: Joi.string()
    })
    await Joi.validate({
      id,
      productId,
      productRouteTypeId,
      year,
      type,
      date,
      title,
      content
    }, schema)
    id = xss(id)
    productId = xss(productId)
    productRouteTypeId = xss(productRouteTypeId)
    year = xss(year)
    type = xss(type)
    date = xss(date)
    title = xss(title)
    content = xss(content)

    let model = {}
    if (year) model['year'] = year
    if (type) model['type'] = type
    if (date) model['date'] = date
    if (title) model['title'] = title
    if (content) model['content'] = content

    await sequelize.transaction(t => {
      return ProductRouteType.findById(productRouteTypeId, {
        transaction: t
      }).then(productRouteType => {
        if (!productRouteType) throw new Error(`ProductRouteType with id(${productRouteTypeId}) is not exsit !`)
        return ProductRoute.findById(id, {
          transaction: t
        }).then(pRoute => {
          if (!pRoute) throw new Error(`ProductRoute with id(${id}) is not exist !`)
          return productRouteType.addProductRoute(pRoute, {
            transaction: t
          }).then(() => {
            return Release.findById(productId, {
              transaction: t
            }).then(prod => {
              if (!prod) throw new Error(`Product with id(${productId}) is not exist !`)
              return prod.addProductRoute(pRoute, {
                transaction: t
              }).then(() => {
                return ProductRoute.update(model, {
                  where: {
                    id
                  },
                  transaction: t
                })
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
 * 查询产品路线
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductRoute = async (ctx, next) => {
  let {
    ProductRoute,
    ProductRouteType
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      productId,
      pageSize = 10,
      currentPage = 1
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required()
    })
    await Joi.validate({
      productId,
      pageSize,
      currentPage
    }, schema)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    productId = xss(productId)
    options = {
      where: {
        product_id: productId
      },
      include: [{
        model: ProductRouteType
      }],
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ],
      distinct: true
    }
    result = await ProductRoute.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 按id查询产品路线
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductRouteById = async (ctx, next) => {
  let {
    ProductRoute,
    ProductRouteType
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
    result = await ProductRoute.findById(id, {
      include: [{
        model: ProductRouteType
      }]
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 按产品id查询产品路线
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductRouteByProductId = async (ctx, next) => {
  let {
    ProductRoute,
    ProductRouteType
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      productId
    } = ctx.params
    let {
      currentPage = 1,
      pageSize = 9999
    } = ctx.request.query
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      currentPage: Joi.number().integer().required(),
      pageSize: Joi.number().integer().required()
    })
    await Joi.validate({
      productId,
      currentPage,
      pageSize
    }, schema)
    productId = xss(productId)
    options = {
      where: {
        product_id: productId
      },
      include: [{
        model: ProductRouteType
      }],
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'ASC']
      ],
      distinct: true
    }
    result = await ProductRoute.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增交付计划
 * @param {*} ctx
 * @param {*} next
 */
const addDeliveryPlan = async (ctx, next) => {
  let {
    DeliveryPlan,
    Product,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      year,
      type,
      date,
      title,
      content,
      productId
    } = ctx.request.body
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      year: Joi.number().required(),
      type: Joi.number(),
      date: Joi.string().required(),
      title: Joi.string().required(),
      content: Joi.string().required()
    })
    await Joi.validate({
      productId,
      year,
      type,
      date,
      title,
      content
    }, schema)
    productId = xss(productId)
    year = xss(year)
    date = xss(date)
    title = xss(title)
    content = xss(content)

    await sequelize.transaction(t => {
      return DeliveryPlan.create({
        year,
        type,
        date,
        title,
        content
      }, {
        transaction: t
      }).then(dPlan => {
        result = dPlan
        return Release.findById(productId, {
          transaction: t
        }).then(prod => {
          if (!prod) throw new Error(`Product with id(${productId}) is not exist !`)
          return prod.addDeliveryPlan(dPlan, {
            transaction: t
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除交付计划
 * @param {*} ctx
 * @param {*} next
 */
const deleteDeliveryPlan = async (ctx, next) => {
  let {
    DeliveryPlan
  } = ctx.models
  let result = {}
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
    result = await DeliveryPlan.destroy({
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
 * 编辑交付计划
 * @param {*} ctx
 * @param {*} next
 */
const editDeliveryPlan = async (ctx, next) => {
  let {
    DeliveryPlan,
    Product,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      productId,
      year,
      type,
      date,
      title,
      content
    } = ctx.request.body
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      id: Joi.string().required(),
      year: Joi.number(),
      type: Joi.number(),
      date: Joi.string(),
      title: Joi.string(),
      content: Joi.string()
    })
    await Joi.validate({
      productId,
      id,
      year,
      type,
      date,
      title,
      content
    }, schema)
    id = xss(id)
    productId = xss(productId)
    year = xss(year)
    type = xss(type)
    date = xss(date)
    title = xss(title)
    content = xss(content)
    let model = {}
    if (year) model['year'] = year
    if (type) model['type'] = type
    if (date) model['date'] = date
    if (title) model['title'] = title
    if (content) model['content'] = content

    await sequelize.transaction(t => {
      return DeliveryPlan.findById(id, {
        transaction: t
      }).then(dPlan => {
        if (!dPlan) throw new Error(`DeliveryPlan with id(${id}) is not exist !`)
        return Release.findById(productId, {
          transaction: t
        }).then(prod => {
          if (!prod) throw new Error(`Product with id(${id}) is not exist !`)
          return prod.addDeliveryPlan(dPlan, {
            transaction: t
          }).then(() => {
            return DeliveryPlan.update(model, {
              where: {
                id
              },
              transaction: t
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
 * 查询交付计划
 * @param {*} ctx
 * @param {*} next
 */
const fetchDeliveryPlan = async (ctx, next) => {
  let {
    DeliveryPlan
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      productId,
      pageSize = 10,
      currentPage = 1
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required()
    })
    await Joi.validate({
      productId,
      pageSize,
      currentPage
    }, schema)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
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
    result = await DeliveryPlan.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 按id查询交付计划
 * @param {*} ctx
 * @param {*} next
 */
const fetchDeliveryPlanById = async (ctx, next) => {
  let {
    DeliveryPlan
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
    result = await DeliveryPlan.findById(id)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 按产品id查询交付计划
 * @param {*} ctx
 * @param {*} next
 */
const fetchDeliveryPlanByProductId = async (ctx, next) => {
  let {
    DeliveryPlan
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      productId
    } = ctx.params
    let {
      pageSize = 9999,
      currentPage = 1
    } = ctx.request.query
    const schema = Joi.object().keys({
      productId: Joi.string().required(),
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required()
    })
    await Joi.validate({
      productId,
      currentPage,
      pageSize
    }, schema)
    productId = xss(productId)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    options = {
      where: {
        product_id: productId
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'ASC']
      ]
    }
    result = await DeliveryPlan.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {

  }
}

/**
 * 根据产品负责人查询产品列表
 * @param {*} ctx
 * @param {*} next
 */
const fetchProductByUser = async (ctx, next) => {
  let {
    Product,
    User,
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      pageSize = 10,
      currentPage = 1,
      title,
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required(),
      title: Joi.string().allow(''),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      title,
      userCode,
      pageSize,
      currentPage
    }, schema)
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    title = xss(title)
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
          }],
          offset: (currentPage - 1) * pageSize,
          limit: pageSize,
          order: [
            ['created_at', 'DESC']
          ],
          transaction: t,
          distinct: true
        }
        if (title) {
          options['where']['title'] = {
            [Sequelize.Op.like]: `%${title}%`
          }
        }
        return Release.findAndCountAll(options).then(prod => {
          result = prod
        })
      })
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  /**
   * 产品
   */
  router.post('/product/add', upload.single('file'), addProduct)
  router.post('/product/delete', deleteProduct)
  router.post('/product/edit', editProduct)
  router.get('/product/fetch', fetchProduct)
  router.get('/product/fetch/:id', fetchProductById)
  router.get('/product/base/fetch/:id', fetchProductBaseById)

  /**
   * 根据产品负责人查询产品
   */
  router.get('/user/product/fetch', fetchProductByUser)

  /**
   * 直接插入数据
   */
  router.post('/product/insert', insertProduct)
  /**
   * 根据产品名模糊搜索产品
   */
  router.get('/product/search', searchProduct)
  /**
   * 产品审批
   */
  router.post('/product/approve', approveProject)
  /**
   * 产品收藏、关注
   * TODO
   */
  router.get('/product/star', productStar)

  /**
   * 获取用户关注的产品
   */
  router.get('/user/product/star', getProductStar)
  /**
   * 获取热门产品
   */
  router.get('/product/hot', getProductHot)
  /**
   * 产品类型
   */
  router.post('/productType/add', addProductType)
  /** 批量新增 */
  router.post('/productType/bulkAdd', bulkAddProductType)
  router.post('/productType/delete', deleteProductType)
  router.post('/productType/edit', editProductType)
  router.get('/productType/fetch', fetchProjectType)
  router.get('/productType/fetch/:id', fetchProjectTypeById)

  /**
   * 产品文档
   */
  router.post('/productDoc/add', upload.single('file'), addProductDoc)
  router.post('/productDoc/delete', deleteProductDoc)
  router.get('/productDoc/fetch', fetchProductDoc)
  router.get('/productDoc/fetch/:productId', fetchProductDocByProduct)
  router.post('/productDoc/insert', insertProductDoc)

  /**
   * 产品文档类型
   */
  router.post('/productDocType/add', addProductDocType)
  router.post('/productDocType/delete', deleteProductDocType)
  router.get('/productDocType/fetch', fetchProductDocType)
  router.get('/productDocType/fetch/:id', fetchProductDocTypeById)
  router.post('/productDocType/edit', editProductDocType)

  /**
   * 将产品文档和产品建立关联
   */
  router.post('/productDoc/join', joinProductDocWithProduct)
  /**
   * 产品文档下载计数
   */
  router.get('/productDoc/download', updateProductDocDownload)
  /**
   * 产品文档点赞
   */
  router.get('/productDoc/praise', updateProductDocPraise)
  /**
   * 产品文档收藏
   */
  router.get('/productDoc/collect', updateProductDocCollect)

  /**
   * 根据用户查询他收藏的文档
   */
  router.get('/user/collect/productDoc', fetchCollectProductDoc)

  /**
   * 根据用户查询他下载的文档
   */
  router.get('/user/download/productDoc', fetchDownloadProductDoc)

  /**
   * 根据用户查询他点赞的文档
   */
  router.get('/user/praise/productDoc', fetchPraiseProductDoc)

  /**
   * 产品案例
   */
  router.post('/productCase/add', upload.single('file'), addProductCase)
  router.post('/productCase/delete', deleteProductCase)
  router.get('/productCase/fetch', fetchProductCase)
  router.get('/productCase/product/fetch/:productId', fetchProductCaseByProduct)
  router.post('/productCase/edit', editProductCase)
  router.get('/productCase/fetch/:id', fetchProductCaseById)
  router.get('/productCase/new', fetchProductCaseNew)
  router.post('/productCase/insert', insertProductCase)

  /**
   * 批量审核
   */
  router.post('/productCase/approve', approveProductCase)
  /**
   * 将产品案例与产品建立关联
   */
  router.post('/productCase/join', joinProductCaseWithProduct)

  /**
   * 产品路线图
   */
  router.post('/product/productRoute/add', addProductRoute)
  router.post('/product/productRoute/delete', deleteProductRoute)
  router.post('/product/productRoute/edit', editProductRoute)
  router.get('/product/productRoute/fetch', fetchProductRoute)
  router.get('/product/productRoute/fetch/:id', fetchProductRouteById)
  /**
   * 根据产品id查询
   */
  router.get('/product/productRoute/product/fetch/:productId', fetchProductRouteByProductId)

  /**
   * 产品路线类型
   */
  router.post('/product/productRouteType/add', addProductRouteType)
  router.post('/product/productRouteType/delete', deleteProductRouteType)
  router.post('/product/productRouteType/edit', editProductRouteType)
  router.get('/product/productRouteType/fetch', fetchProductRouteType)
  router.get('/product/productRouteType/fetch/:id', fetchProductRouteTypeById)

  /**
   * 产品研发计划
   */
  router.post('/product/developPlan/add', addProductDevelopPlan)
  router.post('/product/developPlan/delete', deleteProductDevelopPlan)
  router.post('/product/developPlan/edit', editProductDevelopPlan)
  /**
   * 根据产品id
   */
  router.get('/product/developPlan/product/fetch/:productId', fetchProductDevelopPlan)
  router.get('/product/developPlan/fetch', fetchAllProductDevelopPlan)
  router.get('/product/developPlan/fetch/:id', fetchProductDevelopPlanById)

  /**
    * 产品交付计划
    */
  router.post('/product/deliveryPlan/add', addDeliveryPlan)
  router.post('/product/deliveryPlan/delete', deleteDeliveryPlan)
  router.post('/product/deliveryPlan/edit', editDeliveryPlan)
  router.get('/product/deliveryPlan/fetch', fetchDeliveryPlan)
  router.get('/product/deliveryPlan/fetch/:id', fetchDeliveryPlanById)
  /**
   * 根据产品id
   */
  router.get('/product/deliveryPlan/product/fetch/:productId', fetchDeliveryPlanByProductId)

  /**
   * 根据产品查询所属团队
   */
  router.get('/product/team/fetch/:id', fetchTeamByProductId)
}

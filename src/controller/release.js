/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 预发布相关路由
 * @Date: 2018-12-12 19:42:49
 * @LastEditTime: 2019-06-26 14:14:40
 */

const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')
const xss = require('xss')
const sequelize = require('../model/connect')

/**
 * 新增预发布产品
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
const addReleaseProduct = async (ctx, next) => {
  let {
    Release,
    ProductType,
    Team,
    User,
    ProductKind
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    title,
    desc,
    topImg = '',
    productTypes,
    teamId,
    userCode,
    productKind,
    forumPath
  } = ctx.req.body
  let forum_path = forumPath
  try {
    let schema = Joi.object().keys({
      title: Joi.string().required(),
      desc: Joi.string().required(),
      topImg: Joi.string().allow(''),
      productTypes: Joi.string().allow(''),
      productKind: Joi.string().required(),
      teamId: Joi.string().required(),
      userCode: Joi.string().required(),
      forum_path: Joi.string().allow('')
    })
    await Joi.validate({
      title,
      desc,
      topImg,
      productTypes,
      teamId,
      userCode,
      productKind,
      forum_path
    }, schema)

    // xss
    title = xss(title)
    desc = xss(desc)
    topImg = xss(topImg)
    teamId = xss(teamId)
    userCode = xss(userCode)
    productKind = xss(productKind)

    const file = ctx.req.file
    if (!file) throw new Error('未选择封面图片')
    uploadWithSftp = new UploadWithSftp(file, 1)
    topImg = await uploadWithSftp.uploadFileToFtp('product')

    /**
     * 使用事务处理新增和建立关联的问题
     */

    await sequelize.transaction(t => {
      return Release.findOrCreate({
        where: {
          title
        },
        defaults: {
          desc,
          topImg,
          forum_path
        },
        transaction: t
      }).then(([release, created]) => {
        if (!created) {
          throw new Error(`Product with title (${title}) is already exist!`)
        }
        result = release
        return Team.findById(teamId, {
          transaction: t
        }).then(team => {
          if (!team) throw new Error(`Team with id (${teamId}) is not exist !`)
          return team.addRelease(release, {
            transaction: t
          }).then(() => {
            return User.findOne({
              where: {
                username: userCode
              },
              transaction: t
            }).then(user => {
              if (!user) throw new Error(`User with username(${userCode}) is not exist !`)
              return user.addRelease(release, {
                transaction: t
              }).then(() => {
                return ProductKind.findById(productKind, {
                  transaction: t
                }).then(prodKind => {
                  if (!prodKind) throw new Error(`ProductKind with id(${productKind}) is not exist !`)
                  return prodKind.addRelease(release, {
                    transaction: t
                  }).then(() => {
                    if (productTypes && productTypes.length) {
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

                        })
                      })
                    }
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
 * 直接插入产品
 * @param {*} ctx
 * @param {*} next
 */
const insertReleaseProduct = async (ctx, next) => {
  let {
    Release,
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
    title = xss(title)
    desc = xss(desc)
    topImg = xss(topImg)
    teamId = xss(teamId)
    await Release.findOrCreate({
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
     * 建立链接
     */
    if (pt && pt.length) {
      result.addProductTypes(pt)
    }
    let tm = await Team.findById(teamId)
    if (tm) {
      tm.addReleases(result)
    }
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    throw new Error(error)
  }
}
/**
 * 删除预发布产品
 * @param {*} ctx
 * @param {*} next
 */
const deleteReleaseProduct = async (ctx, next) => {
  let {
    Release,
    Product
  } = ctx.models
  let result = {}
  // let options = {}
  // let prodOptions = {}
  // let product = {}
  try {
    let {
      ids
    } = ctx.request.body
    let schema = Joi.object().keys({
      ids: Joi.array().min(1)
    })
    await Joi.validate({
      ids
    }, schema)
    // if (ids && ids.length) {
    //   options = {
    //     where: {
    //       id: {
    //         [Sequelize.Op.in]: ids
    //       }
    //     },
    //     transaction: t
    //   }
    // }
    await sequelize.transaction(t => {
      return Release.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: ids
          }
        },
        transaction: t
      }).then(releases => {
        let productIds = releases.map(re => {
          return re.product_id
        })
        return Product.destroy({
          where: {
            id: {
              [Sequelize.Op.in]: productIds
            }
          },
          transaction: t
        }).then(() => {
          return Release.destroy({
            where: {
              id: {
                [Sequelize.Op.in]: ids
              }
            },
            transaction: t
          })
        })
      })
    })
    // result = await Release.destroy(options)
    // product = await Product.destroy(prodOptions)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}
/**
 * 修改预发布产品
 * @param {*} ctx
 * @param {*} next
 */
const editReleaseProduct = async (ctx, next) => {
  let {
    Release,
    ProductType,
    Team,
    ProductKind,
    User
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
      forumPath,
      productKind,
      userCode
    } = ctx.request.body
    let forum_path = forumPath || ''
    let schema = Joi.object().keys({
      id: Joi.string().required(),
      title: Joi.string().required(),
      desc: Joi.string().required(),
      topImg: Joi.string().allow(''),
      teamId: Joi.string().required(),
      productTypes: Joi.array().allow(''),
      forum_path: Joi.string().allow(''),
      productKind: Joi.string().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      id,
      title,
      desc,
      topImg,
      productTypes,
      teamId,
      forum_path,
      productKind,
      userCode
    }, schema)

    // xss
    id = xss(id)
    title = xss(title)
    desc = xss(desc)
    topImg = xss(topImg)
    teamId = xss(teamId)
    productKind = xss(productKind)
    userCode = xss(userCode)

    await sequelize.transaction(t => {
      return Release.update({
        title,
        desc,
        topImg,
        forum_path,
        status: 1
      }, {
        where: {
          id
        },
        transaction: t
      }).then(changed => {
        return Release.findById(id, {
          transaction: t
        }).then(release => {
          result = release
          return Team.findById(teamId, {
            transaction: t
          }).then(team => {
            if (!team) throw new Error(`Team with id (${teamId}) is not exist !`)
            return team.addRelease(release, {
              transaction: t
            }).then(() => {
              return User.findOne({
                where: {
                  username: userCode
                },
                transaction: t
              }).then(user => {
                if (!user) throw new Error(`User with username(${userCode}) is not exist !`)
                return ProductKind.findById(productKind, {
                  transaction: t
                }).then(prodKind => {
                  if (!prodKind) throw new Error(`ProductKind with id(${productKind}) is not exist !`)
                  return prodKind.addRelease(release, {
                    transaction: t
                  }).then(() => {
                    if (productTypes && productTypes.length) {
                      if (!Object.prototype.toString.call(productTypes) === '[object Array]') {
                        productTypes = productTypes.split(',')
                      }
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
                        })
                      })
                    }
                  })
                })
                /* return user.addRelease(release, {
                  transaction: t
                }).then(() => {
                  return ProductKind.findById(productKind, {
                    transaction: t
                  }).then(prodKind => {
                    if (!prodKind) throw new Error(`ProductKind with id(${productKind}) is not exist !`)
                    return prodKind.addRelease(release, {
                      transaction: t
                    }).then(() => {
                      if (productTypes && productTypes.length) {
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
                          })
                        })
                      }
                    })
                  })
                }) */
              })
            })
          })
          /* return ProductType.findAll({
            where: {
              id: {
                [Sequelize.Op.in]: productTypes
              }
            },
            transaction: t
          }).then(prodTypes => {
            if (!prodTypes || !prodTypes.length || prodTypes.length !== productTypes.length) throw new Error(`ProductType with id(${productTypes.join(',')}) is not exist!`)
            return release.setProductTypes(prodTypes, {
              transaction: t
            }).then(() => {
              return Team.findById(teamId, {
                transaction: t
              }).then(team => {
                if (!team) throw new Error(`Team with id(${teamId}) is not exist !`)
                return team.addRelease(release, {
                  transaction: t
                })
              }).then(() => {
                return ProductKind.findById(productKind, {
                  transaction: t
                }).then(prodKind => {
                  if (!prodKind) throw new Error(`ProductKind With id (${productKind}) is not exist!`)
                  return prodKind.addRelease(release, {
                    transaction: t
                  })
                })
              })
            })
          }) */
        })
      })
    })
    ctx.body = FormatResponse.success(result, '编辑成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询预发布产品
 * @param {*} ctx
 * @param {*} next
 */
const fetchReleaseProduct = async (ctx, next) => {
  let {
    Release,
    Team,
    TeamMember,
    TeamRole,
    ProductKind
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
    // xss
    title = xss(title)

    options = {
      where: {},
      include: [{
        model: Team,
        include: [{
          model: TeamMember,
          include: [TeamRole]
        }]
      }, {
        model: ProductKind
      }],
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ],
      distinct: true
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
    }
    result = await Release.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 按id查询详情
 * @param {*} ctx
 * @param {*} next
 */
const fetchReleaseProductById = async (ctx, next) => {
  let {
    Release,
    ProductType,
    ProductDoc,
    ProductCase,
    ProductRoute,
    DevelopPlan,
    DeliveryPlan,
    ProductVideo,
    Team,
    TeamMember,
    ProductRouteType,
    ProductDocType,
    ProductKind
  } = ctx.models
  let result = {}
  // let options = {}
  try {
    let {
      id
    } = ctx.params
    const schema = Joi.object().keys({
      id: Joi.string().required()
    })
    // xss
    id = xss(id)

    await Joi.validate({
      id
    }, schema)

    let release = await Release.findById(id, {
      include: [{
        model: ProductType,
        through: {
          attributes: []
        }
      }, {
        model: ProductKind
      }]
    })
    let productDocs = await ProductDoc.findAll({
      where: {
        release_id: id
      },
      include: [{
        model: ProductDocType
      }],
      row: true
    })
    let productCases = await ProductCase.findAll({
      where: {
        release_id: id
      },
      row: true
    })
    let productRoutes = await ProductRoute.findAll({
      where: {
        release_id: id
      },
      include: [{
        model: ProductRouteType
      }],
      row: true
    })
    let developPlans = await DevelopPlan.findAll({
      where: {
        release_id: id
      },
      row: true
    })
    let deliveryPlans = await DeliveryPlan.findAll({
      where: {
        release_id: id
      },
      row: true
    })
    let productVideos = await ProductVideo.findAll({
      where: {
        release_id: id
      },
      row: true
    })
    release = release.get({
      plain: true
    })
    let team = await Release.findById(id, {
      include: {
        model: Team,
        include: [{
          model: TeamMember
        }]
      }
    })
    team = team.get({
      plain: true
    })
    result = {
      ...release,
      team: team.team,
      productDocs,
      productCases,
      productRoutes,
      developPlans,
      deliveryPlans,
      productVideos
    }
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 点击发布按钮， 预发布
 * 1. 没有保存过，不存在id，先新建再预存，预存操作为在product表中新建一条数据
 * 2. 有保存过， 存在id， 先更新再预存， 预存操作为在product表中新建一条数据
 * @param {*} ctx
 * @param {*} next
 * 未发布、审核中 、审核通过、审核不通过
 * 产品状态包含 新建、发布、编辑、再发布，以下情况
 * 1. 直接发布：id 不存在 直接点击发布： 先新建 再将状态改为审核中
 * 2. 已新建再点击发布：将状态改成审核中
 * 3. 审核不通过在编辑发布：将状态改成审核中
 * 4. 审核通过再点击发布： 将状态改成审核中
 */
const saveReleaseProduct = async (ctx, next) => {
  let {
    Release
  } = ctx.models
  let result = {}
  try {
    let {
      id
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required('')
    })
    id = xss(id)
    await Joi.validate({
      id
    }, schema)
    result = await Release.update({
      status: 4
    }, {
      where: {
        id
      }
    })
    ctx.body = FormatResponse.success(result, '提交审核成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 审核产品
 * 1. 审核不通过 将状态改成
 * 2. 审核通过 （判断该数据中是否含有product_id）
 *  2.1 第一次审核通过，将数据复制一份，并新建一条产品（Product 表）
 *  2.2 第二次审核通过，将当前数据同步到产品（Product表）中
 * @param {*} ctx
 * @param {*} next
 */
const approveRelease = async (ctx, next) => {
  let {
    Release,
    Product,
    ProductType,
    ProductDoc,
    ProductCase,
    ProductRoute,
    DevelopPlan,
    DeliveryPlan,
    ProductVideo,
    Team,
    ProductKind,
    ProductDocType,
    ProductRouteType,
    TeamMember
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      status
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      status: Joi.number().integer().required()
    })
    await Joi.validate({
      id,
      status
    }, schema)
    id = xss(id)
    status = xss(status)
    status = parseInt(status)
    /**
     * 审核通过
     */
    if (status) {
      /**
       * 查出产品
       */
      let release = await Release.findById(id, {
        include: [{
          model: ProductType,
          through: {
            attributes: []
          }
        }, {
          model: ProductKind
        }]
      })
      let productDocs = await ProductDoc.findAll({
        where: {
          release_id: id
        },
        include: [{
          model: ProductDocType
        }]
      })
      let productCases = await ProductCase.findAll({
        where: {
          release_id: id
        }
      })
      let productRoutes = await ProductRoute.findAll({
        where: {
          release_id: id
        },
        include: [{
          model: ProductRouteType
        }]
      })
      let developPlans = await DevelopPlan.findAll({
        where: {
          release_id: id
        }
      })
      let deliveryPlans = await DeliveryPlan.findAll({
        where: {
          release_id: id
        }
      })
      let productVideos = await ProductVideo.findAll({
        where: {
          release_id: id
        }
      })
      let team = await Release.findById(id, {
        include: {
          model: Team,
          include: [{
            model: TeamMember
          }]
        }
      })
      team = team.team
      /**
       * 再次审核通过，同步相关数据
       */
      let productTypes = release.productTypes
      let productKind = release.productKind
      // 再次审核通过, 不需要再新建，只需要同步信息
      if (release.product_id) {
        await sequelize.transaction(t => {
          return Product.update({
            logo: release.logo,
            title: release.title,
            desc: release.desc,
            topImg: release.topImg,
            forum_path: release.forum_path,
            isHot: release.isHot,
            inMenu: release.inMenu
          }, {
            where: {
              id: release.product_id
            },
            transaction: t
          }).then(() => {
            return Product.findById(release.product_id, {
              transaction: t
            }).then(product => {
              if (!product) throw new Error(`Product with id(${release.product_id}) is not exist !`)
              result = product
              return product.setProductTypes(productTypes, {
                transaction: t
              }).then(() => {
                return product.setProductDocs(productDocs, {
                  transaction: t
                }).then(() => {
                  return product.setProductCases(productCases, {
                    transaction: t
                  })
                }).then(() => {
                  return product.setProductRoutes(productRoutes, {
                    transaction: t
                  })
                }).then(() => {
                  return product.setDevelopPlans(developPlans, {
                    transaction: t
                  })
                }).then(() => {
                  return product.setDeliveryPlans(deliveryPlans, {
                    transaction: t
                  })
                }).then(() => {
                  return product.setProductVideos(productVideos, {
                    transaction: t
                  }).then(() => {
                    return team.addProduct(product, {
                      transaction: t
                    }).then(() => {
                      return productKind.addProduct(product, {
                        transaction: t
                      }).then(() => {
                        return Release.update({
                          status: 2
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
              })
            })
          })
        })
      } else {
        // 初次审核通过， 先新建，再同步信息
        await sequelize.transaction(t => {
          return Product.findOrCreate({
            where: {
              title: release.title
            },
            defaults: {
              logo: release.logo,
              desc: release.desc,
              topImg: release.topImg,
              forum_path: release.forum_path,
              isHot: release.isHot,
              inMenu: release.inMenu,
              user_id: release.user_id
            },
            transaction: t
          }).then(([product, created]) => {
            if (!created) throw new Error(`Product with title(${release.title}) is already exist!`)
            result = product
            return product.addProductTypes(productTypes, {
              transaction: t
            }).then(() => {
              return product.addProductDocs(productDocs, {
                transaction: t
              }).then(() => {
                return product.addProductCases(productCases, {
                  transaction: t
                })
              }).then(() => {
                return product.addProductRoutes(productRoutes, {
                  transaction: t
                })
              }).then(() => {
                return product.addDevelopPlans(developPlans, {
                  transaction: t
                })
              }).then(() => {
                return product.addDeliveryPlans(deliveryPlans, {
                  transaction: t
                })
              }).then(() => {
                return product.addProductVideos(productVideos, {
                  transaction: t
                })
              }).then(() => {
                return team.addProducts(product, {
                  transaction: t
                })
              }).then(() => {
                return product.addRelease(release, {
                  transaction: t
                }).then(() => {
                  return productKind.addProduct(product, {
                    transaction: t
                  }).then(() => {
                    return Release.update({
                      status: 2
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
          })
        })
      }
    } else {
      result = await Release.update({
        status: 3
      }, {
        where: {
          id
        }
      })
    }
    ctx.body = FormatResponse.success(result, '审核完成')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据产品负责人查询产品
 * @param {*} ctx
 * @param {*} next
 */
const fetchReleaseByUser = async (ctx, next) => {
  let {
    Release,
    User,
    Team
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
          }, {
            model: Team
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

/**
 * 根据产品负责人查询已审核的产品
 * @param {*} ctx
 * @param {*} next
 */
const fetchReleaseProductByUser = async (ctx, next) => {
  let {
    Release,
    User,
    Product
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
          offset: (currentPage - 1) * pageSize,
          limit: pageSize,
          order: [
            ['created_at', 'DESC']
          ],
          transaction: t
        }
        if (title) {
          options['where']['title'] = {
            [Sequelize.Op.like]: `%${title}%`
          }
        }
        return Release.findAndCountAll(options).then(prod => {
          let prodIds = prod.rows && prod.rows.map(item => {
            return item.product_id
          })
          return Product.findAll({
            where: {
              id: {
                [Sequelize.Op.in]: prodIds
              }
            },
            order: [
              ['created_at', 'DESC']
            ],
            transaction: t
          }).then(products => {
            result = {
              count: prod.count,
              rows: products
            }
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

module.exports = router => {
  router.post('/release/add', upload.single('file'), addReleaseProduct)
  router.post('/release/delete', deleteReleaseProduct)
  router.post('/release/edit', editReleaseProduct)
  router.get('/release/fetch', fetchReleaseProduct)
  router.get('/release/fetch/:id', fetchReleaseProductById)

  /**
   * 直接插数据
   */
  router.post('/release/insert', insertReleaseProduct)

  /**
   * 点击发布按钮，预发布
   */
  router.post('/release/save', saveReleaseProduct)

  /**
   * 审核操作
   */
  router.post('/release/approve', approveRelease)

  /**
   * 根据产品负责人查询产品
   */
  router.get('/user/release/fetch', fetchReleaseByUser)

  /**
   * 根据产品负责人查询已审核的产品
   */
  router.get('/user/release/product/fetch', fetchReleaseProductByUser)
}

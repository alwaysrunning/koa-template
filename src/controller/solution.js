/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 规划方案
 * @Date: 2018-12-27 15:01:16
 * @LastEditTime: 2019-03-26 15:19:41
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
 * @apiDefine SolutionTypeModel
 * @apiSuccess {Number} code 返回的code码，默认为0
 * @apiSuccess {String} message 返回的信息
 * @apiSuccess {object} data 返回的数据
 * {
 * id: 唯一标志,
 * title: 目录名,
 * imgUrl: 目录缩略图,
 * follow: 收藏的人数,
 * created_at: 创建时间,
 * updated_at: 更新时间
 * }
 */

/**
 * 新增规划方案类型
 * @param {*} ctx
 * @param {*} next
 * @api {POST} /solutionType/add 新增规划方案目录
 * @apiDescription 新增规划方案目录
 * @apiName addSolutionType
 * @apiGroup solutionType
 * @apiVersion 1.0.0
 * @apiParam {String} title 目录名
 * @apiParam {String} imgUrl 目录的缩略图，通过上传文件自动生成，
 * @apiPermission admin(管理员)
 * @apiUse SolutionTypeModel
 * @apiSuccessExample {json} 返回数据
 * {
 *  code: 0,
 *  message: '新建成功',
 *  data: {
 *    id: 'x',
 *    title: 'x',
 *    imgUrl: 'x.png',
 *    follow: 0,
 *    created_at: 'x',
 *    updated_at: 'x'
 *  }
 * }
 * @apiErrorExample {json} 错误返回
 * {
 *  code: -1,
 *  message: '具体的错误信息',
 *  data: {}
 * }
 */
const addSolutionType = async (ctx, next) => {
  let {
    SolutionType
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let imgUrl = null
  try {
    let {
      title
    } = ctx.req.body
    const schema = Joi.object().keys({
      title: Joi.string().required()
    })
    title = xss(title)
    await Joi.validate({
      title
    }, schema)
    const file = ctx.req.file
    if (!file) throw new Error(`未选择相关的封面图片`)
    uploadWithSftp = new UploadWithSftp(file, 1)
    imgUrl = await uploadWithSftp.uploadFileToFtp('product')
    title = xss(title)
    await SolutionType.findOrCreate({
      where: {
        title
      },
      defaults: {
        imgUrl
      }
    }).spread((solutionType, created) => {
      if (!created) throw new Error(`SolutionType with title(${title}) is already exist!`)
      result = solutionType
    })
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    if (uploadWithSftp && imgUrl) {
      uploadWithSftp.removeFile(imgUrl, 'product')
    }
    throw new Error(error)
  }
}

/**
 * 批量删除规划方案类型
 * @param {*} ctx
 * @param {*} next
 */
const deleteSolutionType = async (ctx, next) => {
  let {
    SolutionType
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
    result = await SolutionType.destroy({
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
 * 编辑规划方案类型
 * @param {*} ctx
 * @param {*} next
 */
const editSolutionType = async (ctx, next) => {
  let {
    SolutionType
  } = ctx.models
  let result = {}
  try {
    let {
      id, title, imgUrl
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      title: Joi.string().required(),
      imgUrl: Joi.string().required()
    })
    await Joi.validate({
      id, title, imgUrl
    }, schema)
    id = xss(id)
    result = await SolutionType.update({
      title, imgUrl
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
 * 查询规划方案类型
 * @param {*} ctx
 * @param {*} next
 */
const fetchSolutionType = async (ctx, next) => {
  let {
    SolutionType,
    UserInfo
  } = ctx.models
  let result = {}
  let options = {}
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
      pageSize,
      currentPage,
      title,
      userCode
    }, schema)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
    title = xss(title)
    let username = xss(userCode)
    options = {
      where: {},
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      include: [{
        model: UserInfo,
        attributes: ['username', 'mail'],
        through: {
          where: {
            solution_type_id: Sequelize.col('id')
          },
          order: [
            ['created_at', 'DESC']
          ]
        }
      }],
      order: [
        ['created_at', 'DESC']
      ],
      distinct: true,
      row: true
    }
    if (title) {
      options['where']['title'] = {
        [Sequelize.Op.like]: `%${title}%`
      }
    }
    result = await SolutionType.findAndCountAll(options)
    result.rows = result.rows.map(item => {
      item = item.get({
        plain: true
      })
      let index = item.userInfos.findIndex(user => {
        return user.username === username
      })
      return {
        ...item,
        isCollect: index !== -1
      }
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
const fetchSolutionTypeById = async (ctx, next) => {
  let {
    SolutionType,
    UserInfo
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { id } = ctx.params
    let { userCode } = ctx.request.query
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      userCode: Joi.string().required()
    })

    await Joi.validate({
      id,
      userCode
    }, schema)
    id = xss(id)
    let username = xss(userCode)
    options = {
      include: [{
        model: UserInfo,
        attributes: ['username', 'mail'],
        through: {
          where: {
            solution_type_id: id,
            username
          }
        }
      }]
    }
    result = await SolutionType.findById(id, options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 收藏 / 取消收藏规划方案
 * @param {*} ctx
 * @param {*} next
 */
const collectSolutionType = async (ctx, next) => {
  let {
    SolutionType,
    UserInfo
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      userCode,
      status
    } = ctx.request.query
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      userCode: Joi.string().required(),
      status: Joi.number().integer().required()
    })
    await Joi.validate({
      id,
      userCode,
      status
    }, schema)
    status = parseInt(status)
    id = xss(id)
    let username = xss(userCode)
    await sequelize.transaction(t => {
      return SolutionType.findById(id, {
        transaction: t
      }).then(solutionType => {
        if (!solutionType) throw new Error(`solutionType with id(${id}) is not exist!`)
        result = solutionType
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          let setSolutionUser = status ? user.addSolutionType(solutionType, {
            through: {
              username
            },
            transaction: t
          }) : user.removeSolutionType(solutionType, {
            transaction: t
          })
          return setSolutionUser.then(() => {
            return SolutionType.update({
              follow: status ? ++solutionType.follow : (--solutionType.follow < 0 ? 0 : solutionType.follow)
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
    ctx.body = FormatResponse.success(result, `收藏${status ? '成功' : '失败'}`)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询我的收藏 规划方案类型
 * @param {*} ctx
 * @param {*} next
 */
const fetchCollectionSolutionType = async (ctx, next) => {
  let {
    SolutionType,
    SolutionTypeFollow
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      userCode,
      currentPage = 1,
      pageSize = 10
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required(),
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
    await sequelize.transaction(t => {
      options = {
        where: {
          username
        },
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        order: [
          ['created_at', 'DESC']
        ],
        transaction: t
      }
      return SolutionTypeFollow.findAndCountAll(options).then(follows => {
        let solutionTypeIds = follows.rows.map(item => {
          return item.solution_type_id
        })
        return SolutionType.findAll({
          where: {
            id: {
              [Sequelize.Op.in]: solutionTypeIds
            }
          },
          order: [
            ['created_at', 'DESC']
          ],
          transaction: t
        }).then((solutionTypes) => {
          result = {
            count: follows.count,
            rows: solutionTypes
          }
        })
      })
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增规划方案
 * @param {*} ctx
 * @param {*} next
 */
const addSolution = async (ctx, next) => {
  let {
    ReleaseSolution,
    SolutionType,
    Team,
    User
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let topImg = null
  try {
    let {
      title,
      desc,
      solutionTypeId,
      teamId,
      userCode
    } = ctx.req.body
    const schema = Joi.object().keys({
      title: Joi.string().required(),
      desc: Joi.string().required(),
      solutionTypeId: Joi.string().required(),
      teamId: Joi.string().allow(''),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      title,
      desc,
      solutionTypeId,
      teamId,
      userCode
    }, schema)
    title = xss(title)
    desc = xss(desc)
    solutionTypeId = xss(solutionTypeId)
    teamId = xss(teamId)
    userCode = xss(userCode)
    const file = ctx.req.file
    if (!file) throw new Error(`未选择相关的封面图片`)
    uploadWithSftp = new UploadWithSftp(file, 1)
    topImg = await uploadWithSftp.uploadFileToFtp('product')

    if (teamId) {
      await sequelize.transaction(t => {
        return ReleaseSolution.findOrCreate({
          where: {
            title
          },
          defaults: {
            desc,
            topImg
          },
          transaction: t
        }).then(([solution, created]) => {
          if (!created) throw new Error(`Solution with title(${title}) is already exist !`)
          result = solution
          return SolutionType.findById(solutionTypeId, {
            transaction: t
          }).then(solutionType => {
            if (!solutionType) throw new Error(`SolutionType with id (${solutionTypeId}) is not exist !`)
            return solutionType.addReleaseSolution(solution, {
              transaction: t
            })
          }).then(() => {
            return Team.findById(teamId, {
              transaction: t
            }).then(team => {
              if (!team) throw new Error(`Team with id(${teamId}) is not exist !`)
              return team.addReleaseSolution(solution, {
                transaction: t
              }).then(() => {
                return User.findOne({
                  where: {
                    username: userCode
                  },
                  transaction: t
                }).then(user => {
                  if (!user) throw new Error(`User with username(${userCode}) is not exist !`)
                  return user.addReleaseSolution(solution, {
                    transaction: t
                  })
                })
              })
            })
          })
        })
      })
    } else {
      await sequelize.transaction(t => {
        return ReleaseSolution.findOrCreate({
          where: {
            title
          },
          defaults: {
            desc,
            topImg
          },
          transaction: t
        }).then(([solution, created]) => {
          if (!created) throw new Error(`Solution with title(${title}) is already exist !`)
          result = solution
          return SolutionType.findById(solutionTypeId, {
            transaction: t
          }).then(solutionType => {
            if (!solutionType) throw new Error(`SolutionType with id (${solutionTypeId}) is not exist !`)
            return solutionType.addReleaseSolution(solution, {
              transaction: t
            }).then(() => {
              return User.findOne({
                where: {
                  username: userCode
                },
                transaction: t
              }).then(user => {
                if (!user) throw new Error(`User with username(${userCode}) is not exist !`)
                return user.addReleaseSolution(solution, {
                  transaction: t
                })
              })
            })
          })
        })
      })
    }
    ctx.body = FormatResponse.success(result, '新建成功')
  } catch (error) {
    if (uploadWithSftp && topImg) {
      uploadWithSftp.removeFile(topImg, 'product')
    }
    throw new Error(error)
  }
}

/**
 * 批量删除
 * @param {*} ctx
 * @param {*} next
 */
const deleteSolution = async (ctx, next) => {
  let {
    ReleaseSolution,
    Solution
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
    // result = await ReleaseSolution.destroy({
    //   where: {
    //     id: {
    //       [Sequelize.Op.in]: ids
    //     }
    //   }
    // })
    await sequelize.transaction(t => {
      return ReleaseSolution.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: ids
          }
        },
        transaction: t
      }).then(releases => {
        let solutionIds = releases.map(re => {
          return re.solution_id
        })
        return Solution.destroy({
          where: {
            id: {
              [Sequelize.Op.in]: solutionIds
            }
          },
          transaction: t
        }).then(() => {
          return ReleaseSolution.destroy({
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
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑规划方案
 * @param {*} ctx
 * @param {*} next
 */
const editSolution = async (ctx, next) => {
  let {
    ReleaseSolution,
    SolutionType,
    Team
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      topImg,
      title,
      desc,
      solutionTypeId,
      teamId
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      solutionTypeId: Joi.string().required(),
      teamId: Joi.string().required(),
      topImg: Joi.string().required(),
      title: Joi.string().required(),
      desc: Joi.string().required()
    })
    await Joi.validate({
      id,
      topImg,
      title,
      desc,
      solutionTypeId,
      teamId
    }, schema)
    topImg = xss(topImg)
    title = xss(title)
    desc = xss(desc)
    teamId = xss(teamId)
    solutionTypeId = xss(solutionTypeId)
    await sequelize.transaction(t => {
      return ReleaseSolution.findById(id, {
        transaction: t
      }).then(solution => {
        if (!solution) throw new Error(`Solution with id ${id} is not exist!`)
        result = solution
        return SolutionType.findById(solutionTypeId, {
          transaction: t
        }).then(soluteType => {
          if (!soluteType) throw new Error(`SolutionType with id ${solutionTypeId} is not exist! `)
          return soluteType.addReleaseSolution(solution, {
            transaction: t
          }).then(() => {
            return Team.findById(teamId, {
              transaction: t
            }).then(team => {
              if (!team) throw new Error(`Team with id ${teamId} is not exist! `)
              return team.addReleaseSolution(solution, {
                transaction: t
              }).then(() => {
                return ReleaseSolution.update({
                  topImg,
                  title,
                  desc,
                  status: 1
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
    ctx.body = FormatResponse.success(result, '修改成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询规划方案
 * @param {*} ctx
 * @param {*} next
 */
const fetchSolution = async (ctx, next) => {
  let {
    ReleaseSolution,
    Team,
    TeamMember
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
    result = await ReleaseSolution.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询详情
 * @param {*} ctx
 * @param {*} next
 */
const fetchSolutionById = async (ctx, next) => {
  let {
    ReleaseSolution,
    SolutionType,
    Team,
    SolutionDoc,
    SolutionDocType
  } = ctx.models
  let result = {}
  try {
    let { id } = ctx.params
    let {
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      id,
      userCode
    }, schema)
    id = xss(id)
    let options = {
      include: [{
        model: SolutionType
      }, {
        model: Team
      }, {
        model: SolutionDoc,
        include: [{
          model: SolutionDocType
        }]
      }]
    }
    result = await ReleaseSolution.findById(id, options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询已审核解决方案详情
 * @param {*} ctx
 * @param {*} next
 */
const fetchApproveSolutionById = async (ctx, next) => {
  let {
    Solution,
    SolutionType,
    Team,
    TeamMember,
    SolutionDoc
  } = ctx.models
  let result = {}
  try {
    let {
      id
    } = ctx.params
    let {
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      id,
      userCode
    }, schema)
    id = xss(id)
    let username = xss(userCode)
    let options = {
      include: [{
        model: SolutionType
      }, {
        model: Team,
        include: [{
          model: TeamMember
        }]
      }, {
        model: SolutionDoc
      }]
    }
    result = await Solution.findById(id, options)
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
 * 根据规划方案类型查询规划方案
 * @param {*} ctx
 * @param {*} next
 */
const fetchSolutionBySolutionType = async (ctx, next) => {
  let {
    Solution,
    Team,
    TeamMember,
    UserInfo
  } = ctx.models
  let result = {}
  try {
    let {
      pageSize = 999,
      currentPage = 1,
      userCode
    } = ctx.request.query
    let { solutionTypeId } = ctx.params
    const schema = Joi.object().keys({
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required(),
      solutionTypeId: Joi.string().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      pageSize,
      currentPage,
      solutionTypeId,
      userCode
    }, schema)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
    solutionTypeId = xss(solutionTypeId)
    let username = xss(userCode)
    let options = {
      where: {
        solution_type_id: solutionTypeId
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
            solution_type_id: Sequelize.col('id')
          },
          order: [
            ['created_at', 'DESC']
          ]
        }
      }],
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ],
      distinct: true
    }
    result = await Solution.findAndCountAll(options)
    result.rows = result.rows.map(item => {
      item = item.get({
        plain: true
      })
      let index = item.userInfos.findIndex(user => {
        return user.username === username
      })
      return {
        ...item,
        isCollect: index !== -1
      }
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 收藏规划方案
 * @param {*} ctx
 * @param {*} next
 */
const collectSolution = async (ctx, next) => {
  let {
    Solution,
    UserInfo
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      userCode,
      status
    } = ctx.request.query
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      userCode: Joi.string().required(),
      status: Joi.number().integer().required()
    })
    await Joi.validate({
      id,
      userCode,
      status
    }, schema)
    status = parseInt(status)
    id = xss(id)
    let username = xss(userCode)
    await sequelize.transaction(t => {
      return Solution.findById(id, {
        transaction: t
      }).then(solution => {
        if (!solution) throw new Error(`solution with id(${id}) is not exist!`)
        result = solution
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          let setSolutionUser = status ? user.addSolution(solution, {
            through: {
              username
            },
            transaction: t
          }) : user.removeSolution(solution, {
            transaction: t
          })
          return setSolutionUser.then(() => {
            return Solution.update({
              follow: status ? ++solution.follow : (--solution.follow < 0 ? 0 : solution.follow)
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
    ctx.body = FormatResponse.success(result, `收藏${status ? '成功' : '失败'}`)
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据规划方案查询拥有规划方案的团队
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamWithSolution = async (ctx, next) => {
  let {
    Team,
    TeamMember,
    TeamRole
  } = ctx.models
  let result = {}
  try {
    let {
      pageSize = 10,
      currentPage = 1,
      from
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required(),
      from: Joi.string().allow('')
    })
    await Joi.validate({
      pageSize,
      currentPage,
      from
    }, schema)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
    let options = {
      where: {
        has_solution: true
      },
      include: [{
        model: TeamMember,
        include: [TeamRole]
      }],
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'ASC']
      ],
      distinct: true
    }
    if (from && from === 'web') {
      options['where'] = {
        id: {
          [Sequelize.Op.ne]: '24fc49b0-0e5a-11e9-adb1-232b17cb1766'
        }
      }
    }
    result = await Team.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询我的收藏 规划方案
 * @param {*} ctx
 * @param {*} next
 */
const fetchCollectionSolution = async (ctx, next) => {
  let {
    Solution,
    SolutionFollow
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      userCode,
      currentPage = 1,
      pageSize = 10
    } = ctx.request.query
    const schema = Joi.object().keys({
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required(),
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
    await sequelize.transaction(t => {
      options = {
        where: {
          username
        },
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        order: [
          ['created_at', 'DESC']
        ],
        transaction: t
      }
      return SolutionFollow.findAndCountAll(options).then(follows => {
        let solutionIds = follows.rows.map(item => {
          return item.solution_type_id
        })
        return Solution.findAll({
          where: {
            id: {
              [Sequelize.Op.in]: solutionIds
            }
          },
          order: [
            ['created_at', 'DESC']
          ],
          transaction: t
        }).then((solutions) => {
          result = {
            count: follows.count,
            rows: solutions
          }
        })
      })
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增产品文档类型
 * @param {*} ctx
 * @param {*} next
 */
const addSolutionDocType = async (ctx, next) => {
  let {
    SolutionDocType
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
    result = await SolutionDocType.findOrCreate({
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
const deleteSolutionDocType = async (ctx, next) => {
  let {
    SolutionDocType
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
    result = await SolutionDocType.destroy({
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
const fetchSolutionDocType = async (ctx, next) => {
  let {
    SolutionDocType
  } = ctx.models
  let result = {}
  try {
    result = await SolutionDocType.findAll({
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
const fetchSolutionDocTypeById = async (ctx, next) => {
  let {
    SolutionDocType
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
    result = await SolutionDocType.findById(id)
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
const editSolutionDocType = async (ctx, next) => {
  let {
    SolutionDocType
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
    result = await SolutionDocType.update({
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
 * 新增规划方案类型
 * @param {*} ctx
 * @param {*} next
 */
const addSolutionDoc = async (ctx, next) => {
  let {
    SolutionDoc,
    ReleaseSolution,
    SolutionDocType
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
      solutionId,
      title,
      solutionDocType
    } = ctx.req.body
    const schema = Joi.object().keys({
      solutionId: Joi.string().required(),
      title: Joi.string().allow(''),
      solutionDocType: Joi.string().required()
    })
    await Joi.validate({
      solutionId,
      title,
      solutionDocType
    }, schema)
    solutionId = xss(solutionId)
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
      return SolutionDoc.create({
        downLoadUrl,
        fileType,
        originalName,
        size,
        title
      }, {
        transaction: t
      }).then(solutionDoc => {
        result = solutionDoc
        return SolutionDocType.findById(solutionDocType, {
          transaction: t
        }).then(soluteDocType => {
          if (!soluteDocType) throw new Error(`SolutionDocType with id(${solutionDocType}) is not exist !`)
          return soluteDocType.addSolutionDocs(solutionDoc, {
            transaction: t
          }).then(() => {
            return ReleaseSolution.findById(solutionId, {
              transaction: t
            }).then(solution => {
              if (!solution) throw new Error(`Solution with id(${solutionId}) is not exist !`)
              return solution.addSolutionDocs(solutionDoc, {
                transaction: t
              }).then(() => {
                return SolutionDoc.findById(solutionDoc.id, {
                  include: [{
                    model: SolutionDocType
                  }],
                  transaction: t
                }).then(soluDoc => {
                  if (!soluDoc) throw new Error(`SolutionDoc with id (${solutionDoc.id}) is not exist !`)
                  result = soluDoc
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
 * 删除规划方案文档
 * @param {*} ctx
 * @param {*} next
 */
const deleteSolutionDoc = async (ctx, next) => {
  let {
    SolutionDoc
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
    result = await SolutionDoc.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询所有规划方案文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchSolutionDoc = async (ctx, next) => {
  let {
    SolutionDoc
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
    result = await SolutionDoc.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据规划方案查询规划方案文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchSolutionDocBySolution = async (ctx, next) => {
  let {
    SolutionDoc
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      solutionId
    } = ctx.params
    let {
      pageSize = 8, currentPage = 1, solutionDocType
    } = ctx.request.query
    const schema = Joi.object().keys({
      solutionId: Joi.string().required(),
      pageSize: Joi.number().required(),
      currentPage: Joi.number().required(),
      solutionDocType: Joi.string().allow('')
    })
    await Joi.validate({
      solutionId,
      pageSize,
      currentPage,
      solutionDocType
    }, schema)
    solutionId = xss(solutionId)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)
    solutionDocType = xss(solutionDocType)
    options = {
      where: {
        solution_id: solutionId
      },
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    if (solutionDocType) {
      options['where']['solution_doc_type_id'] = solutionDocType
    }
    result = await SolutionDoc.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 规划方案文档下载计数
 * @param {*} ctx
 * @param {*} next
 */
const updateSolutionDocDownload = async (ctx, next) => {
  let {
    UserInfo,
    SolutionDoc
  } = ctx.models
  let result = {}
  try {
    let {
      solutionDocId,
      userCode
    } = ctx.request.query
    const schema = Joi.object().keys({
      solutionDocId: Joi.string().required(),
      userCode: Joi.string().required()
    })
    await Joi.validate({
      solutionDocId,
      userCode
    }, schema)
    let username = xss(userCode)
    solutionDocId = xss(solutionDocId)

    await sequelize.transaction(t => {
      return SolutionDoc.findById(solutionDocId, {
        transaction: t
      }).then(soluteDoc => {
        if (!soluteDoc) throw new Error(`SolutionDoc with id(${solutionDocId}) is not exist !`)
        result = soluteDoc
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          return user.addSolutionDocs(soluteDoc, {
            through: {
              download: 1,
              username
            },
            transaction: t
          }).then(() => {
            return SolutionDoc.update({
              downloadNum: ++soluteDoc.downloadNum,
              username
            }, {
              where: {
                id: solutionDocId
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
 * 规划方案点赞计数
 * @param {*} ctx
 * @param {*} next
 */
const updateSolutionDocPraise = async (ctx, next) => {
  let {
    UserInfo,
    SolutionDoc
  } = ctx.models
  let result = {}
  try {
    let {
      solutionDocId,
      userCode,
      status
    } = ctx.request.query
    const schema = Joi.object().keys({
      solutionDocId: Joi.string().required(),
      userCode: Joi.string().required(),
      status: Joi.number().integer().required()
    })
    await Joi.validate({
      solutionDocId,
      userCode,
      status
    }, schema)
    status = parseInt(status)
    let username = xss(userCode)
    solutionDocId = xss(solutionDocId)
    status = xss(status)

    await sequelize.transaction(t => {
      return SolutionDoc.findById(solutionDocId, {
        transaction: t
      }).then(soluteDoc => {
        if (!soluteDoc) throw new Error(`SolutionDoc width id(${solutionDocId}) is not exist !`)
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          return user.addSolutionDocs(soluteDoc, {
            through: {
              praise: status,
              username
            },
            transaction: t
          }).then(() => {
            return SolutionDoc.update({
              praiseNum: status ? ++soluteDoc.praiseNum : (--soluteDoc.praiseNum < 0 ? 0 : soluteDoc.praiseNum)
            }, {
              where: {
                id: solutionDocId
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
 * 规划方案文档收藏
 * @param {*} ctx
 * @param {*} next
 */
const updateSolutionDocCollect = async (ctx, next) => {
  let {
    UserInfo,
    SolutionDoc
  } = ctx.models
  let result = {}
  try {
    let {
      solutionDocId,
      userCode,
      status
    } = ctx.request.query
    const schema = Joi.object().keys({
      solutionDocId: Joi.string().required(),
      userCode: Joi.string().required(),
      status: Joi.number().integer().required()
    })
    await Joi.validate({
      solutionDocId,
      userCode,
      status
    }, schema)
    status = parseInt(status)
    solutionDocId = xss(solutionDocId)
    let username = xss(userCode)

    await sequelize.transaction(t => {
      return SolutionDoc.findById(solutionDocId, {
        transaction: t
      }).then(soluteDoc => {
        if (!soluteDoc) throw new Error(`SolutionDoc width id(${solutionDocId}) is not exist !`)
        return UserInfo.findOne({
          where: {
            username
          },
          transaction: t
        }).then(user => {
          if (!user) throw new Error(`User with username(${username}) is not exist !`)
          return user.addSolutionDocs(soluteDoc, {
            through: {
              collect: status,
              username
            },
            transaction: t
          }).then(() => {
            return SolutionDoc.update({
              collectNum: status ? ++soluteDoc.collectNum : (--soluteDoc.collectNum < 0 ? 0 : soluteDoc.collectNum)
            }, {
              where: {
                id: solutionDocId
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
 * 根据用户查询他收藏的规划方案文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchCollectSolutionDoc = async (ctx, next) => {
  let {
    SolutionDoc,
    SolutionComment
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
    let comments = await SolutionComment.findAndCountAll(options)
    let soluteDocIds = comments.rows.map(item => {
      return item.solution_doc_id
    })
    let proDocs = await SolutionDoc.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: soluteDocIds
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
 * 根据用户查询他下载的规划方案文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchDownloadSolutionDoc = async (ctx, next) => {
  let {
    SolutionDoc,
    SolutionComment
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
    let comments = await SolutionComment.findAndCountAll(options)
    let soluteDocIds = comments.rows.map(item => {
      return item.solution_doc_id
    })
    let proDocs = await SolutionDoc.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: soluteDocIds
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
 * 根据用户查询他点赞的规划方案文档
 * @param {*} ctx
 * @param {*} next
 */
const fetchPraiseSolutionDoc = async (ctx, next) => {
  let {
    SolutionDoc,
    SolutionComment
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
    let comments = await SolutionComment.findAndCountAll(options)
    let soluteDocIds = comments.rows.map(item => {
      return item.solution_doc_id
    })
    let proDocs = await SolutionDoc.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: soluteDocIds
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
 * 审批规划方案
 * @param {*} ctx
 * @param {*} next
 */
const approveSolution = async (ctx, next) => {
  let {
    Solution,
    ReleaseSolution,
    SolutionType,
    SolutionDoc,
    Team
  } = ctx.models
  let result = null
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
      let options = {
        where: {
          id
        },
        include: [{
          model: SolutionType
        }, {
          model: SolutionDoc
        }, {
          model: Team
        }]
      }
      let model = await ReleaseSolution.findOne(options)
      let team = model.team
      // 已经审核过再次审核
      if (model.solution_id) {
        if (team) {
          await sequelize.transaction(t => {
            return Solution.update({
              title: model.title,
              desc: model.desc,
              topImg: model.topImg
            }, {
              where: {
                id: model.solution_id
              },
              transaction: t
            }).then(() => {
              return Solution.findById(model.solution_id, {
                transaction: t
              }).then(solute => {
                if (!solute) throw new Error(`Solution with id(${model.solution_id}) is not exist!`)
                result = solute
                return model.solutionType.addSolution(solute, {
                  transaction: t
                }).then(() => {
                  return solute.setSolutionDocs(model.solutionDocs, {
                    transaction: t
                  }).then(() => {
                    return model.team.addSolution(solute, {
                      transaction: t
                    }).then(() => {
                      return Team.update({
                        has_solution: true
                      }, {
                        where: {
                          id: model.team.id
                        },
                        transaction: t
                      }).then(() => {
                        return ReleaseSolution.update({
                          status: 2
                        }, {
                          where: {
                            id
                          },
                          transaction: t
                        }).then(() => {
                          return ReleaseSolution.findById(id, {
                            transaction: t
                          }).then(ReleaseSolution => {
                            return solute.addReleaseSolution(ReleaseSolution, {
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
          })
        } else {
          await sequelize.transaction(t => {
            return Solution.update({
              title: model.title,
              desc: model.desc,
              topImg: model.topImg
            }, {
              where: {
                id: model.solution_id
              },
              transaction: t
            }).then(() => {
              return Solution.findById(model.solution_id, {
                transaction: t
              }).then(solute => {
                if (!solute) throw new Error(`Solution with id(${model.solution_id}) is not exist!`)
                result = solute
                return model.solutionType.addSolution(solute, {
                  transaction: t
                }).then(() => {
                  return solute.setSolutionDocs(model.solutionDocs, {
                    transaction: t
                  }).then(() => {
                    return Team.update({
                      has_solution: true
                    }, {
                      where: {
                        id: model.team.id
                      },
                      transaction: t
                    }).then(() => {
                      return ReleaseSolution.update({
                        status: 2
                      }, {
                        where: {
                          id
                        },
                        transaction: t
                      }).then(() => {
                        return ReleaseSolution.findById(id, {
                          transaction: t
                        }).then(ReleaseSolution => {
                          return solute.addReleaseSolution(ReleaseSolution, {
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
        }
      } else {
        // 初次审核
        if (team) {
          await sequelize.transaction(t => {
            return Solution.findOrCreate({
              where: {
                title: model.title
              },
              defaults: {
                desc: model.desc,
                topImg: model.topImg
              },
              transaction: t
            }).then(([solute, created]) => {
              if (!created) throw new Error(`Solution with title(${model.title}) is already exist!`)
              result = solute
              return model.solutionType.addSolution(solute, {
                transaction: t
              }).then(() => {
                return solute.addSolutionDocs(model.solutionDocs, {
                  transaction: t
                }).then(() => {
                  return model.team.addSolution(solute, {
                    transaction: t
                  }).then(() => {
                    return Team.update({
                      has_solution: true
                    }, {
                      where: {
                        id: model.team.id
                      },
                      transaction: t
                    }).then(() => {
                      return ReleaseSolution.update({
                        status: 2
                      }, {
                        where: {
                          id
                        },
                        transaction: t
                      }).then(() => {
                        return ReleaseSolution.findById(id, {
                          transaction: t
                        }).then(ReleaseSolution => {
                          return solute.addReleaseSolution(ReleaseSolution, {
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
          await sequelize.transaction(t => {
            return Solution.findOrCreate({
              where: {
                title: model.title
              },
              defaults: {
                desc: model.desc,
                topImg: model.topImg
              },
              transaction: t
            }).then(([solute, created]) => {
              if (!created) throw new Error(`Solution with title(${model.title}) is already exist!`)
              result = solute
              return model.solutionType.addSolution(solute, {
                transaction: t
              }).then(() => {
                return solute.addSolutionDocs(model.solutionDocs, {
                  transaction: t
                }).then(() => {
                  return ReleaseSolution.update({
                    status: 2
                  }, {
                    where: {
                      id
                    },
                    transaction: t
                  }).then(() => {
                    return ReleaseSolution.findById(id, {
                      transaction: t
                    }).then(ReleaseSolution => {
                      return solute.addReleaseSolution(ReleaseSolution, {
                        transaction: t
                      })
                    })
                  })
                })
              })
            })
          })
        }
      }
    } else {
      result = await ReleaseSolution.update({
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
 * 点击发布按钮， 预发布
 * @param {*} ctx
 * @param {*} next
 */
const saveReleaseSolution = async (ctx, next) => {
  let { ReleaseSolution } = ctx.models
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
    result = await ReleaseSolution.update({
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
 * 根据产品负责人查询方案
 * @param {*} ctx
 * @param {*} next
 */
const fetchSolutionByUser = async (ctx, next) => {
  let {
    ReleaseSolution,
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
        return ReleaseSolution.findAndCountAll(options).then(solution => {
          result = solution
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
   * 根据规划方案查询拥有规划方案的团队
   */
  router.get('/team/solution/fetch', fetchTeamWithSolution)
  /**
   * 规划方案类型
   */
  router.post('/solutionType/add', upload.single('file'), addSolutionType)
  router.post('/solutionType/delete', deleteSolutionType)
  router.post('/solutionType/edit', editSolutionType)
  router.get('/solutionType/fetch', fetchSolutionType)
  router.get('/solutionType/fetch/:id', fetchSolutionTypeById)

  /**
   * 规划方案类型收藏 / 取消收藏
   */
  router.get('/solutionType/collect', collectSolutionType)
  /**
   * 查询我的收藏 规划方案类型
   */
  router.get('/solutionType/collect/fetch', fetchCollectionSolutionType)

  /**
   * 规划方案
   */
  router.post('/solution/add', upload.single('file'), addSolution)
  router.post('/solution/delete', deleteSolution)
  router.post('/solution/edit', editSolution)

  router.get('/solution/fetch', fetchSolution)
  /**
   * 查询规划方案详情(预发布)
   */
  router.get('/solution/fetch/:id', fetchSolutionById)

  /**
   * 查询规划方案详情(已发布)
   */
  router.get('/solution/approved/fetch/:id', fetchApproveSolutionById)
  /**
   * 根据规划方案类型查询规划方案
   */
  router.get('/solution/solutionType/fetch/:solutionTypeId', fetchSolutionBySolutionType)

  /**
   * 规划方案收藏 / 取消收藏
   */
  router.get('/solution/collect', collectSolution)
  /**
   * 查询我的收藏 规划方案
   */
  router.get('/solution/collect/fetch', fetchCollectionSolution)

  /**
   * 规划方案文档类型
   */
  router.post('/solutionDocType/add', addSolutionDocType)
  router.post('/solutionDocType/delete', deleteSolutionDocType)
  router.get('/solutionDocType/fetch', fetchSolutionDocType)
  router.get('/solutionDocType/fetch/:id', fetchSolutionDocTypeById)
  router.post('/solutionDocType/edit', editSolutionDocType)

  /**
   * 规划方案文档
   */
  router.post('/solutionDoc/add', upload.single('file'), addSolutionDoc)
  router.post('/solutionDoc/delete', deleteSolutionDoc)
  router.post('/solutionDoc/fetch', fetchSolutionDoc)

  /**
   * 根据规划方案查询规划方案文档
   */
  router.get('/solutionDoc/fetch/:solutionId', fetchSolutionDocBySolution)
  /**
   * 规划方案文档下载计数
   */
  router.get('/solutionDoc/download', updateSolutionDocDownload)
  /**
   * 规划方案文档点赞
   */
  router.get('/solutionDoc/praise', updateSolutionDocPraise)
  /**
   * 规划方案文档收藏
   */
  router.get('/solutionDoc/collect', updateSolutionDocCollect)

  /**
   * 根据用户查询他收藏的规划方案文档
   */
  router.get('/user/collect/solutionDoc', fetchCollectSolutionDoc)

  /**
   * 根据用户查询他下载的规划方案文档
   */
  router.get('/user/download/solutionDoc', fetchDownloadSolutionDoc)

  /**
   * 根据用户查询他点赞的规划方案文档
   */
  router.get('/user/praise/solutionDoc', fetchPraiseSolutionDoc)

  /**
   * 审核规划方案
   */
  router.post('/solution/approve', approveSolution)

  /**
   * 提交审核 点击发布按钮， 预发布
   */
  router.post('/solution/save', saveReleaseSolution)

  /**
   * 根据产品负责人查询方案
   */
  router.get('/user/solution/fetch', fetchSolutionByUser)
}

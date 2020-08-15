/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 团队介绍
 * CREATE DATABASE portal CHARACTER SET utf8 COLLATE utf8_general_ci;
 * @Date: 2018-12-04 18:19:21
 * @LastEditTime: 2019-04-22 11:03:04
 */
const Joi = require('joi')
const FormatResponse = require('../lib/format-response')
const Sequelize = require('sequelize')
const upload = require('../lib/upload')
const UploadWithSftp = require('../lib/sftp')
const xss = require('xss')
const sequelize = require('../model/connect')

/**
 * 查询团队所有信息
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeam = async (ctx, next) => {
  let {
    Team, TeamMember, TeamRole
  } = ctx.models
  let result = {}
  let options = {}
  try {
    const schema = Joi.object().keys({
      teamName: Joi.string().allow(''),
      pageSize: Joi.number().integer().default(10),
      currentPage: Joi.number().integer().default(1),
      from: Joi.string().allow('')
    })
    let {
      currentPage = 1, pageSize = 10, teamName = '', from
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)

    teamName = xss(teamName)
    from = xss(from)

    await Joi.validate({
      teamName,
      pageSize,
      currentPage,
      from
    }, schema)
    options = {
      where: {},
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'ASC']
      ],
      include: [{
        model: TeamMember,
        include: [TeamRole]
      }],
      distinct: true
    }
    if (teamName) {
      options['where'] = {
        teamName: {
          [Sequelize.Op.like]: `%${teamName}%`
        }
      }
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
 * 根据id查询团队
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamById = async (ctx, next) => {
  let {
    Team, TeamMember, TeamRole, TeamLeader
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
    result = await Team.findById(id, {
      include: [{
        model: TeamMember,
        include: [TeamRole]
      }],
      order: [
        [TeamMember, TeamLeader, 'created_at', 'ASC']
      ]
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增团队
 * @param {*} ctx
 * @param {*} next
 */
const addTeam = async (ctx, next) => {
  let {
    Team, TeamMember, User, TeamLeader
  } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    logo,
    teamName,
    thumbnail,
    email,
    description,
    teamMembers,
    teamLeader,
    userCode
  } = ctx.req.body
  try {
    // xss
    logo = xss(logo)
    teamName = xss(teamName)
    thumbnail = xss(thumbnail)
    email = xss(email)
    description = xss(description)
    teamLeader = xss(teamLeader)
    userCode = xss(userCode)

    teamMembers = teamMembers.split(',')
    const schema = Joi.object().keys({
      logo: Joi.string().allow(''),
      teamName: Joi.string().required(),
      thumbnail: Joi.string().allow(''),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      description: Joi.string().required(),
      teamMembers: Joi.array().items(Joi.string().required()).min(1),
      teamLeader: Joi.string().required(),
      userCode: Joi.string().required()
    })

    await Joi.validate({
      logo,
      teamName,
      thumbnail,
      email,
      description,
      teamMembers,
      teamLeader,
      userCode
    }, schema)

    const file = ctx.req.file
    if (!file) throw new Error(`未选择相关的封面图片`)
    uploadWithSftp = new UploadWithSftp(file, 1)
    thumbnail = await uploadWithSftp.uploadFileToFtp('team')

    /**
     * 采用事务来做相关的操作
     */
    await sequelize.transaction(t => {
      return Team.findOrCreate({
        where: {
          teamName
        },
        defaults: {
          logo,
          thumbnail,
          email,
          description
        },
        transaction: t
      }).then(([team, created]) => {
        if (!created) {
          throw new Error(`Team with teamName (${teamName}) is already exist!`)
        }
        result = team
        let options = {
          where: {
            id: {
              [Sequelize.Op.in]: teamMembers
            }
          },
          transaction: t
        }
        return TeamMember.findAll(options).then(teamMember => {
          if (!teamMember || !teamMember.length || teamMember.length !== teamMembers.length) {
            throw new Error(`team member(${teamMembers.join(',')}) is not exist !`)
          }
          // teamMember.forEach(element => {
          //   if (element.id === teamLeader) {
          //     element.TeamLeader = {
          //       leader: true
          //     }
          //   }
          // })
          return team.addTeamMembers(teamMember, {
            transaction: t
          }).then(() => {
            return TeamLeader.update({
              leader: true
            }, {
              where: {
                team_id: team.id,
                team_member_id: teamLeader
              },
              transaction: t
            }).then(() => {
              return User.findOne({
                where: {
                  username: userCode
                },
                transaction: t
              }).then(user => {
                if (!user) throw new Error(`User with username(${userCode}) is not exist !`)
                return user.addTeams(team, {
                  transaction: t
                })
              })
            })
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    /**
     * 如果发现有报错，我们需要将已经上传的文件进行删除
     */
    if (uploadWithSftp && thumbnail) {
      uploadWithSftp.removeFile(thumbnail, 'team')
    }
    throw new Error(error)
  }
}

/**
 * 支持插入数据
 * @param {*} ctx
 * @param {*} next
 */
const insertTeam = async (ctx, next) => {
  let {
    Team,
    TeamMember
  } = ctx.models
  let result = {}
  try {
    const schema = Joi.object().keys({
      logo: Joi.string().allow(''),
      teamName: Joi.string().required(),
      thumbnail: Joi.string().allow(''),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      description: Joi.string().required(),
      teamMembers: Joi.array().allow(''),
      teamLeader: Joi.string().allow('')
    })
    let {
      logo,
      teamName,
      thumbnail,
      email,
      description,
      teamMembers,
      teamLeader
    } = ctx.request.body
    await Joi.validate({
      logo,
      teamName,
      thumbnail,
      email,
      description,
      teamMembers,
      teamLeader
    }, schema)
    await Team.findOrCreate({
      where: {
        teamName
      },
      defaults: {
        logo,
        thumbnail,
        email,
        description
      }
    }).spread((team, created) => {
      if (!created) {
        throw new Error(`Team with name (${teamName}) is already exist!`)
      }
      result = team
    })
    if (teamMembers && teamMembers.length) {
      let options = {
        where: {
          id: {
            [Sequelize.Op.in]: teamMembers
          }
        }
      }
      let teamMember = await TeamMember.findAll(options)
      result.addTeamMembers(teamMember)
      await TeamMember.update({
        is_leader: 0
      }, {
        where: {
          id: {
            [Sequelize.Op.in]: teamMembers
          }
        }
      })
      await TeamMember.update({
        is_leader: 1
      }, {
        where: {
          id: teamLeader
        }
      })
    }
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量删除团队
 * @param {*} ctx
 * @param {*} next
 */
const deleteTeam = async (ctx, next) => {
  let {
    Team
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
    result = await Team.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑团队
 * @param {*} ctx
 * @param {*} next
 */
const editTeam = async (ctx, next) => {
  let {
    Team,
    TeamMember,
    TeamLeader
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      logo,
      teamName,
      thumbnail,
      email,
      description,
      teamMembers,
      teamLeader
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      logo: Joi.string().allow(''),
      teamName: Joi.string().required(),
      thumbnail: Joi.string().required(),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      description: Joi.string().required(),
      teamMembers: Joi.array().items(Joi.string().required()).min(1),
      teamLeader: Joi.string().required()
    })

    // xss
    id = xss(id)
    teamName = xss(teamName)
    thumbnail = xss(thumbnail)
    email = xss(email)
    description = xss(description)
    teamLeader = xss(teamLeader)

    await Joi.validate({
      id,
      logo,
      teamName,
      thumbnail,
      email,
      description,
      teamMembers,
      teamLeader
    }, schema)

    await sequelize.transaction(t => {
      return Team.update({
        logo,
        teamName,
        thumbnail,
        email,
        description
      }, {
        where: {
          id
        },
        transaction: t
      }).then((updated) => {
        if (updated[0] !== 1) {
          throw new Error(`team with id (${id} is not exist !`)
        }
        result = updated
        return Team.findById(id, {
          transaction: t
        }).then(team => {
          let options = {
            where: {
              id: {
                [Sequelize.Op.in]: teamMembers
              }
            },
            transaction: t
          }
          return TeamMember.findAll(options).then(teamMember => {
            if (!teamMember || !teamMember.length || teamMember.length !== teamMembers.length) {
              throw new Error(`team member(${teamMembers.join(',')}) is not exist !`)
            }
            return team.setTeamMembers(teamMember, {
              transaction: t
            }).then(() => {
              return TeamLeader.update({
                leader: false
              }, {
                where: {
                  team_id: team.id
                },
                transaction: t
              }).then(() => {
                return TeamLeader.update({
                  leader: true
                }, {
                  where: {
                    team_id: team.id,
                    team_member_id: teamLeader
                  },
                  transaction: t
                })
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
 * 查询团队成员
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamMember = async (ctx, next) => {
  let {
    TeamMember
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let {
      team_id,
      username,
      team_role_id,
      pageSize = 10,
      currentPage = 1
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    const schema = Joi.object().keys({
      team_id: Joi.string().allow(''),
      username: Joi.string().allow(''),
      team_role_id: Joi.string().allow(''),
      pageSize: Joi.number().integer().required(),
      currentPage: Joi.number().integer().required()
    })
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    await Joi.validate({
      team_id,
      username,
      team_role_id,
      pageSize,
      currentPage
    }, schema)

    // xss
    team_id = xss(team_id)
    team_role_id = xss(team_role_id)

    options = {
      where: {},
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    if (team_id) {
      options['where'] = {
        team_id
      }
    }
    if (team_role_id) {
      options['where'] = {
        team_role_id
      }
    }
    if (username) {
      options['where'] = {
        username: {
          [Sequelize.Op.like]: `%${username}%`
        }
      }
    }
    result = await TeamMember.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 根据团员查询相关信息
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamMemberById = async (ctx, next) => {
  let {
    TeamMember,
    TeamRole
  } = ctx.models
  let result = {}
  try {
    let {id} = ctx.params
    const schema = Joi.object().keys({
      id: Joi.string().required()
    })
    await Joi.validate({
      id
    }, schema)
    id = xss(id)
    result = await TeamMember.findById(id, {
      include: [TeamRole]
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增团队成员
 * @param {*} ctx
 * @param {*} next
 */
const addTeamMember = async (ctx, next) => {
  let { TeamMember, TeamRole } = ctx.models
  let result = {}
  let uploadWithSftp = null
  let {
    username,
    userCode,
    email,
    avatar,
    motto,
    team_role_id
  } = ctx.req.body
  try {
    const schema = Joi.object().keys({
      username: Joi.string().required(),
      userCode: Joi.string().required(),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      avatar: Joi.string().allow(''),
      motto: Joi.string().allow(''),
      team_role_id: Joi.string().required()
    })
    await Joi.validate({
      username,
      userCode,
      email,
      avatar,
      motto,
      team_role_id
    }, schema)

    // xss
    userCode = xss(userCode)
    email = xss(email)
    avatar = xss(avatar)
    motto = xss(motto)
    team_role_id = xss(team_role_id)
    username = xss(username)

    const file = ctx.req.file
    if (!file) throw new Error('请先选择头像封面')
    uploadWithSftp = new UploadWithSftp(file, 1)
    avatar = await uploadWithSftp.uploadFileToFtp('team')

    /**
     * 改用事务
     */
    await sequelize.transaction(t => {
      return TeamMember.findOrCreate({
        where: {
          email
        },
        defaults: {
          username,
          avatar,
          motto,
          team_role_id
        },
        transaction: t
      }).then(([teamMember, created]) => {
        if (!created) {
          throw new Error(`TeamMember with email (${email}) is already exist!`)
        }
        result = teamMember
        return TeamRole.findById(team_role_id, {
          transaction: t
        }).then(role => {
          if (!role) {
            throw new Error(`TeamRole with id (${team_role_id}) is not exist!`)
          }
          return role.addTeamMembers(result, {
            transaction: t
          })
        })
      })
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    /**
     * 如果发现有报错，我们需要将已经上传的文件进行删除
     */
    if (uploadWithSftp && avatar) {
      uploadWithSftp.removeFile(avatar, 'team')
    }
    throw new Error(error)
  }
}

/**
 * 直接插入数据
 * @param {*} ctx
 * @param {*} next
 */
const insertTeamMember = async (ctx, next) => {
  let {
    TeamMember,
    TeamRole
  } = ctx.models
  let result = {}
  try {
    let {
      email,
      userCode,
      avatar,
      motto,
      team_role_id
    } = ctx.request.body
    const schema = Joi.object().keys({
      userCode: Joi.string().required(),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      avatar: Joi.string().allow(''),
      motto: Joi.string().allow(''),
      team_role_id: Joi.string().required()
    })
    await Joi.validate({
      userCode,
      email,
      avatar,
      motto,
      team_role_id
    }, schema)
    let username = xss(userCode)
    await TeamMember.findOrCreate({
      where: {
        email
      },
      defaults: {
        username,
        avatar,
        motto,
        team_role_id
      }
    }).spread((teamMember, created) => {
      if (!created) {
        throw new Error(`TeamMember with username (${username}) is already exist!`)
      }
      result = teamMember
    })
    let role = await TeamRole.findById(team_role_id)
    if (role) {
      role.addTeamMembers(result)
    }
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 批量删除团队成员
 * @param {*} ctx
 * @param {*} next
 */
const deleteTeamMember = async (ctx, next) => {
  let {
    TeamMember
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
    result = await TeamMember.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 修改团队成员的相关信息
 * @param {*} ctx
 * @param {*} next
 */
const editTeamMember = async (ctx, next) => {
  let {
    TeamMember,
    TeamRole
  } = ctx.models
  let result = {}
  try {
    let {
      id,
      username,
      email,
      userCode,
      avatar,
      motto,
      team_role_id
    } = ctx.request.body
    const schema = Joi.object().keys({
      id: Joi.string().required(),
      username: Joi.string().required(),
      email: Joi.string()
        .required()
        .regex(/(^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,4}$)/),
      userCode: Joi.string().required(),
      avatar: Joi.string().allow(''),
      motto: Joi.string().allow(''),
      team_role_id: Joi.string().required()
    })
    await Joi.validate({
      id,
      username,
      email,
      userCode,
      avatar,
      motto,
      team_role_id
    }, schema)

    // xss
    id = xss(id)
    email = xss(email)
    username = xss(username)
    userCode = xss(userCode)
    avatar = xss(avatar)
    motto = xss(motto)
    team_role_id = xss(team_role_id)

    await sequelize.transaction(t => {
      return TeamRole.findById(team_role_id, {
        transaction: t
      }).then(teamRole => {
        if (!teamRole) throw new Error(`TeamRole with id(${team_role_id}) is not exist !`)
        return TeamMember.findById(id, {
          transaction: t
        }).then(teamer => {
          if (!teamer) throw new Error(`TeamMember with id(${id}) is not exist !`)
          return teamRole.addTeamMember(teamer, {
            transaction: t
          }).then(() => {
            return TeamMember.update({
              email,
              username,
              avatar,
              motto,
              team_role_id
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
    ctx.body = FormatResponse.success(result, '修改成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 新增角色
 * @param {*} ctx
 * @param {*} next
 */
const addTeamRole = async (ctx, next) => {
  let {
    TeamRole
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
    await TeamRole.findOrCreate({
      where: {
        name
      }
    }).spread((teamRole, created) => {
      if (!created) {
        throw new Error(`TeamRole with name (${name}) is already exist!`)
      }
      result = teamRole
    })
    ctx.body = FormatResponse.success(result, '新增成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询角色
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamRole = async (ctx, next) => {
  let {
    TeamRole
  } = ctx.models
  let result = {}
  let options = {}
  try {
    const schema = Joi.object().keys({
      name: Joi.string().allow(''),
      pageSize: Joi.number().integer().default(10),
      currentPage: Joi.number().integer().default(1)
    })
    let {
      currentPage = 1, pageSize = 10, name = ''
    } = ctx.request.query
    currentPage = parseInt(currentPage)
    pageSize = parseInt(pageSize)
    await Joi.validate({
      name,
      pageSize,
      currentPage
    }, schema)

    name = xss(name)
    options = {
      where: {},
      offset: (currentPage - 1) * pageSize,
      limit: pageSize,
      order: [
        ['created_at', 'DESC']
      ]
    }
    if (name) {
      options['where'] = {
        name: {
          [Sequelize.Op.like]: `%${name}%`
        }
      }
    }
    result = await TeamRole.findAndCountAll(options)
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 查询相同角色下的人
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamRoleById = async (ctx, next) => {
  let {
    TeamRole,
    TeamMember
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
    result = await TeamRole.findById(id, {
      include: [TeamMember]
    })
    ctx.body = FormatResponse.success(result, '查询成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 删除角色
 * @param {*} ctx
 * @param {*} next
 */
const deleteTeamRole = async (ctx, next) => {
  let {
    TeamRole
  } = ctx.models
  let result = {}
  let options = {}
  try {
    let { ids } = ctx.request.body
    const schema = Joi.object().keys({
      ids: Joi.array().items(Joi.string().required()).min(1)
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
    result = await TeamRole.destroy(options)
    ctx.body = FormatResponse.success(result, '删除成功')
  } catch (error) {
    throw new Error(error)
  }
}

/**
 * 编辑角色名
 * @param {*} ctx
 * @param {*} next
 */
const editTeamRole = async (ctx, next) => {
  let {
    TeamRole
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
    name = xss(name)
    await Joi.validate({
      id,
      name
    }, schema)
    result = await TeamRole.update({
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
 * 根据用户查询团队
 * @param {*} ctx
 * @param {*} next
 */
const fetchTeamByUserId = async (ctx, next) => {
  let {
    User,
    Team,
    TeamMember
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
      currentPage: Joi.number().integer().required(),
      pageSize: Joi.number().integer().required(),
      userCode: Joi.string().required(),
      title: Joi.string().allow('')
    })
    await Joi.validate({
      currentPage,
      pageSize,
      userCode,
      title
    }, schema)
    title = xss(title)
    userCode = xss(userCode)
    pageSize = parseInt(pageSize)
    currentPage = parseInt(currentPage)

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
            model: TeamMember
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
        return Team.findAndCountAll(options).then(team => {
          result = team
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
   * 团队相关介绍
   */
  router.get('/team/fetch', fetchTeam)
  router.get('/team/fetch/:id', fetchTeamById)
  router.post('/team/add', upload.single('file'), addTeam)
  router.post('/team/delete', deleteTeam)
  router.post('/team/edit', editTeam)

  /**
   * 直接插入数据
   */
  router.post('/team/insert', insertTeam)

  /**
   * 团队成员
   */
  router.get('/team/member/fetch', fetchTeamMember)
  router.get('/team/member/fetch/:id', fetchTeamMemberById)
  router.post('/team/member/add', upload.single('file'), addTeamMember)
  router.post('/team/member/delete', deleteTeamMember)
  router.post('/team/member/edit', editTeamMember)
  router.post('/team/member/insert', insertTeamMember)

  /**
   * 团队角色
   */
  router.post('/team/role/add', addTeamRole)
  router.get('/team/role/fetch', fetchTeamRole)
  router.get('/team/role/fetch/:id', fetchTeamRoleById)
  router.post('/team/role/delete', deleteTeamRole)
  router.post('/team/role/edit', editTeamRole)

  /**
   * 根据用户查询团队
   */
  router.get('/team/user/fetch', fetchTeamByUserId)
}

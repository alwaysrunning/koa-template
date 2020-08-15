/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 用户角色表
 * @Date: 2018-12-19 11:14:55
 * @LastEditTime: 2018-12-20 10:44:52
 */
const Sequelize = require('sequelize')
const moment = require('moment')

/**
 * TODO: 做后台角色相关操作
 */
module.exports = conn => ({
  Role: conn.define('role', {
    /**
     * 角色id
     */
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    /**
     * 角色名称
     */
    name: {
      type: Sequelize.STRING,
      unique: true
    },
    /**
     * 角色描述
     */
    roleDesc: {
      type: Sequelize.TEXT
    },
    /**
     * 角色编码
     * eg: 000000
     * 前面两位 00 superAdmin 新建角色分配权限 添加用户
     * 中间两位 00 管理员 审核
     * 后面两位 00 产品负责人 新建团队 新建产品 修改
     */
    code: {
      type: Sequelize.STRING,
      unique: true
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      get () {
        return moment(this.getDataValue('created_at')).format('YYYY-MM-DD HH:mm:ss')
      }
    },
    updated_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      get () {
        return moment(this.getDataValue('updated_at')).format('YYYY-MM-DD HH:mm:ss')
      }
    }
  }, {
    underscored: true,
    timestamps: true
  })
})

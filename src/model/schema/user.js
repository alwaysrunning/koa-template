/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 后台操作用户表
 * @Date: 2018-12-19 15:49:48
 * @LastEditTime: 2018-12-20 15:32:09
 */

const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  User: conn.define('user', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    /**
     * 用户的nt帐号 用于
     */
    username: {
      type: Sequelize.STRING,
      unique: true
    },
    /**
     * 内网用户邮箱
     */
    email: {
      type: Sequelize.STRING,
      unique: true
    },
    /**
     * 用户当前的状态
     * 1. 正常
     * 2. 删除
     */
    status: {
      type: Sequelize.ENUM,
      values: ['1', '2'],
      defaultValue: 1
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

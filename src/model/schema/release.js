/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 产品预发布表 该预发布表用于存储后台系统管理相关的参数
 * @Date: 2018-12-12 19:16:53
 * @LastEditTime: 2019-01-14 17:04:38
 */
const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  Release: conn.define('release', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    /**
     * 产品logo， 用于生成二维码中心的小图标
     */
    logo: {
      type: Sequelize.STRING
    },
    /**
     * 产品名
     */
    title: {
      type: Sequelize.STRING
    },
    /**
     * 产品描述
     */
    desc: {
      type: Sequelize.TEXT
    },
    /**
     * 产品图片
     */
    topImg: {
      type: Sequelize.STRING
    },
    /**
     * 产品状态
     * 1. 未提交审核，已新建
     * 2. 审核通过
     * 3. 审核不通过
     * 4. 提交审核、审核中...
     */
    status: {
      type: Sequelize.ENUM,
      values: ['1', '2', '3', '4'],
      defaultValue: 1
    },
    forum_path: {
      type: Sequelize.STRING
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

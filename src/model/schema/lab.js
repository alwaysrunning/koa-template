/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 实验室Lab
 * @Date: 2018-12-04 17:29:48
 * @LastEditTime: 2018-12-20 16:34:48
 */
const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  Lab: conn.define('lab', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    thumbnail: {
      type: Sequelize.STRING
    },
    title: {
      type: Sequelize.TEXT
    },
    /**
       * 短内容
       */
    short: {
      type: Sequelize.TEXT
    },
    /**
       * 长内容
       */
    content: {
      type: Sequelize.TEXT
    },
    /**
     * 实验室状态
     * 1. 正常、 审批通过
     * 2. 待审批
     * 3. 审批不通过
     */
    status: {
      type: Sequelize.ENUM,
      values: ['1', '2', '3'],
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

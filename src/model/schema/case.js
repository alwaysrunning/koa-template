/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 产品案例表
 * @Date: 2018-12-04 17:09:45
 * @LastEditTime: 2018-12-11 16:27:36
 */
const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  Case: conn.define('case', {
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
     * 产品案例状态
     * 1. 正常、 审批通过
     * 2. 待审批
     * 3. 审批不通过
     */
    status: {
      type: Sequelize.ENUM,
      values: ['1', '2', '3']
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

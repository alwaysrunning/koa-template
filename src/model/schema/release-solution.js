/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description:
 * @Date: 2019-01-02 16:15:16
 * @LastEditTime: 2019-01-02 16:40:06
 */
const Sequelize = require('sequelize')
const moment = require('moment')
module.exports = conn => ({
  /**
   * 待审核的规划方案
   */
  ReleaseSolution: conn.define('releaseSolution', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    title: {
      type: Sequelize.STRING
    },
    desc: {
      type: Sequelize.TEXT
    },
    topImg: {
      type: Sequelize.STRING
    },
    follow: {
      type: Sequelize.INTEGER,
      defaultValue: 0
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

/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 上传表，用于关联内容与上传文件的关系
 * @Date: 2018-12-24 16:35:26
 * @LastEditTime: 2018-12-24 17:06:37
 */
const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  Upload: conn.define('upload', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    url: {
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

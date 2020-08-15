/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 关联团队和团员之间的关系
 * @Date: 2018-12-24 11:35:27
 * @LastEditTime: 2018-12-24 11:40:03
 */
const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  TeamLeader: conn.define('teamLeader', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    leader: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
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

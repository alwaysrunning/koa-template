/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 产品关注表，用于记录用户关注产品数
 * @Date: 2018-12-11 15:37:10
 * @LastEditTime: 2018-12-29 10:28:50
 */
const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  Follow: conn.define('follow', {
    username: {
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
  }),
  SolutionFollow: conn.define('solutionFollow', {
    username: {
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
  }),
  SolutionTypeFollow: conn.define('solutionTypeFollow', {
    username: {
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

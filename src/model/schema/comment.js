/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 用于创建点赞 收藏等
 * @Date: 2018-12-13 20:15:05
 * @LastEditTime: 2019-01-15 16:52:20
 */

const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  Comment: conn.define('comment', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    username: {
      type: Sequelize.STRING
    },
    /**
     * 是否点赞
     */
    praise: {
      type: Sequelize.BOOLEAN,
      defaultValue: 0
    },
    /**
     * 下载
     */
    download: {
      type: Sequelize.BOOLEAN,
      defaultValue: 0
    },
    /**
     * 收藏
     */
    collect: {
      type: Sequelize.BOOLEAN,
      defaultValue: 0
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
  SolutionComment: conn.define('solutionComment', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    username: {
      type: Sequelize.STRING
    },
    /**
       * 是否点赞
       */
    praise: {
      type: Sequelize.BOOLEAN,
      defaultValue: 0
    },
    /**
       * 下载
       */
    download: {
      type: Sequelize.BOOLEAN,
      defaultValue: 0
    },
    /**
     * 收藏
     */
    collect: {
      type: Sequelize.BOOLEAN,
      defaultValue: 0
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

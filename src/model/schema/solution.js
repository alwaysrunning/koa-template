/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 解决方案表
 * @Date: 2018-12-27 14:11:14
 * @LastEditTime: 2019-01-02 16:15:56
 */
const Sequelize = require('sequelize')
const moment = require('moment')
/**
 * TODO: 实现解决方案相关接口
 */

module.exports = conn => ({
  SolutionType: conn.define('solutionType', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    title: {
      type: Sequelize.STRING
    },
    imgUrl: {
      type: Sequelize.STRING
    },
    follow: {
      type: Sequelize.INTEGER,
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
  /**
   * 审核过的规划方案
   */
  Solution: conn.define('solution', {
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
  /**
   * 规划方案文档
   */
  SolutionDoc: conn.define('solutionDoc', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    /**
     * 文档名
     */
    title: {
      type: Sequelize.STRING
    },
    /**
     * 原始文件名
     */
    originalName: {
      type: Sequelize.STRING
    },
    size: {
      type: Sequelize.INTEGER
    },
    /**
     * 文档类型
     */
    /**
     * ppt、doc、excel、pdf
     */
    fileType: {
      type: Sequelize.ENUM,
      values: ['1', '2', '3', '4'],
      defaultValue: 1
    },
    /**
     * 下载地址
     */
    downLoadUrl: {
      type: Sequelize.STRING
    },
    /**
     * 收藏数
     */
    collectNum: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    /**
     * 产品文档的状态
     * 1 文档正常
     * 2 文档被删除，但是还有被引用
     * 3 文档别彻底删除
     */
    status: {
      type: Sequelize.ENUM,
      values: ['1', '2', '3'],
      defaultValue: 1
    },
    /**
     * 下载数
     */
    downloadNum: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    /**
     * 点赞数
     */
    praiseNum: {
      type: Sequelize.INTEGER,
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
  /**
   * 规划方案文档类型
   */
  SolutionDocType: conn.define('solutionDocType', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    name: {
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

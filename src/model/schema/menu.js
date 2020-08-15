/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 菜单
 * @Date: 2018-12-25 17:55:28
 * @LastEditTime: 2019-01-08 16:53:34
 */
const Sequelize = require('sequelize')
const moment = require('moment')
module.exports = conn => ({
  Catalog: conn.define('catalog', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    catalog: {
      type: Sequelize.STRING
    },
    level: {
      type: Sequelize.INTEGER,
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
  }),
  Menu: conn.define('menu', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV1
    },
    name: {
      type: Sequelize.STRING
    },
    code: {
      type: Sequelize.STRING
    },
    label: {
      type: Sequelize.STRING
    },
    icon: {
      type: Sequelize.STRING
    },
    level: {
      type: Sequelize.INTEGER,
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
  }),
  /**
   * 产品种类菜单
   */
  ProductKind: conn.define('productKind', {
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

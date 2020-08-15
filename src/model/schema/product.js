/*
 * @Author: sam.hongyang
 * @LastEditors: sam.hongyang
 * @Description: 产品表
 * @Date: 2018-12-10 14:30:17
 * @LastEditTime: 2019-06-25 15:05:25
 */
const Sequelize = require('sequelize')
const moment = require('moment')

module.exports = conn => ({
  /**
   * 产品表
   */
  Product: conn.define(
    'product',
    {
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
       * 1. 正常、 审批通过
       * 2. 待审批
       * 3. 审批不通过
       */
      status: {
        type: Sequelize.ENUM,
        values: ['1', '2', '3'],
        defaultValue: 2
      },
      /**
       * 关注人数
       */
      follow: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      forum_path: {
        type: Sequelize.STRING
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 产品类型
   */
  ProductType: conn.define(
    'productType',
    {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1
      },
      name: {
        type: Sequelize.STRING,
        unique: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 产品文档
   */
  ProductDoc: conn.define(
    'productDoc',
    {
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
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 产品文档类型
   */
  ProductDocType: conn.define(
    'productDocType',
    {
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
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 产品案例
   */
  ProductCase: conn.define(
    'productCase',
    {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1
      },
      title: {
        type: Sequelize.STRING
      },
      /**
       * 短内容
       */
      short: {
        type: Sequelize.TEXT
      },
      /**
       * 详情内容
       */
      content: {
        type: Sequelize.TEXT
      },
      imgUrl: {
        type: Sequelize.STRING
      },
      /**
       * 产品案例状态
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
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 产品路线图
   */
  /**
   * 产品路线图 - 产品年份路线
   */
  ProductRoute: conn.define(
    'productRoute',
    {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1
      },
      year: {
        type: Sequelize.STRING
      },
      /**
       * 时间格式
       * 1. 按季度
       * 2. 按月份
       * 3. 按日期
       */
      type: {
        type: Sequelize.STRING
      },
      /**
       * 时间
       * 例如 2019Q1 2019Q2
       */
      date: {
        type: Sequelize.STRING
      },
      title: {
        type: Sequelize.STRING
      },
      content: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 产品路线图 - 年份 - 季度 - 月份 - 日期
   */
  // ProductRouteItem: conn.define('productRouteItem', {
  //   id: {
  //     type: Sequelize.UUID,
  //     primaryKey: true,
  //     defaultValue: Sequelize.UUIDV1
  //   },
  //   /**
  //    * 时间
  //    * 例如 2019Q1 2019Q2
  //    */
  //   date: {
  //     type: Sequelize.STRING
  //   },
  //   title: {
  //     type: Sequelize.STRING
  //   },
  //   content: {
  //     type: Sequelize.STRING
  //   },
  //   created_at: {
  //     type: Sequelize.DATE,
  //     defaultValue: Sequelize.NOW,
  //     get () {
  //       return moment(this.getDataValue('created_at')).format('YYYY-MM-DD HH:mm:ss')
  //     }
  //   },
  //   updated_at: {
  //     type: Sequelize.DATE,
  //     defaultValue: Sequelize.NOW,
  //     get () {
  //       return moment(this.getDataValue('updated_at')).format('YYYY-MM-DD HH:mm:ss')
  //     }
  //   }
  // }, {
  //   underscored: true,
  //   timestamps: true
  // }),
  /**
   * 产品路线图 - 类型
   */
  ProductRouteType: conn.define(
    'productRouteType',
    {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1
      },
      name: {
        type: Sequelize.STRING
      },
      /**
       * icon 颜色
       */
      color: {
        type: Sequelize.STRING
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 研发计划
   */
  DevelopPlan: conn.define(
    'developPlan',
    {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1
      },
      title: {
        type: Sequelize.STRING
      },
      timeRange: {
        type: Sequelize.STRING
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 交付计划
   */
  DeliveryPlan: conn.define(
    'deliveryPlan',
    {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1
      },
      year: {
        type: Sequelize.STRING
      },
      /**
       * 时间格式
       * 1. 按季度
       * 2. 按月份
       * 3. 按日期
       */
      type: {
        type: Sequelize.STRING
      },
      /**
       * 时间
       * 例如 2019Q1 2019Q2
       */
      date: {
        type: Sequelize.STRING
      },
      title: {
        type: Sequelize.STRING
      },
      content: {
        type: Sequelize.TEXT
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  ),
  /**
   * 产品视频
   */
  ProductVideo: conn.define(
    'productVideo',
    {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV1
      },
      // NOTE: 视频名称
      title: {
        type: Sequelize.STRING
      },
      desc: {
        type: Sequelize.TEXT
      },
      // NOTE: 视频大小
      size: {
        type: Sequelize.INTEGER
      },
      // NOTE: 视频封面
      poster: {
        type: Sequelize.STRING
      },
      // NOTE: 视频地址
      sourceUrl: {
        type: Sequelize.STRING
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('created_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        get () {
          return moment(this.getDataValue('updated_at')).format(
            'YYYY-MM-DD HH:mm:ss'
          )
        }
      }
    },
    {
      underscored: true,
      timestamps: true
    }
  )
})

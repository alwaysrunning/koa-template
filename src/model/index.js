const conn = require('./connect')
const resolveModels = async () => {
  // await conn.authenticate()
  //   .then(() => {
  //     console.log('Connection has been established successfully.')
  //   })
  //   .catch(err => {
  //     console.error('Unable to connect to the database:', err)
  //   })
  await conn.authenticate()
  let models = {
    ...require('./schema/userInfo')(conn),
    ...require('./schema/news')(conn),
    // ...require('./schema/case')(conn),
    ...require('./schema/lab')(conn),
    ...require('./schema/team')(conn),
    ...require('./schema/fileDownload')(conn),
    ...require('./schema/product')(conn),
    ...require('./schema/follow')(conn),
    ...require('./schema/release')(conn),
    ...require('./schema/comment')(conn),
    ...require('./schema/role')(conn),
    ...require('./schema/user')(conn),
    ...require('./schema/team-leader')(conn),
    ...require('./schema/menu')(conn),
    ...require('./schema/solution')(conn),
    ...require('./schema/release-solution')(conn)
  }

  /**
   * 团队与成员
   */
  models.Team.belongsToMany(models.TeamMember, {
    through: models.TeamLeader
  })
  models.TeamMember.belongsToMany(models.Team, {
    through: models.TeamLeader
  })

  /**
   * 成员与角色
   */
  models.TeamRole.hasMany(models.TeamMember)
  models.TeamMember.belongsTo(models.TeamRole)

  /**
   * 团队与产品
   */
  models.Team.hasMany(models.Product)
  models.Product.belongsTo(models.Team)

  models.Team.hasMany(models.Release)
  models.Release.belongsTo(models.Team)

  /**
   * 产品文档 与 产品
   */
  models.Product.hasMany(models.ProductDoc)

  models.Release.hasMany(models.ProductDoc)

  /**
   * 产品文档类型与产品文档
   */
  models.ProductDocType.hasMany(models.ProductDoc)
  models.ProductDoc.belongsTo(models.ProductDocType)

  /**
   * 产品案例 与 产品
   */
  models.Product.hasMany(models.ProductCase)

  models.Release.hasMany(models.ProductCase)

  /**
   * 此关系用于存储点赞、收藏、下载
   */
  models.UserInfo.belongsToMany(models.ProductDoc, {
    through: {
      model: models.Comment,
      unique: false
    },
    foreignKey: 'user_id',
    constraints: false
  })
  models.ProductDoc.belongsToMany(models.UserInfo, {
    through: {
      model: models.Comment,
      unique: false
    },
    constraints: false
  })

  /**
   * 产品与新闻
   */
  models.Product.hasMany(models.News)
  models.News.belongsTo(models.Product)

  /**
   * 产品与实验室
   */
  models.Product.hasMany(models.Lab)
  models.Lab.belongsTo(models.Product)

  /**
   * 产品类型与产品
   */
  models.ProductType.belongsToMany(models.Product, {
    through: 'product_productTypes',
    foreignKey: 'product_type_id'
  })
  models.Product.belongsToMany(models.ProductType, {
    through: 'product_productTypes',
    foreignKey: 'product_id'
  })

  models.ProductType.belongsToMany(models.Release, {
    through: 'release_productTypes',
    foreignKey: 'product_type_id'
  })
  models.Release.belongsToMany(models.ProductType, {
    through: 'release_productTypes',
    foreignKey: 'release_id'
  })

  /**
   * 记录产品收藏
   */
  models.Product.belongsToMany(models.UserInfo, {
    through: models.Follow,
    foreignKey: 'product_id'
  })

  models.UserInfo.belongsToMany(models.Product, {
    through: models.Follow,
    foreignKey: 'user_id'
  })

  /**
   * 产品路线图与产品的关系
   */
  models.Product.hasMany(models.ProductRoute)
  models.ProductRoute.belongsTo(models.Product)

  models.Release.hasMany(models.ProductRoute)
  models.ProductRoute.belongsTo(models.Release)

  /**
   * 产品路线与产品路线类型
   */
  models.ProductRouteType.hasMany(models.ProductRoute)
  models.ProductRoute.belongsTo(models.ProductRouteType)

  /**
   * 产品与产品研发计划关联
   */
  models.Product.hasMany(models.DevelopPlan)
  models.DevelopPlan.belongsTo(models.Product)

  models.Release.hasMany(models.DevelopPlan)
  models.DevelopPlan.belongsTo(models.Release)

  /**
   * 产品与交付计划关联
   */
  models.Product.hasMany(models.DeliveryPlan)
  models.DeliveryPlan.belongsTo(models.Product)

  models.Release.hasMany(models.DeliveryPlan)
  models.DeliveryPlan.belongsTo(models.Release)

  /**
   * 产品和产品视频关联
   */
  models.Product.hasMany(models.ProductVideo)
  models.ProductVideo.belongsTo(models.Product)

  models.Release.hasMany(models.ProductVideo)
  models.ProductVideo.belongsTo(models.Release)

  /**
   * 产品种类与产品关系
   */
  models.ProductKind.hasMany(models.Product)
  models.Product.belongsTo(models.ProductKind)
  models.ProductKind.hasMany(models.Release)
  models.Release.belongsTo(models.ProductKind)

  /**
   * 产品表 与 预发布产品表的关联关系 1:n
   */
  models.Product.hasMany(models.Release)

  /**
   * 角色与用户的关系
   */
  models.Role.belongsToMany(models.User, {
    through: 'user_roles'
  })

  models.User.belongsToMany(models.Role, {
    through: 'user_roles'
  })

  /**
   * 用户与产品的关系
   */
  models.User.hasMany(models.Product)
  models.Product.belongsTo(models.User)

  models.User.hasMany(models.Release)
  models.Release.belongsTo(models.User)

  /**
   * 建立用户和团队的关系
   */
  models.User.hasMany(models.Team)
  models.Team.belongsTo(models.User)

  /**
   * 新闻与用户的关系
   */
  models.User.hasMany(models.News)
  models.News.belongsTo(models.User)

  /**
   * Lab与用户的关系
   */
  models.User.hasMany(models.Lab)
  models.Lab.belongsTo(models.User)

  /**
   * 一级菜单与二级菜单关系
   */
  models.Catalog.hasMany(models.Menu)
  models.Menu.belongsTo(models.Catalog)

  /**
   * 一级菜单与角色关系
   */
  models.Role.belongsToMany(models.Catalog, {
    through: 'role_catalogs'
  })
  models.Catalog.belongsToMany(models.Role, {
    through: 'role_catalogs'
  })

  /**
   * 二级菜单与角色关系
   */
  models.Role.belongsToMany(models.Menu, {
    through: 'role_menus'
  })
  models.Menu.belongsToMany(models.Role, {
    through: 'role_menus'
  })

  /**
   * 规划方案
   */
  /**
   * 方案类型与方案
   */
  models.SolutionType.hasMany(models.Solution)
  models.Solution.belongsTo(models.SolutionType)

  models.SolutionType.hasMany(models.ReleaseSolution)
  models.ReleaseSolution.belongsTo(models.SolutionType)

  /**
   * 方案与方案文档
   */
  models.Solution.hasMany(models.SolutionDoc)
  models.SolutionDoc.belongsTo(models.Solution)

  models.ReleaseSolution.hasMany(models.SolutionDoc)
  models.SolutionDoc.belongsTo(models.ReleaseSolution)

  /**
   * 方案与团队
   */
  models.Team.hasMany(models.Solution)
  models.Solution.belongsTo(models.Team)

  models.Team.hasMany(models.ReleaseSolution)
  models.ReleaseSolution.belongsTo(models.Team)

  /**
   * 用于记录用户收藏方案类型
   */
  models.UserInfo.belongsToMany(models.SolutionType, {
    through: models.SolutionTypeFollow
  })
  models.SolutionType.belongsToMany(models.UserInfo, {
    through: models.SolutionTypeFollow
  })

  /**
   * 用于记录用户收藏方案
   */
  models.UserInfo.belongsToMany(models.Solution, {
    through: models.SolutionFollow
  })
  models.Solution.belongsToMany(models.UserInfo, {
    through: models.SolutionFollow
  })
  /**
   * 规划方案文档类型与规划方案文档
   */
  models.SolutionDocType.hasMany(models.SolutionDoc)
  models.SolutionDoc.belongsTo(models.SolutionDocType)
  /**
   * 此关系用于存储点赞、收藏、下载
   */
  models.UserInfo.belongsToMany(models.SolutionDoc, {
    through: {
      model: models.SolutionComment,
      unique: false
    },
    foreignKey: 'user_id',
    constraints: false
  })
  models.SolutionDoc.belongsToMany(models.UserInfo, {
    through: {
      model: models.SolutionComment,
      unique: false
    },
    constraints: false
  })

  /**
   * 规划方案表 与 预发布规划方案表的关联关系 1:n
   */
  models.Solution.hasMany(models.ReleaseSolution)

  /**
   * 用户与方案
   */
  models.User.hasMany(models.ReleaseSolution)
  models.ReleaseSolution.belongsTo(models.User)

  conn.sync({ force: false })

  return models
}

exports = module.exports = async (ctx, next) => {
  try {
    const models = await resolveModels()
    ctx.models = models
    await next()
  } catch (err) {
    ctx.throw(err)
  }
}

exports.resolveModels = resolveModels

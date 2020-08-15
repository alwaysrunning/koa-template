const Sequelize = require('sequelize')
const moment = require('moment');

module.exports = conn => ({
  UserInfo: conn.define('userInfo', {
    username: {
      type: Sequelize.STRING(30),
      allowNull: false,
      unique: true
    },
    mail: Sequelize.STRING(100),
    displayName: Sequelize.STRING(100),
    givenName: Sequelize.STRING(100),
    fullName: Sequelize.STRING(100),
    company: Sequelize.STRING(100),
    department: Sequelize.STRING(100),
    info: Sequelize.STRING(100),
    last: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      get () {
        return moment(this.getDataValue('last')).format('YYYY-MM-DD HH:mm:ss')
      }
    }
  })
})

const Sequelize = require('sequelize')

module.exports = conn => ({
  FileDownload: conn.define('fileDownload', {
    username: {
      type: Sequelize.STRING(30),
      allowNull: false
    },
    givenName: Sequelize.STRING(100),
    fileName: Sequelize.STRING(100)
  })
})

let app = require('./src')
let port = process.env.API_PORT || 9096

app.listen(port, () => {
  console.log(`app started at ${port}`)
})

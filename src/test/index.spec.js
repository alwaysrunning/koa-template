import test from 'ava'
import supertest from 'supertest'
import app from '../'

function request () {
  return supertest(app.listen())
}

test.cb('my test', t => {
  request()
    .get('/icon')
    .expect(200)
    .expect(res => {
      t.true(res.body.length > 0)
    })
    .end(t.end)
})

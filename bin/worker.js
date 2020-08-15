const pptr = require('puppeteer')

// const baseURL = 'http://10.1.241.36:8888'
const baseURL = 'http://127.0.0.1:8082'

async function navWorker (category) {
  const browser = await pptr.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto(`${baseURL}/taurus-${category}/guide/introduce`)
  await page.waitForSelector('.navigate')
  const docs = await page.$$eval('.navigate .menu__item-group', menus => {
    let doc = {}
    menus.forEach(menu => {
      let title = menu.querySelector('li>.menu__item-group-title').textContent
      let lis = menu.querySelectorAll('li>ul>li')
      let comps = []
      for (let li of lis) {
        let title = li.innerHTML
        let link
        if (title.startsWith('Graph Editor')) {
          link = 'graph-editor'
        } else if (title.startsWith('Graph Viewer')) {
          link = 'graph-viewer'
        } else if (title.startsWith('UploaderG')) {
          link = 'uploader-g'
        } else if (title.startsWith('Square Menu')) {
          link = 'square-menu'
        } else if (title.startsWith('Notice Bar')) {
          link = 'notice-bar'
        } else if (title.startsWith('Index List')) {
          link = 'index-list'
        } else if (title.startsWith('Scroll List')) {
          link = 'scroll-list'
        } else {
          link = title.split(' ')[0].toLowerCase()
        }
        comps.push({
          label: title,
          value: link
        })
      }
      if (title !== 'elements') {
        doc[title] = comps
      }
    })
    return doc
  })
  await browser.close()
  return docs
}

async function docWorker (category, pageKey) {
  const browser = await pptr.launch({ headless: true })
  const page = await browser.newPage()
  let docs = {}
  await page.goto(
    `${baseURL}/taurus-${category}/components/${pageKey}`
  )
  await page.waitForSelector('.api')
  let compKeys = await page.$$eval('.api>.anchor>h5', h5s => {
    return h5s.map(h5 => h5.innerText.replace('#', ''))
  })
  if (compKeys.length === 0) {
    let compName = await page.$eval('.wrapper-content>h3', el => el.textContent)
    compKeys = [compName]
  }
  let comps = await page.$$('.api .tabs')
  for (let i = 0; i < comps.length; ++i) {
    let apis = await compWorker(comps[i])
    docs[[compKeys[i]]] = apis
  }
  await browser.close()
  return docs
}

async function compWorker (comp) {
  let apis = {}
  let navs = await comp.$$eval('.nav-tabs .nav-item>a', items => {
    return items.map(v => v.textContent)
  })

  let contents = await comp.$$eval('.tab-content .tab-pane table', tables => {
    let objs = []
    for (let i = 0; i < tables.length; ++i) {
      let table = tables[i]
      let trs = table.querySelectorAll('tbody tr')
      let ths = table.querySelectorAll('thead tr th')
      let obj = {}
      let keys = []
      for (let th of ths) {
        keys.push(th.textContent)
      }
      for (let tr of trs) {
        let tds = tr.querySelectorAll('td')
        let name = tds.item(0).textContent
        let val = {}
        for (let j = 1; j < tds.length; ++j) {
          val[keys[j]] = tds[j].textContent.replace('\n', '')
        }
        obj[name] = val
      }
      objs.push(obj)
    }
    return objs
  })
  navs.forEach((v, k) => {
    apis[v] = contents[k]
  })
  return apis
}

module.exports = {
  navWorker,
  docWorker
}

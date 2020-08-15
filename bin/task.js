#!/usr/bin/env node

const { navWorker, docWorker } = require('./worker')
const { resolveModels } = require('../src/model/index')
const chalk = require('chalk')
const argv = require('yargs').argv

process.setMaxListeners(0)

const run = async (start, end, category) => {
  try {
    const models = await resolveModels()
    let nav = await models.Nav.findOne({where: { key: category }})
    if (!nav) {
      const payload = await navWorker(category)
      nav = await models.Nav.create({ key: category, value: JSON.stringify(payload) })
    }
    const navs = JSON.parse(nav.value)
    let keys = []
    Object.keys(navs).forEach(k => {
      keys = keys.concat(navs[k].map(v => v.value))
    })
    // await models.Comp.destroy({truncate: true})
    await Promise.all(
      keys.slice(start, end).map(async (k) => {
        let doc = await models.Comp.findOne({where: {key: k, nav: category}})
        if (!doc) {
          try {
            const payload = await docWorker(category, k)
            await models.Comp.create({key: k, nav: category, value: JSON.stringify(payload)})
            console.log(chalk.green(`generate ${category}-${k} success`))
          } catch (err) {
            console.error(err)
            await models.Comp.create({key: k, nav: category, value: JSON.stringify({})})
            console.log(chalk.red(`generate ${category}-${k} failed`))
          }
        } else {
          console.log(chalk.yellow(`generate ${category}-${k} ignore`))
        }
      })
    )
  } catch (err) {
    console.error(err)
  }
}

const resolveNav = async (category) => {
  try {
    const models = await resolveModels()
    let nav = await models.Nav.findOne({where: { key: category }})
    const payload = await navWorker(category)
    if (!nav) {
      nav = await models.Nav.create({ key: category, value: JSON.stringify(payload) })
    } else {
      nav.value = JSON.stringify(payload)
      await nav.save()
    }
    console.log(chalk.green(`generate ${category} nav success`))
  } catch (err) {
    console.error(err)
    console.log(chalk.red(`generate ${category} nav failed`))
  }
}

const resolveComp = async (name, category) => {
  const models = await resolveModels()
  let doc = await models.Comp.findOne({where: {key: name, nav: category}})
  if (!doc) {
    try {
      const payload = await docWorker(category, name)
      await models.Comp.create({key: name, nav: category, value: JSON.stringify(payload)})
      console.log(chalk.green(`generate ${category}-${name} success`))
    } catch (err) {
      console.error(err)
      await models.Comp.create({key: name, nav: category, value: JSON.stringify({})})
      console.log(chalk.red(`generate ${category}-${name} failed`))
    }
  } else {
    try {
      const payload = await docWorker(category, name)
      console.log(payload)
      doc.value = JSON.stringify(payload)
      await doc.save()
      console.log(chalk.green(`update ${category}-${name} success`))
    } catch (err) {
      console.error(err)
      console.log(chalk.red(`update ${category}-${name} failed`))
    }
  }
}

if (argv.name) {
  resolveComp(argv.name, argv.category)
} else if (argv.nav) {
  resolveNav(argv.nav)
} else {
  run(argv.start, argv.end, argv.category)
}

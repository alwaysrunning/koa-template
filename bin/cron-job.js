const { CronJob } = require('cron')
const { run } = require('./task')

const job = new CronJob(
  '* * 12 * * * ',
  run,
  null,
  true,
  'Asia/Shanghai'
)

job.start()

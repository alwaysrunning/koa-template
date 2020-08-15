module.exports = time => {
  let diff = ''
  let time_diff = new Date().getTime() - new Date(time).getTime()
  // 计算相差天数 
  let days = Math.floor(time_diff / (24 * 3600 * 1000))
  if (days > 0) {
    diff += days + '天'
  }
  // 计算相差小时数 
  let leave1 = time_diff % (24 * 3600 * 1000)
  let hours = Math.floor(leave1 / (3600 * 1000))
  if (hours > 0) {
    diff += hours + '小时'
  } else {
    if (diff !== '') {
      diff += hours + '小时'
    }
  }
  // 计算相差分钟数 
  let leave2 = leave1 % (3600 * 1000)
  let minutes = Math.floor(leave2 / (60 * 1000))
  if (minutes > 0) {
    diff += minutes + '分'
  } else {
    if (diff !== '') {
      diff += minutes + '分'
    }
  }
  // 计算相差秒数 
  let leave3 = leave2 % (60 * 1000)
  let seconds = Math.round(leave3 / 1000)
  if (seconds > 0) {
    diff += seconds + '秒'
  } else {
    if (diff !== '') {
      diff += seconds + '秒'
    }
  }

  return diff
}

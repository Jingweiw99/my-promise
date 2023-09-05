const WPromise = require('./promise')

// 暴露适配器对象
module.exports = {
  resolved: WPromise.resolve,
  rejected: WPromise.reject,
  deferred() {
    const result = {}
    result.promise = new WPromise((resolve, reject) => {
      result.resolve = resolve
      result.reject = reject
    })
    return result
  }
}

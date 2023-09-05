class WPromise {
  constructor(executor) {
    this.status = 'pending'
    this.value = undefined
    this.reason = undefined
    this.fulfilledCallbacks = []
    this.rejectedCallbacks = []
    try {
      executor(this._resolve.bind(this), this._reject.bind(this))
    } catch (e) {
      this._reject(e)
    }
  }
  _resolve(value) {
    if (this.status === 'pending') {
      this.status = 'fulfilled'
      this.value = value
      this.fulfilledCallbacks.forEach((cb) => cb())
    }
  }
  _reject(reason) {
    this.status = 'rejected'
    this.reason = reason
    this.rejectedCallbacks.forEach((cb) => cb())
  }
  then(onFulfilled, onRejected) {
    // 这个方法实际上是监听状态的改变
    onFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : (value) => value
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (reason) => {
            throw reason
          }
    // 1. 创建一个需要返回的promise实例
    const promise2 = new WPromise((resolve, reject) => {
      if (this.status === 'fulfilled') {
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      } else if (this.status === 'rejected') {
        setTimeout(() => {
          try {
            const x = onRejected(this.reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      } else {
        // 状态为pending
        const cb = () => {
          setTimeout(() => {
            try {
              const x = onFulfilled(this.value)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        }
        this.fulfilledCallbacks.push(cb)
        const cb2 = () => {
          setTimeout(() => {
            try {
              const x = onRejected(this.reason)
              resolvePromise(promise2, x, resolve, reject)
            } catch (e) {
              reject(e)
            }
          })
        }
        this.rejectedCallbacks.push(cb2)
      }
    })
    return promise2
  }
  catch(onRejected) {
    return this.then(null, onRejected)
  }
  static resolve(value) {
    if (value instanceof WPromise) {
      return value
    }
    return new WPromise((resolve, reject) => {
      resolve(value)
    })
  }
  static reject(reason) {
    return new WPromise((resolve, reject) => {
      reject(reason)
    })
  }
  // 无论是成功还是失败，最后都会调用, then入两个回调然后调用
  finally(callback) {
    return this.then(
      (value) => {
        // 上一个的返回值也进行返回
        return WPromise.resolve(callback()).then(() => value)
      },
      this.then((reason) => {
        return WPromise.reject(callback()).then(() => {
          // 执行过程中已经整体的trycatch了
          throw reason
        })
      })
    )
  }
  // all方法将多个promise实例包装成一个promise实例，当所有的实例都成功时，新的promise实例才会成功。
  static all(promises) {
    return new WPromise((resolve, reject) => {
      const result = []
      let resovedCount = 0
      promises.forEach((promise, index) => {
        // 统一添加到then回调里面，当数量相等直接resolve
        WPromise.resolve(promise).then(
          (value) => {
            result[index] = value
            resovedCount++
            if (resolvedCount === promises.length) {
              resolve(result)
            }
          },
          (reason) => {
            reject(reason)
          }
        )
      })
    })
  }
  // race方法是将多个promise实例包装秤一个promise实例，只要有一个成功或者失败，就会立即成功或者失败。
  static race(promises) {
    return new WPromise((resolve, reject) => {
      promises.forEach((promise) => {
        WPromise.resolve(promise).then(
          (value) => {
            resolve(value)
          },
          (reason) => {
            reject(reason)
          }
        )
      })
    })
  }
}
// 这个函数用于处理then方法返回的新的Promise实例, 以及 他们成功和失败处理函数的结果。 (then方法返回的实例，then中回调的结果)

function resolvePromise(promise2, x, resolve, reject) {
  // 1. 如果 promise2 和 x 相同，抛出 TypeError
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise'))
  }

  // 标记是否已调用，防止多次调用
  let called = false

  // 2. 如果 x 是 HYPromise 实例
  if (x instanceof WPromise) {
    // 根据 x 的状态调用 resolve 或 reject
    x.then(
      (y) => {
        resolvePromise(promise2, y, resolve, reject)
      },
      (reason) => {
        reject(reason)
      }
    )
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    // 3. 如果 x 是对象或函数
    try {
      const then = x.then
      if (typeof then === 'function') {
        // 如果 then 是函数
        then.call(
          x,
          (y) => {
            if (called) return
            called = true
            // 递归处理 y
            resolvePromise(promise2, y, resolve, reject)
          },
          (reason) => {
            if (called) return
            called = true
            reject(reason)
          }
        )
      } else {
        // 如果 then 不是函数
        // 直接调用 resolve
        resolve(x)
      }
    } catch (error) {
      // 如果获取或调用 then 方法抛出异常
      if (called) return
      called = true
      reject(error)
    }
  } else {
    // 4. 如果 x 不是对象或函数
    // 直接调用 resolve
    resolve(x)
  }
}

module.exports = WPromise

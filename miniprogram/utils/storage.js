// utils/storage.js - 本地存储封装
class StorageService {
  constructor() {
    this.prefix = 'cea_' // comprehensive-evaluation-assistant
  }

  // 生成完整key
  getKey(key) {
    return this.prefix + key
  }

  // 同步存储
  set(key, data, expire) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        expire: expire ? Date.now() + expire : null
      }
      wx.setStorageSync(this.getKey(key), JSON.stringify(item))
      return true
    } catch (error) {
      console.error('Storage set error:', error)
      return false
    }
  }

  // 同步获取
  get(key) {
    try {
      const value = wx.getStorageSync(this.getKey(key))
      if (!value) return null

      const item = JSON.parse(value)
      
      // 检查是否过期
      if (item.expire && Date.now() > item.expire) {
        this.remove(key)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Storage get error:', error)
      return null
    }
  }

  // 异步存储
  async setAsync(key, data, expire) {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        expire: expire ? Date.now() + expire : null
      }
      await this.wxSetStorage(this.getKey(key), JSON.stringify(item))
      return true
    } catch (error) {
      console.error('Storage setAsync error:', error)
      return false
    }
  }

  // 异步获取
  async getAsync(key) {
    try {
      const value = await this.wxGetStorage(this.getKey(key))
      if (!value) return null

      const item = JSON.parse(value)
      
      // 检查是否过期
      if (item.expire && Date.now() > item.expire) {
        this.remove(key)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Storage getAsync error:', error)
      return null
    }
  }

  // 删除
  remove(key) {
    try {
      wx.removeStorageSync(this.getKey(key))
      return true
    } catch (error) {
      console.error('Storage remove error:', error)
      return false
    }
  }

  // 清空所有带前缀的存储
  clear() {
    try {
      const info = wx.getStorageInfoSync()
      const keys = info.keys.filter(key => key.startsWith(this.prefix))
      keys.forEach(key => {
        wx.removeStorageSync(key)
      })
      return true
    } catch (error) {
      console.error('Storage clear error:', error)
      return false
    }
  }

  // 获取存储信息
  getInfo() {
    try {
      const info = wx.getStorageInfoSync()
      const appKeys = info.keys.filter(key => key.startsWith(this.prefix))
      return {
        keys: appKeys,
        currentSize: info.currentSize,
        limitSize: info.limitSize
      }
    } catch (error) {
      console.error('Storage getInfo error:', error)
      return null
    }
  }

  // 检查key是否存在
  has(key) {
    return this.get(key) !== null
  }

  // 获取所有keys
  getKeys() {
    try {
      const info = wx.getStorageInfoSync()
      return info.keys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.replace(this.prefix, ''))
    } catch (error) {
      console.error('Storage getKeys error:', error)
      return []
    }
  }

  // 批量设置
  setBatch(items) {
    const results = []
    for (const [key, value] of Object.entries(items)) {
      results.push(this.set(key, value))
    }
    return results.every(result => result)
  }

  // 批量获取
  getBatch(keys) {
    const results = {}
    keys.forEach(key => {
      results[key] = this.get(key)
    })
    return results
  }

  // 微信API Promise化
  wxSetStorage(key, data) {
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key,
        data,
        success: resolve,
        fail: reject
      })
    })
  }

  wxGetStorage(key) {
    return new Promise((resolve, reject) => {
      wx.getStorage({
        key,
        success: (res) => resolve(res.data),
        fail: () => resolve(null) // 获取失败返回null而不是reject
      })
    })
  }

  // 缓存策略相关方法
  
  // 设置带过期时间的缓存（毫秒）
  setCache(key, data, expireMs = 5 * 60 * 1000) {
    return this.set(key, data, expireMs)
  }

  // 获取缓存，如果过期则返回null
  getCache(key) {
    return this.get(key)
  }

  // 刷新缓存（重置过期时间）
  refreshCache(key, expireMs = 5 * 60 * 1000) {
    const data = this.get(key)
    if (data !== null) {
      return this.set(key, data, expireMs)
    }
    return false
  }

  // 检查缓存是否过期
  isCacheExpired(key) {
    try {
      const value = wx.getStorageSync(this.getKey(key))
      if (!value) return true

      const item = JSON.parse(value)
      return item.expire && Date.now() > item.expire
    } catch (error) {
      return true
    }
  }

  // 获取缓存剩余时间（毫秒）
  getCacheRemainingTime(key) {
    try {
      const value = wx.getStorageSync(this.getKey(key))
      if (!value) return 0

      const item = JSON.parse(value)
      if (!item.expire) return Infinity

      const remaining = item.expire - Date.now()
      return Math.max(0, remaining)
    } catch (error) {
      return 0
    }
  }
}

// 创建存储实例
const storage = new StorageService()

// 常用缓存key常量
const CACHE_KEYS = {
  TOKEN: 'token',
  USER_INFO: 'userInfo',
  COURSES: 'cached_courses',
  ENROLLMENTS: 'cached_enrollments',
  ANALYSIS: 'cached_analysis',
  WRONG_ITEMS: 'cached_wrong_items',
  PLAYBACK_PROGRESS: 'playback_progress',
  SYSTEM_CONFIG: 'system_config',
  LAST_SYNC: 'last_sync_time'
}

module.exports = {
  ...storage,
  CACHE_KEYS,
  storage
}
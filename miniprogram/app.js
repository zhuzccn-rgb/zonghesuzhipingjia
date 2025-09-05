// app.js
const api = require('./utils/api')
const storage = require('./utils/storage')

App({
  globalData: {
    userInfo: null,
    token: null,
    systemInfo: null,
    baseUrl: 'https://your-api-domain.com/api'
  },

  onLaunch() {
    console.log('App Launch')
    this.initApp()
  },

  onShow() {
    console.log('App Show')
  },

  onHide() {
    console.log('App Hide')
  },

  onError(msg) {
    console.error('App Error:', msg)
    // 错误上报
    this.reportError(msg)
  },

  async initApp() {
    try {
      // 获取系统信息
      const systemInfo = await wx.getSystemInfo()
      this.globalData.systemInfo = systemInfo

      // 检查更新
      this.checkForUpdate()

      // 初始化用户信息
      await this.initUserInfo()

      // 预加载关键数据
      await this.preloadData()

    } catch (error) {
      console.error('App initialization failed:', error)
      this.reportError(error)
    }
  },

  async initUserInfo() {
    try {
      // 从本地缓存获取token
      const token = storage.get('token')
      if (token) {
        this.globalData.token = token
        // 验证token有效性
        const userInfo = await api.getUserInfo()
        this.globalData.userInfo = userInfo
      }
    } catch (error) {
      console.error('Init user info failed:', error)
      // 清除无效token
      storage.remove('token')
      this.globalData.token = null
    }
  },

  async preloadData() {
    try {
      // 预加载首页数据到缓存
      const cachedCourses = storage.get('cached_courses')
      if (!cachedCourses || this.isCacheExpired(cachedCourses.timestamp)) {
        const courses = await api.getCourses({ page: 1, limit: 10 })
        storage.set('cached_courses', {
          data: courses,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('Preload data failed:', error)
    }
  },

  isCacheExpired(timestamp, expireTime = 5 * 60 * 1000) {
    return Date.now() - timestamp > expireTime
  },

  checkForUpdate() {
    const updateManager = wx.getUpdateManager()
    
    updateManager.onCheckForUpdate((res) => {
      console.log('Has update:', res.hasUpdate)
    })

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })

    updateManager.onUpdateFailed(() => {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    })
  },

  reportError(error) {
    // 错误上报逻辑
    try {
      api.reportError({
        error: error.toString(),
        stack: error.stack,
        userAgent: this.globalData.systemInfo?.system || 'unknown',
        timestamp: new Date().toISOString()
      }).catch(() => {
        // 静默处理上报失败
      })
    } catch (e) {
      // 静默处理
    }
  },

  // 全局登录方法
  async login() {
    try {
      const { code } = await wx.login()
      const result = await api.login({ code })
      
      this.globalData.token = result.token
      this.globalData.userInfo = result.userInfo
      
      storage.set('token', result.token)
      return result
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  // 全局退出登录
  logout() {
    this.globalData.token = null
    this.globalData.userInfo = null
    storage.remove('token')
    storage.remove('userInfo')
  }
})
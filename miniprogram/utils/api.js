// utils/api.js - API 请求封装
const app = getApp()

class ApiService {
  constructor() {
    this.baseUrl = ''
    this.timeout = 10000
    this.retryCount = 3
  }

  // 设置基础URL
  setBaseUrl(url) {
    this.baseUrl = url
  }

  // 通用请求方法
  async request(options) {
    const {
      url,
      method = 'GET',
      data = {},
      header = {},
      showLoading = false,
      loadingText = '加载中...',
      showError = true,
      retry = 0
    } = options

    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: loadingText,
        mask: true
      })
    }

    try {
      const requestOptions = {
        url: this.baseUrl + url,
        method,
        data,
        timeout: this.timeout,
        header: {
          'Content-Type': 'application/json',
          ...header
        }
      }

      // 添加认证token
      const token = app.globalData.token
      if (token) {
        requestOptions.header.Authorization = `Bearer ${token}`
      }

      const response = await this.wxRequest(requestOptions)
      
      if (showLoading) {
        wx.hideLoading()
      }

      // 处理响应
      return this.handleResponse(response)

    } catch (error) {
      if (showLoading) {
        wx.hideLoading()
      }

      // 重试逻辑
      if (retry < this.retryCount && this.shouldRetry(error)) {
        console.log(`Request failed, retrying... (${retry + 1}/${this.retryCount})`)
        await this.delay(1000 * (retry + 1))
        return this.request({ ...options, retry: retry + 1 })
      }

      // 错误处理
      return this.handleError(error, showError)
    }
  }

  // 微信请求Promise化
  wxRequest(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        success: resolve,
        fail: reject
      })
    })
  }

  // 响应处理
  handleResponse(response) {
    const { statusCode, data } = response

    if (statusCode >= 200 && statusCode < 300) {
      if (data.code === 0 || data.success) {
        return data.data || data
      } else {
        throw new Error(data.message || '请求失败')
      }
    } else if (statusCode === 401) {
      // Token过期，重新登录
      app.logout()
      wx.navigateTo({
        url: '/pages/login/login'
      })
      throw new Error('登录已过期，请重新登录')
    } else {
      throw new Error(`请求失败 (${statusCode})`)
    }
  }

  // 错误处理
  handleError(error, showError) {
    console.error('API Error:', error)
    
    if (showError) {
      wx.showToast({
        title: error.message || '网络请求失败',
        icon: 'none',
        duration: 2000
      })
    }

    // 上报错误
    this.reportError(error)
    
    throw error
  }

  // 判断是否需要重试
  shouldRetry(error) {
    return error.errMsg && (
      error.errMsg.includes('timeout') ||
      error.errMsg.includes('fail')
    )
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 错误上报
  async reportError(error) {
    try {
      await this.request({
        url: '/error/report',
        method: 'POST',
        data: {
          message: error.message,
          stack: error.stack,
          url: error.url || 'unknown',
          timestamp: new Date().toISOString()
        },
        showError: false
      })
    } catch (e) {
      // 静默处理上报失败
    }
  }

  // GET 请求
  get(url, params = {}, options = {}) {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    
    const fullUrl = queryString ? `${url}?${queryString}` : url
    
    return this.request({
      url: fullUrl,
      method: 'GET',
      ...options
    })
  }

  // POST 请求
  post(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'POST',
      data,
      ...options
    })
  }

  // PUT 请求
  put(url, data = {}, options = {}) {
    return this.request({
      url,
      method: 'PUT',
      data,
      ...options
    })
  }

  // DELETE 请求
  delete(url, options = {}) {
    return this.request({
      url,
      method: 'DELETE',
      ...options
    })
  }

  // 文件上传
  async uploadFile(filePath, name = 'file', formData = {}) {
    const token = app.globalData.token
    
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: this.baseUrl + '/upload',
        filePath,
        name,
        formData,
        header: {
          Authorization: token ? `Bearer ${token}` : ''
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (data.code === 0) {
              resolve(data.data)
            } else {
              reject(new Error(data.message))
            }
          } catch (error) {
            reject(error)
          }
        },
        fail: reject
      })
    })
  }
}

// 创建API实例
const api = new ApiService()

// 设置基础URL
if (app.globalData.baseUrl) {
  api.setBaseUrl(app.globalData.baseUrl)
}

// 具体API方法
const apiMethods = {
  // 用户相关
  login: (data) => api.post('/auth/login', data),
  getUserInfo: () => api.get('/user/info'),
  updateProfile: (data) => api.put('/user/profile', data),

  // 课程相关
  getCourses: (params) => api.get('/courses', params),
  getCourseDetail: (id) => api.get(`/courses/${id}`),
  enrollCourse: (data) => api.post('/enroll', data),
  getEnrollments: (params) => api.get('/enrollments', params),

  // 回放相关
  getPlayback: (courseId) => api.get(`/playback/${courseId}`),
  updatePlaybackProgress: (data) => api.post('/playback/progress', data),

  // AI分析相关
  getAiAnalysis: (data) => api.post('/ai-analysis', data, { 
    showLoading: true, 
    loadingText: '正在分析...' 
  }),
  getAnalysisHistory: (params) => api.get('/analysis/history', params),

  // 错题相关
  getWrongItems: (params) => api.get('/wrong-items', params),
  addWrongItem: (data) => api.post('/wrong-items', data),
  updateWrongItem: (id, data) => api.put(`/wrong-items/${id}`, data),

  // 反馈相关
  submitFeedback: (data) => api.post('/feedback', data),
  getFeedbackList: (params) => api.get('/feedback', params),

  // 消息订阅
  subscribeMessage: (data) => api.post('/subscribe', data),
  getSubscriptions: () => api.get('/subscriptions'),

  // 错误上报
  reportError: (data) => api.post('/error/report', data, { showError: false })
}

module.exports = {
  ...apiMethods,
  api
}
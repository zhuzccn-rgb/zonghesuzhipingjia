// pages/index/index.js
const app = getApp()
const api = require('../../utils/api')
const storage = require('../../utils/storage')

Page({
  data: {
    userInfo: {},
    greeting: '早上好',
    stats: {
      totalCourses: 0,
      completedCourses: 0,
      studyHours: 0
    },
    recentCourses: [],
    upcomingCourse: null,
    loading: false,
    showSubscribeModal: false
  },

  onLoad(options) {
    console.log('Index page loaded')
    this.initPage()
  },

  onShow() {
    console.log('Index page show')
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData(true)
  },

  onReachBottom() {
    this.loadMoreCourses()
  },

  onShareAppMessage() {
    return {
      title: '综合素质评价助手',
      path: '/pages/index/index',
      imageUrl: '/assets/share-cover.png'
    }
  },

  async initPage() {
    try {
      // 设置问候语
      this.setGreeting()
      
      // 获取用户信息
      await this.getUserInfo()
      
      // 加载缓存数据
      this.loadCachedData()
      
      // 加载最新数据
      await this.loadData()
      
      // 检查消息订阅
      this.checkSubscription()
      
    } catch (error) {
      console.error('Init page error:', error)
      this.showError('页面初始化失败')
    }
  },

  async refreshData(showRefresh = false) {
    if (showRefresh) {
      wx.showNavigationBarLoading()
    }

    try {
      await Promise.all([
        this.loadUserStats(),
        this.loadRecentCourses(),
        this.loadUpcomingCourse()
      ])
    } catch (error) {
      console.error('Refresh data error:', error)
    } finally {
      if (showRefresh) {
        wx.hideNavigationBarLoading()
        wx.stopPullDownRefresh()
      }
    }
  },

  setGreeting() {
    const hour = new Date().getHours()
    let greeting = '早上好'
    
    if (hour >= 12 && hour < 18) {
      greeting = '下午好'
    } else if (hour >= 18) {
      greeting = '晚上好'
    }
    
    this.setData({ greeting })
  },

  async getUserInfo() {
    try {
      const userInfo = app.globalData.userInfo || storage.get('userInfo')
      if (userInfo) {
        this.setData({ userInfo })
      } else {
        // 引导用户登录
        this.showLoginModal()
      }
    } catch (error) {
      console.error('Get user info error:', error)
    }
  },

  loadCachedData() {
    // 从缓存加载数据，提升用户体验
    const cachedCourses = storage.get('cached_courses')
    const cachedStats = storage.get('cached_stats')
    
    if (cachedCourses && cachedCourses.data) {
      this.setData({
        recentCourses: cachedCourses.data.slice(0, 3)
      })
    }
    
    if (cachedStats) {
      this.setData({
        stats: cachedStats
      })
    }
  },

  async loadData() {
    this.setData({ loading: true })
    
    try {
      await Promise.all([
        this.loadUserStats(),
        this.loadRecentCourses(),
        this.loadUpcomingCourse()
      ])
    } catch (error) {
      console.error('Load data error:', error)
      this.showError('数据加载失败，请稍后重试')
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadUserStats() {
    try {
      const stats = await api.get('/user/stats')
      this.setData({ stats })
      
      // 缓存统计数据
      storage.setCache('cached_stats', stats, 10 * 60 * 1000) // 10分钟
    } catch (error) {
      console.error('Load user stats error:', error)
    }
  },

  async loadRecentCourses() {
    try {
      const courses = await api.getCourses({ 
        page: 1, 
        limit: 3, 
        sort: 'recent' 
      })
      
      this.setData({
        recentCourses: courses.list || courses
      })
      
      // 缓存课程数据
      storage.setCache('cached_courses', { 
        data: courses.list || courses,
        timestamp: Date.now()
      }, 5 * 60 * 1000) // 5分钟
      
    } catch (error) {
      console.error('Load recent courses error:', error)
    }
  },

  async loadUpcomingCourse() {
    try {
      const upcoming = await api.get('/courses/upcoming')
      if (upcoming) {
        this.setData({ upcomingCourse: upcoming })
      }
    } catch (error) {
      console.error('Load upcoming course error:', error)
    }
  },

  async loadMoreCourses() {
    // 实现上拉加载更多逻辑
    console.log('Load more courses')
  },

  // 事件处理方法
  navigateToCourses() {
    wx.switchTab({
      url: '/pages/courses/courses'
    })
  },

  navigateToAnalysis() {
    wx.switchTab({
      url: '/pages/analysis/analysis'
    })
  },

  navigateToWrongItems() {
    wx.navigateTo({
      url: '/pages/wrong-items/wrong-items'
    })
  },

  showComingSoon() {
    wx.showToast({
      title: '功能即将上线',
      icon: 'none'
    })
  },

  onCourseCardTap(e) {
    const course = e.detail.course || e.currentTarget.dataset.course
    if (course) {
      wx.navigateTo({
        url: `/pages/course-detail/course-detail?id=${course.id}`
      })
    }
  },

  async onEnrollCourse(e) {
    const course = e.detail.course
    if (!course) return

    try {
      wx.showLoading({ title: '报名中...' })
      
      const result = await api.enrollCourse({
        courseId: course.id,
        userId: app.globalData.userInfo?.id
      })
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '报名成功',
          icon: 'success'
        })
        
        // 刷新课程状态
        this.refreshData()
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('Enroll course error:', error)
      wx.showToast({
        title: error.message || '报名失败',
        icon: 'none'
      })
    }
  },

  dismissReminder() {
    this.setData({ upcomingCourse: null })
  },

  joinCourse(e) {
    const course = e.currentTarget.dataset.course
    if (course) {
      wx.navigateTo({
        url: `/pages/course-detail/course-detail?id=${course.id}&autoJoin=true`
      })
    }
  },

  // 消息订阅相关
  async checkSubscription() {
    try {
      const subscriptions = await api.getSubscriptions()
      if (!subscriptions || subscriptions.length === 0) {
        // 延迟显示订阅弹窗
        setTimeout(() => {
          this.setData({ showSubscribeModal: true })
        }, 3000)
      }
    } catch (error) {
      console.error('Check subscription error:', error)
    }
  },

  async onSubscribeConfirm() {
    try {
      const result = await wx.requestSubscribeMessage({
        tmplIds: [
          'TEMPLATE_ID_COURSE_REMINDER',
          'TEMPLATE_ID_HOMEWORK_REMINDER',
          'TEMPLATE_ID_ANALYSIS_READY'
        ]
      })
      
      // 提交订阅结果到后端
      await api.subscribeMessage({
        subscriptions: result
      })
      
      this.setData({ showSubscribeModal: false })
      
      wx.showToast({
        title: '订阅成功',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('Subscribe error:', error)
      this.setData({ showSubscribeModal: false })
    }
  },

  onSubscribeCancel() {
    this.setData({ showSubscribeModal: false })
  },

  // 工具方法
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
  },

  showLoginModal() {
    wx.showModal({
      title: '登录提示',
      content: '请先登录以获取完整功能体验',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/login'
          })
        }
      }
    })
  }
})
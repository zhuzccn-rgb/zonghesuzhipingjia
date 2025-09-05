// pages/courses/courses.js
const app = getApp()
const api = require('../../utils/api')
const storage = require('../../utils/storage')

Page({
  data: {
    courses: [],
    searchKeyword: '',
    activeFilter: 'all',
    loading: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    emptyMessage: '暂无课程',
    showFilterPopup: false,
    courseTypes: [
      { label: '语文', value: 'chinese', selected: false },
      { label: '数学', value: 'math', selected: false },
      { label: '英语', value: 'english', selected: false },
      { label: '科学', value: 'science', selected: false },
      { label: '艺术', value: 'art', selected: false }
    ],
    difficultyLevels: [
      { label: '基础', value: 'basic', selected: false },
      { label: '进阶', value: 'intermediate', selected: false },
      { label: '高级', value: 'advanced', selected: false }
    ]
  },

  onLoad(options) {
    console.log('Courses page loaded', options)
    
    // 处理页面参数
    if (options.filter) {
      this.setData({ activeFilter: options.filter })
    }
    if (options.keyword) {
      this.setData({ searchKeyword: options.keyword })
    }
    
    this.initPage()
  },

  onShow() {
    console.log('Courses page show')
    // 检查是否需要刷新数据
    this.checkDataFreshness()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onReachBottom() {
    this.loadMore()
  },

  onShareAppMessage() {
    return {
      title: '发现优质课程',
      path: '/pages/courses/courses',
      imageUrl: '/assets/share-courses.png'
    }
  },

  async initPage() {
    try {
      // 加载缓存数据
      this.loadCachedData()
      
      // 加载最新数据
      await this.loadCourses(true)
      
    } catch (error) {
      console.error('Init page error:', error)
      this.showError('页面加载失败')
    }
  },

  loadCachedData() {
    const cachedCourses = storage.get('cached_courses')
    if (cachedCourses && cachedCourses.data) {
      this.setData({
        courses: cachedCourses.data
      })
    }
  },

  async checkDataFreshness() {
    const lastUpdate = storage.get('courses_last_update')
    const now = Date.now()
    
    // 如果超过5分钟，刷新数据
    if (!lastUpdate || now - lastUpdate > 5 * 60 * 1000) {
      await this.loadCourses(true)
    }
  },

  async loadCourses(refresh = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const params = {
        page: refresh ? 1 : this.data.currentPage,
        limit: this.data.pageSize,
        keyword: this.data.searchKeyword,
        filter: this.data.activeFilter,
        ...this.getFilterParams()
      }
      
      const result = await api.getCourses(params)
      const newCourses = result.list || result.data || []
      
      this.setData({
        courses: refresh ? newCourses : [...this.data.courses, ...newCourses],
        currentPage: refresh ? 2 : this.data.currentPage + 1,
        hasMore: newCourses.length === this.data.pageSize,
        emptyMessage: this.getEmptyMessage()
      })
      
      // 缓存数据
      if (refresh) {
        storage.setCache('cached_courses', {
          data: newCourses,
          timestamp: Date.now()
        }, 5 * 60 * 1000)
        storage.set('courses_last_update', Date.now())
      }
      
    } catch (error) {
      console.error('Load courses error:', error)
      this.showError('加载课程失败')
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  async refreshData() {
    await this.loadCourses(true)
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return
    await this.loadCourses(false)
  },

  getFilterParams() {
    const params = {}
    
    // 课程类型筛选
    const selectedTypes = this.data.courseTypes
      .filter(type => type.selected)
      .map(type => type.value)
    if (selectedTypes.length > 0) {
      params.courseTypes = selectedTypes.join(',')
    }
    
    // 难度等级筛选
    const selectedLevels = this.data.difficultyLevels
      .filter(level => level.selected)
      .map(level => level.value)
    if (selectedLevels.length > 0) {
      params.difficulty = selectedLevels.join(',')
    }
    
    return params
  },

  getEmptyMessage() {
    if (this.data.searchKeyword) {
      return `未找到"${this.data.searchKeyword}"相关课程`
    }
    
    switch (this.data.activeFilter) {
      case 'enrolled':
        return '还没有报名任何课程'
      case 'ongoing':
        return '暂无进行中的课程'
      case 'completed':
        return '还没有完成的课程'
      case 'favorite':
        return '还没有收藏任何课程'
      default:
        return '暂无课程'
    }
  },

  // 搜索相关
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearchConfirm() {
    this.refreshData()
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.refreshData()
  },

  // 筛选相关
  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter
    if (filter === this.data.activeFilter) return
    
    this.setData({ activeFilter: filter })
    this.refreshData()
  },

  resetFilter() {
    this.setData({ activeFilter: 'all' })
    this.refreshData()
  },

  showFilterPopup() {
    this.setData({ showFilterPopup: true })
  },

  hideFilterPopup() {
    this.setData({ showFilterPopup: false })
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  onFilterOptionTap(e) {
    const { type, value } = e.currentTarget.dataset
    
    if (type === 'courseType') {
      const courseTypes = this.data.courseTypes.map(item => ({
        ...item,
        selected: item.value === value ? !item.selected : item.selected
      }))
      this.setData({ courseTypes })
    } else if (type === 'difficulty') {
      const difficultyLevels = this.data.difficultyLevels.map(item => ({
        ...item,
        selected: item.value === value ? !item.selected : item.selected
      }))
      this.setData({ difficultyLevels })
    }
  },

  resetFilters() {
    this.setData({
      courseTypes: this.data.courseTypes.map(item => ({ ...item, selected: false })),
      difficultyLevels: this.data.difficultyLevels.map(item => ({ ...item, selected: false }))
    })
  },

  applyFilters() {
    this.hideFilterPopup()
    this.refreshData()
  },

  // 课程操作
  onCourseCardTap(e) {
    const course = e.detail.course
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
        
        // 更新课程状态
        this.updateCourseStatus(course.id, { enrolled: true })
      }
      
    } catch (error) {
      wx.hideLoading()
      console.error('Enroll course error:', error)
      this.showError(error.message || '报名失败')
    }
  },

  async onToggleFavorite(e) {
    const course = e.detail.course
    if (!course) return

    try {
      const result = await api.post('/courses/favorite', {
        courseId: course.id,
        action: course.favorited ? 'remove' : 'add'
      })
      
      if (result.success) {
        this.updateCourseStatus(course.id, { 
          favorited: !course.favorited 
        })
        
        wx.showToast({
          title: course.favorited ? '取消收藏' : '收藏成功',
          icon: 'success'
        })
      }
      
    } catch (error) {
      console.error('Toggle favorite error:', error)
      this.showError('操作失败')
    }
  },

  updateCourseStatus(courseId, updates) {
    const courses = this.data.courses.map(course => {
      if (course.id === courseId) {
        return { ...course, ...updates }
      }
      return course
    })
    
    this.setData({ courses })
    
    // 更新缓存
    const cachedCourses = storage.get('cached_courses')
    if (cachedCourses) {
      cachedCourses.data = courses
      storage.setCache('cached_courses', cachedCourses, 5 * 60 * 1000)
    }
  },

  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
  }
})
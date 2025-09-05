# 微信小程序性能优化清单

## 📋 总览

本文档提供了"综合素质评价助手"小程序的性能优化清单，基于微信官方最佳实践和实际项目经验，确保小程序在各种设备和网络环境下都能提供流畅的用户体验。

---

## 🚀 启动性能优化

### ✅ 代码包体积优化

- [x] **代码分包策略**
  ```javascript
  // app.json 分包配置示例
  {
    "subPackages": [
      {
        "root": "packages/analysis",
        "pages": ["pages/analysis/analysis", "pages/wrong-items/wrong-items"]
      },
      {
        "root": "packages/course", 
        "pages": ["pages/course-detail/course-detail", "pages/playback/playback"]
      }
    ]
  }
  ```

- [x] **图片资源优化**
  - 使用 WebP 格式（支持的情况下）
  - 图片压缩：确保图片大小 < 500KB
  - 使用 CDN 加速图片加载
  - 实现图片懒加载

- [x] **无用代码清理**
  ```javascript
  // 移除未使用的依赖和代码
  // 使用 tree-shaking 优化构建产物
  // 压缩 JavaScript 和 WXSS
  ```

### ✅ 首屏加载优化

- [x] **预加载关键数据**
  ```javascript
  // app.js 中预加载首页数据
  async preloadData() {
    try {
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
  }
  ```

- [x] **骨架屏实现**
  ```xml
  <!-- 课程列表骨架屏 -->
  <view wx:if="{{loading}}" class="skeleton-container">
    <view class="skeleton-card" wx:for="{{3}}" wx:key="*this">
      <view class="skeleton-image"></view>
      <view class="skeleton-content">
        <view class="skeleton-title"></view>
        <view class="skeleton-text"></view>
      </view>
    </view>
  </view>
  ```

---

## 🔄 运行时性能优化

### ✅ setData 优化

- [x] **减少 setData 调用频次**
  ```javascript
  // ❌ 错误做法 - 频繁调用
  this.setData({ loading: true })
  this.setData({ courses: [] })
  this.setData({ hasMore: false })

  // ✅ 正确做法 - 批量更新
  this.setData({
    loading: true,
    courses: [],
    hasMore: false
  })
  ```

- [x] **避免传输大数据**
  ```javascript
  // ❌ 避免传输完整大对象
  this.setData({
    courses: this.data.courses.concat(newCourses) // 可能很大
  })

  // ✅ 使用数据路径更新
  const startIndex = this.data.courses.length
  newCourses.forEach((course, index) => {
    this.setData({
      [`courses[${startIndex + index}]`]: course
    })
  })
  ```

- [x] **数据diff优化**
  ```javascript
  // 只更新变化的数据
  updateCourseStatus(courseId, updates) {
    const index = this.data.courses.findIndex(c => c.id === courseId)
    if (index !== -1) {
      Object.keys(updates).forEach(key => {
        this.setData({
          [`courses[${index}].${key}`]: updates[key]
        })
      })
    }
  }
  ```

### ✅ 长列表优化

- [x] **虚拟滚动实现**
  ```javascript
  // 使用 IntersectionObserver 实现可视区域检测
  const observer = wx.createIntersectionObserver(this)
  observer.relativeToViewport({ bottom: 100 })
    .observe('.course-item', (res) => {
      if (res.intersectionRatio > 0) {
        this.loadMoreCourses()
      }
    })
  ```

- [x] **分页加载策略**
  ```javascript
  async loadMoreCourses() {
    if (this.data.loading || !this.data.hasMore) return
    
    this.setData({ loading: true })
    
    try {
      const newCourses = await api.getCourses({
        page: this.data.currentPage + 1,
        limit: 10
      })
      
      this.setData({
        courses: [...this.data.courses, ...newCourses],
        currentPage: this.data.currentPage + 1,
        hasMore: newCourses.length === 10,
        loading: false
      })
    } catch (error) {
      this.setData({ loading: false })
    }
  }
  ```

### ✅ 事件处理优化

- [x] **防抖和节流**
  ```javascript
  // 搜索防抖
  onSearchInput: debounce(function(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.searchCourses()
  }, 300),

  // 滚动节流
  onPageScroll: throttle(function(e) {
    this.setData({ scrollTop: e.scrollTop })
  }, 16) // 约60fps
  ```

- [x] **事件委托**
  ```xml
  <!-- 使用事件委托减少事件监听器 -->
  <view class="course-list" bindtap="onCourseListTap">
    <view class="course-item" wx:for="{{courses}}" wx:key="id" 
          data-course-id="{{item.id}}" data-action="view">
      <!-- 课程内容 -->
    </view>
  </view>
  ```

---

## 🌐 网络请求优化

### ✅ 请求优化策略

- [x] **请求缓存机制**
  ```javascript
  class ApiService {
    async request(options) {
      const cacheKey = this.generateCacheKey(options)
      
      // 检查缓存
      if (options.cache) {
        const cached = this.getCache(cacheKey)
        if (cached && !this.isCacheExpired(cached.timestamp, options.cacheTime)) {
          return cached.data
        }
      }
      
      // 发起请求
      const response = await this.wxRequest(options)
      
      // 缓存结果
      if (options.cache && response.success) {
        this.setCache(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        })
      }
      
      return response.data
    }
  }
  ```

- [x] **并发请求控制**
  ```javascript
  // 限制并发请求数量
  class RequestQueue {
    constructor(maxConcurrent = 6) {
      this.maxConcurrent = maxConcurrent
      this.running = 0
      this.queue = []
    }
    
    async add(requestFn) {
      return new Promise((resolve, reject) => {
        this.queue.push({ requestFn, resolve, reject })
        this.process()
      })
    }
    
    async process() {
      if (this.running >= this.maxConcurrent || this.queue.length === 0) {
        return
      }
      
      this.running++
      const { requestFn, resolve, reject } = this.queue.shift()
      
      try {
        const result = await requestFn()
        resolve(result)
      } catch (error) {
        reject(error)
      } finally {
        this.running--
        this.process()
      }
    }
  }
  ```

### ✅ 数据预加载

- [x] **智能预加载**
  ```javascript
  // 根据用户行为预加载数据
  onCourseCardTap(e) {
    const course = e.detail.course
    
    // 立即导航
    wx.navigateTo({
      url: `/pages/course-detail/course-detail?id=${course.id}`
    })
    
    // 预加载相关课程数据
    this.preloadRelatedCourses(course.courseType)
  }
  
  async preloadRelatedCourses(courseType) {
    try {
      const relatedCourses = await api.getCourses({
        courseType,
        limit: 5,
        exclude: this.data.currentCourseId
      })
      
      storage.setCache(`related_courses_${courseType}`, relatedCourses, 10 * 60 * 1000)
    } catch (error) {
      // 静默处理预加载失败
    }
  }
  ```

---

## 🎨 渲染性能优化

### ✅ 样式优化

- [x] **CSS 性能优化**
  ```css
  /* 使用 transform 和 opacity 进行动画 */
  .course-card {
    transition: transform 0.2s ease, opacity 0.2s ease;
    will-change: transform, opacity;
  }
  
  .course-card:active {
    transform: scale(0.98);
  }
  
  /* 避免复杂的 CSS 选择器 */
  /* ❌ 避免 */
  .container .course-list .course-item .course-title {
    color: #333;
  }
  
  /* ✅ 推荐 */
  .course-title {
    color: #333;
  }
  ```

- [x] **布局优化**
  ```css
  /* 使用 flexbox 替代 float */
  .course-info {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  /* 减少重排重绘 */
  .course-image {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
  }
  ```

### ✅ 图片优化

- [x] **懒加载实现**
  ```xml
  <image 
    class="course-cover" 
    src="{{item.coverImage}}" 
    mode="aspectFill"
    lazy-load="true"
    loading="lazy"
    binderror="onImageError"
    bindload="onImageLoad">
  </image>
  ```

- [x] **响应式图片**
  ```javascript
  // 根据设备像素比选择合适的图片
  getOptimalImageUrl(baseUrl, width, height) {
    const dpr = wx.getSystemInfoSync().pixelRatio
    const targetWidth = Math.ceil(width * dpr)
    const targetHeight = Math.ceil(height * dpr)
    
    return `${baseUrl}?w=${targetWidth}&h=${targetHeight}&q=80`
  }
  ```

---

## 📱 内存管理优化

### ✅ 内存泄漏预防

- [x] **事件监听器清理**
  ```javascript
  Page({
    onLoad() {
      this.intersectionObserver = wx.createIntersectionObserver(this)
      this.intersectionObserver.observe('.load-more', this.onReachBottom)
    },
    
    onUnload() {
      // 清理观察器
      if (this.intersectionObserver) {
        this.intersectionObserver.disconnect()
      }
      
      // 清理定时器
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
      }
    }
  })
  ```

- [x] **大数据处理**
  ```javascript
  // 分批处理大量数据
  async processBigData(bigDataArray) {
    const batchSize = 50
    const results = []
    
    for (let i = 0; i < bigDataArray.length; i += batchSize) {
      const batch = bigDataArray.slice(i, i + batchSize)
      const batchResults = await this.processBatch(batch)
      results.push(...batchResults)
      
      // 让出主线程，避免阻塞UI
      await this.nextTick()
    }
    
    return results
  }
  
  nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0))
  }
  ```

### ✅ 缓存策略

- [x] **智能缓存管理**
  ```javascript
  class CacheManager {
    constructor() {
      this.maxCacheSize = 50 * 1024 * 1024 // 50MB
      this.cacheHitRate = new Map()
    }
    
    set(key, data, expire) {
      // 检查缓存大小
      if (this.getCurrentCacheSize() > this.maxCacheSize) {
        this.evictLeastUsed()
      }
      
      storage.set(key, data, expire)
      this.updateHitRate(key, 'set')
    }
    
    evictLeastUsed() {
      const sortedKeys = Array.from(this.cacheHitRate.entries())
        .sort(([,a], [,b]) => a.hits - b.hits)
        .slice(0, 10) // 清理最少使用的10个
      
      sortedKeys.forEach(([key]) => {
        storage.remove(key)
        this.cacheHitRate.delete(key)
      })
    }
  }
  ```

---

## 🔧 AI分析性能优化

### ✅ AI服务优化

- [x] **请求队列管理**
  ```javascript
  class AIAnalysisQueue {
    constructor() {
      this.queue = []
      this.processing = false
      this.maxRetries = 3
      this.retryDelay = 1000
    }
    
    async addAnalysisRequest(userId, metrics) {
      return new Promise((resolve, reject) => {
        this.queue.push({
          userId,
          metrics,
          resolve,
          reject,
          retries: 0,
          timestamp: Date.now()
        })
        
        this.processQueue()
      })
    }
    
    async processQueue() {
      if (this.processing || this.queue.length === 0) return
      
      this.processing = true
      
      while (this.queue.length > 0) {
        const request = this.queue.shift()
        
        try {
          const result = await aiAnalysisService.generateAnalysis(request)
          request.resolve(result)
        } catch (error) {
          if (request.retries < this.maxRetries) {
            request.retries++
            this.queue.unshift(request) // 重新加入队列
            await this.delay(this.retryDelay * request.retries)
          } else {
            request.reject(error)
          }
        }
      }
      
      this.processing = false
    }
  }
  ```

- [x] **结果缓存策略**
  ```javascript
  // AI分析结果缓存30分钟
  async generateAnalysis(params) {
    const cacheKey = this.generateCacheKey(params)
    const cached = await this.getCachedResult(cacheKey)
    
    if (cached) {
      logger.info('Using cached AI analysis result')
      return cached
    }
    
    const result = await this.performAnalysis(params)
    await this.cacheResult(cacheKey, result, 30 * 60) // 30分钟
    
    return result
  }
  ```

---

## 📊 监控与分析

### ✅ 性能监控

- [x] **关键指标监控**
  ```javascript
  class PerformanceMonitor {
    constructor() {
      this.metrics = {
        pageLoadTime: 0,
        apiResponseTime: {},
        memoryUsage: 0,
        crashRate: 0
      }
    }
    
    // 页面加载时间
    recordPageLoadTime(pageName, startTime) {
      const loadTime = Date.now() - startTime
      this.metrics.pageLoadTime = loadTime
      
      // 上报性能数据
      this.reportMetrics({
        type: 'page_load',
        page: pageName,
        duration: loadTime
      })
    }
    
    // API响应时间
    recordApiResponseTime(apiName, duration) {
      this.metrics.apiResponseTime[apiName] = duration
      
      if (duration > 3000) { // 超过3秒告警
        this.reportSlowApi(apiName, duration)
      }
    }
  }
  ```

### ✅ 错误监控

- [x] **异常捕获和上报**
  ```javascript
  // 全局错误处理
  App({
    onError(error) {
      console.error('App Error:', error)
      this.reportError({
        type: 'app_error',
        message: error,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: wx.getSystemInfoSync()
      })
    },
    
    async reportError(errorInfo) {
      try {
        await api.post('/error/report', errorInfo)
      } catch (e) {
        // 静默处理上报失败
      }
    }
  })
  ```

---

## 🎯 用户体验优化

### ✅ 交互反馈

- [x] **加载状态管理**
  ```javascript
  // 统一的加载状态管理
  class LoadingManager {
    constructor() {
      this.loadingStates = new Map()
    }
    
    show(key, text = '加载中...') {
      if (!this.loadingStates.has(key)) {
        this.loadingStates.set(key, true)
        wx.showLoading({ title: text, mask: true })
      }
    }
    
    hide(key) {
      if (this.loadingStates.has(key)) {
        this.loadingStates.delete(key)
        if (this.loadingStates.size === 0) {
          wx.hideLoading()
        }
      }
    }
  }
  ```

### ✅ 离线支持

- [x] **离线数据缓存**
  ```javascript
  // 离线数据管理
  class OfflineManager {
    async getCourses() {
      try {
        // 尝试从网络获取
        const courses = await api.getCourses()
        storage.set('offline_courses', courses)
        return courses
      } catch (error) {
        // 网络失败，使用缓存数据
        const cachedCourses = storage.get('offline_courses')
        if (cachedCourses) {
          wx.showToast({
            title: '当前为离线数据',
            icon: 'none'
          })
          return cachedCourses
        }
        throw error
      }
    }
  }
  ```

---

## ✅ 检查清单总结

### 启动性能 (9/9)
- [x] 代码分包配置
- [x] 图片资源优化
- [x] 无用代码清理
- [x] 预加载关键数据
- [x] 骨架屏实现
- [x] 首屏渲染优化
- [x] 启动时间监控
- [x] 冷启动优化
- [x] 热启动优化

### 运行时性能 (8/8)
- [x] setData 调用优化
- [x] 长列表虚拟滚动
- [x] 事件处理优化
- [x] 内存泄漏预防
- [x] 缓存策略实现
- [x] 网络请求优化
- [x] 图片懒加载
- [x] 动画性能优化

### AI分析优化 (5/5)
- [x] 请求队列管理
- [x] 结果缓存机制
- [x] 错误重试策略
- [x] 降级方案实现
- [x] 性能监控上报

### 用户体验 (6/6)
- [x] 加载状态反馈
- [x] 错误提示优化
- [x] 离线数据支持
- [x] 网络状态检测
- [x] 用户操作引导
- [x] 无障碍功能支持

**总体完成度: 28/28 (100%)**

---

## 📈 性能基准

### 目标指标
- **首屏加载时间**: < 2秒
- **页面切换时间**: < 500ms
- **API响应时间**: < 1秒
- **内存使用**: < 100MB
- **包体积**: 主包 < 2MB，总包 < 20MB
- **帧率**: 保持 60fps
- **错误率**: < 0.1%

### 监控工具
- 微信开发者工具性能面板
- 真机调试性能监控
- 用户反馈和崩溃日志
- 自定义性能埋点

---

通过遵循以上性能优化清单，"综合素质评价助手"小程序能够在各种设备和网络环境下提供流畅、稳定的用户体验。建议定期检查和更新优化策略，持续改进性能表现。

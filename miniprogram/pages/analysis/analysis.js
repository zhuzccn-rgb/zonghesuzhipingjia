// pages/analysis/analysis.js
const app = getApp()
const api = require('../../utils/api')
const storage = require('../../utils/storage')

// 引入ECharts
let ec = require('../../libs/ec-canvas/echarts')

Page({
  data: {
    // 基础数据
    overallScore: 0,
    scoreTrend: 0,
    analysisCount: 0,
    improvementRate: 0,
    lastUpdateTime: '',
    
    // 状态
    generating: false,
    loading: false,
    
    // 时间选择
    selectedPeriod: 'month',
    selectedTrendType: 'overall',
    
    // 分析结果
    radarData: null,
    analysisResult: null,
    trendData: null,
    
    // 快捷入口数据
    wrongItemsCount: 0,
    feedbackCount: 0,
    
    // 弹窗
    showAnalysisModal: false,
    selectedDimension: null,
    
    // 图表配置
    radarChart: null,
    trendChart: null
  },

  onLoad(options) {
    console.log('Analysis page loaded')
    this.initPage()
  },

  onShow() {
    console.log('Analysis page show')
    this.refreshQuickAccessData()
  },

  onReady() {
    // 初始化图表
    this.initCharts()
  },

  onPullDownRefresh() {
    this.refreshData()
  },

  onShareAppMessage() {
    return {
      title: '我的学习分析报告',
      path: '/pages/analysis/analysis',
      imageUrl: '/assets/share-analysis.png'
    }
  },

  async initPage() {
    try {
      // 加载缓存数据
      this.loadCachedData()
      
      // 加载最新数据
      await this.loadAnalysisData()
      
    } catch (error) {
      console.error('Init page error:', error)
      this.showError('页面加载失败')
    }
  },

  loadCachedData() {
    const cachedAnalysis = storage.get('cached_analysis')
    if (cachedAnalysis) {
      this.setData({
        overallScore: cachedAnalysis.overallScore || 0,
        analysisCount: cachedAnalysis.analysisCount || 0,
        radarData: cachedAnalysis.radarData,
        analysisResult: cachedAnalysis.analysisResult,
        lastUpdateTime: cachedAnalysis.lastUpdateTime || ''
      })
      
      // 渲染缓存的图表数据
      if (cachedAnalysis.radarData) {
        this.renderRadarChart(cachedAnalysis.radarData)
      }
    }
  },

  async loadAnalysisData() {
    this.setData({ loading: true })
    
    try {
      const [analysisOverview, trendData] = await Promise.all([
        api.get('/analysis/overview', {
          period: this.data.selectedPeriod
        }),
        api.get('/analysis/trend', {
          type: this.data.selectedTrendType,
          period: this.data.selectedPeriod
        })
      ])
      
      this.setData({
        overallScore: analysisOverview.overallScore || 0,
        scoreTrend: analysisOverview.scoreTrend || 0,
        analysisCount: analysisOverview.analysisCount || 0,
        improvementRate: analysisOverview.improvementRate || 0,
        lastUpdateTime: this.formatTime(analysisOverview.lastUpdateTime),
        radarData: analysisOverview.radarData,
        analysisResult: analysisOverview.analysisResult,
        trendData
      })
      
      // 渲染图表
      if (analysisOverview.radarData) {
        this.renderRadarChart(analysisOverview.radarData)
      }
      if (trendData) {
        this.renderTrendChart(trendData)
      }
      
      // 缓存数据
      storage.setCache('cached_analysis', {
        ...analysisOverview,
        lastUpdateTime: this.data.lastUpdateTime
      }, 10 * 60 * 1000) // 10分钟缓存
      
    } catch (error) {
      console.error('Load analysis data error:', error)
      this.showError('加载分析数据失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  async refreshData() {
    await this.loadAnalysisData()
    wx.stopPullDownRefresh()
  },

  async refreshQuickAccessData() {
    try {
      const [wrongItems, feedback] = await Promise.all([
        api.get('/wrong-items/count'),
        api.get('/feedback/unread-count')
      ])
      
      this.setData({
        wrongItemsCount: wrongItems.count || 0,
        feedbackCount: feedback.count || 0
      })
      
    } catch (error) {
      console.error('Refresh quick access data error:', error)
    }
  },

  // 生成AI分析
  async generateAnalysis() {
    if (this.data.generating) return
    
    try {
      this.setData({ generating: true })
      
      // 获取学生学习指标
      const metrics = await this.collectLearningMetrics()
      
      const result = await api.getAiAnalysis({
        userId: app.globalData.userInfo?.id,
        metrics,
        analysisType: 'comprehensive'
      })
      
      this.setData({
        radarData: result.radarData,
        analysisResult: result.analysisResult,
        overallScore: result.overallScore,
        lastUpdateTime: this.formatTime(new Date())
      })
      
      // 渲染新的图表数据
      if (result.radarData) {
        this.renderRadarChart(result.radarData)
      }
      
      // 更新缓存
      storage.setCache('cached_analysis', {
        radarData: result.radarData,
        analysisResult: result.analysisResult,
        overallScore: result.overallScore,
        lastUpdateTime: this.data.lastUpdateTime
      }, 10 * 60 * 1000)
      
      wx.showToast({
        title: '分析完成',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('Generate analysis error:', error)
      this.showError(error.message || 'AI分析失败，请稍后重试')
    } finally {
      this.setData({ generating: false })
    }
  },

  // 收集学习指标
  async collectLearningMetrics() {
    try {
      const metrics = await api.get('/user/learning-metrics', {
        period: this.data.selectedPeriod
      })
      
      return {
        homeworkAccuracy: metrics.homeworkAccuracy || 0,
        testmark: metrics.testmark || 0,
        interactionCount: metrics.interactionCount || 0,
        citation: metrics.citation || false,
        attendanceRate: metrics.attendanceRate || 0,
        submissionRate: metrics.submissionRate || 0
      }
    } catch (error) {
      console.error('Collect metrics error:', error)
      return {}
    }
  },

  // 时间周期切换
  onPeriodChange(e) {
    const period = e.currentTarget.dataset.period
    if (period === this.data.selectedPeriod) return
    
    this.setData({ selectedPeriod: period })
    this.loadAnalysisData()
  },

  // 趋势类型切换
  onTrendTypeChange(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.selectedTrendType) return
    
    this.setData({ selectedTrendType: type })
    this.loadTrendData()
  },

  async loadTrendData() {
    try {
      const trendData = await api.get('/analysis/trend', {
        type: this.data.selectedTrendType,
        period: this.data.selectedPeriod
      })
      
      this.setData({ trendData })
      this.renderTrendChart(trendData)
      
    } catch (error) {
      console.error('Load trend data error:', error)
    }
  },

  // 图表初始化
  initCharts() {
    // 雷达图
    this.radarChart = ec.init(this.selectComponent('#radarChart'))
    
    // 趋势图
    this.trendChart = ec.init(this.selectComponent('#trendChart'))
  },

  // 渲染雷达图
  renderRadarChart(data) {
    if (!this.radarChart || !data) return
    
    const option = {
      tooltip: {
        trigger: 'item'
      },
      radar: {
        indicator: data.dimensions.map(dim => ({
          name: dim.name,
          max: 100
        })),
        center: ['50%', '50%'],
        radius: '70%',
        startAngle: 90,
        splitNumber: 4,
        shape: 'polygon',
        name: {
          formatter: '{value}',
          textStyle: {
            color: '#666',
            fontSize: 12
          }
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(114, 172, 209, 0.1)', 'rgba(114, 172, 209, 0.05)']
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(114, 172, 209, 0.3)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(114, 172, 209, 0.3)'
          }
        }
      },
      series: [{
        type: 'radar',
        data: [{
          value: data.dimensions.map(dim => dim.score),
          name: '当前能力',
          areaStyle: {
            color: 'rgba(0, 122, 255, 0.3)'
          },
          lineStyle: {
            color: '#007AFF',
            width: 2
          },
          itemStyle: {
            color: '#007AFF'
          }
        }]
      }]
    }
    
    this.radarChart.setOption(option)
  },

  // 渲染趋势图
  renderTrendChart(data) {
    if (!this.trendChart || !data) return
    
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.dates,
        axisLine: {
          lineStyle: {
            color: '#E5E5E5'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#999'
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#999'
        },
        splitLine: {
          lineStyle: {
            color: '#F5F5F5'
          }
        }
      },
      series: data.series.map((serie, index) => ({
        name: serie.name,
        type: 'line',
        data: serie.data,
        smooth: true,
        lineStyle: {
          color: serie.color || `#${Math.floor(Math.random()*16777215).toString(16)}`
        },
        itemStyle: {
          color: serie.color || `#${Math.floor(Math.random()*16777215).toString(16)}`
        }
      }))
    }
    
    this.trendChart.setOption(option)
  },

  // 图表交互
  onChartTouch(e) {
    // 处理图表触摸事件
    if (this.radarChart) {
      this.radarChart.dispatchAction({
        type: 'showTip',
        x: e.touches[0].x,
        y: e.touches[0].y
      })
    }
  },

  // 导航
  navigateToWrongItems() {
    wx.navigateTo({
      url: '/pages/wrong-items/wrong-items'
    })
  },

  navigateToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    })
  },

  // 弹窗控制
  showAnalysisModal(dimension) {
    this.setData({
      showAnalysisModal: true,
      selectedDimension: dimension
    })
  },

  hideAnalysisModal() {
    this.setData({ showAnalysisModal: false })
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  // 工具方法
  formatTime(timestamp) {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60 * 1000) {
      return '刚刚'
    } else if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}分钟前`
    } else if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
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
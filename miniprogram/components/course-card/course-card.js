// components/course-card/course-card.js
Component({
  properties: {
    course: {
      type: Object,
      value: {},
      observer: 'onCourseChange'
    },
    layout: {
      type: String,
      value: 'default' // default, compact, grid
    }
  },

  data: {
    statusText: '',
    difficultyText: '',
    showActionMenu: false
  },

  lifetimes: {
    attached() {
      this.updateTexts()
    }
  },

  methods: {
    onCourseChange(newCourse) {
      if (newCourse) {
        this.updateTexts()
      }
    },

    updateTexts() {
      const course = this.data.course
      
      // 更新状态文本
      const statusMap = {
        'upcoming': '即将开始',
        'ongoing': '进行中',
        'completed': '已结束',
        'cancelled': '已取消'
      }
      this.setData({
        statusText: statusMap[course.status] || ''
      })
      
      // 更新难度文本
      const difficultyMap = {
        'basic': '基础',
        'intermediate': '进阶',
        'advanced': '高级'
      }
      this.setData({
        difficultyText: difficultyMap[course.difficulty] || ''
      })
    },

    // 格式化时长
    formatDuration(seconds) {
      if (!seconds) return ''
      
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      
      if (hours > 0) {
        return `${hours}h${minutes}m`
      } else {
        return `${minutes}min`
      }
    },

    // 格式化时间
    formatTime(timestamp) {
      if (!timestamp) return ''
      
      const date = new Date(timestamp)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const courseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      const dayDiff = Math.floor((courseDate - today) / (1000 * 60 * 60 * 24))
      
      if (dayDiff === 0) {
        return `今天 ${this.formatTimeOnly(date)}`
      } else if (dayDiff === 1) {
        return `明天 ${this.formatTimeOnly(date)}`
      } else if (dayDiff === -1) {
        return `昨天 ${this.formatTimeOnly(date)}`
      } else if (dayDiff > 0 && dayDiff <= 7) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        return `${weekdays[date.getDay()]} ${this.formatTimeOnly(date)}`
      } else {
        return `${date.getMonth() + 1}/${date.getDate()} ${this.formatTimeOnly(date)}`
      }
    },

    formatTimeOnly(date) {
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    },

    // 获取状态按钮文本
    getStatusButtonText(status) {
      const textMap = {
        'upcoming': '未开始',
        'ongoing': '学习中',
        'completed': '已完成',
        'cancelled': '已取消'
      }
      return textMap[status] || '查看详情'
    },

    // 事件处理
    onCardTap() {
      this.triggerEvent('tap', { course: this.data.course })
    },

    onFavoriteTap() {
      this.triggerEvent('favorite', { course: this.data.course })
    },

    onEnrollTap() {
      if (this.data.course.enrolling) return
      
      // 防止重复点击
      const course = { ...this.data.course, enrolling: true }
      this.setData({ course })
      
      this.triggerEvent('enroll', { course: this.data.course })
      
      // 2秒后恢复按钮状态
      setTimeout(() => {
        if (!this.data.course.enrolled) {
          const restoredCourse = { ...this.data.course, enrolling: false }
          this.setData({ course: restoredCourse })
        }
      }, 2000)
    },

    onJoinTap() {
      this.triggerEvent('join', { course: this.data.course })
    },

    onPlaybackTap() {
      this.triggerEvent('playback', { course: this.data.course })
    },

    onMoreActionsTap() {
      this.setData({ showActionMenu: true })
    },

    hideActionMenu() {
      this.setData({ showActionMenu: false })
    },

    stopPropagation() {
      // 阻止事件冒泡
    },

    // 菜单操作
    onShareCourse() {
      this.hideActionMenu()
      
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
      
      // 触发分享事件
      this.triggerEvent('share', { course: this.data.course })
    },

    onReportCourse() {
      this.hideActionMenu()
      
      wx.showModal({
        title: '举报课程',
        content: '请选择举报原因',
        showCancel: true,
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('report', { course: this.data.course })
          }
        }
      })
    },

    onUnenrollCourse() {
      this.hideActionMenu()
      
      wx.showModal({
        title: '确认取消报名',
        content: '取消报名后将无法继续学习该课程',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('unenroll', { course: this.data.course })
          }
        }
      })
    }
  },

  // 外部样式类
  externalClasses: ['custom-class']
})
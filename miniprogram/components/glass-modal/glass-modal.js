// components/glass-modal/glass-modal.js
Component({
  properties: {
    // 基础属性
    show: {
      type: Boolean,
      value: false,
      observer: 'onShowChange'
    },
    title: {
      type: String,
      value: ''
    },
    content: {
      type: String,
      value: ''
    },
    
    // 尺寸和样式
    size: {
      type: String,
      value: 'default' // small, default, large, full
    },
    maxHeight: {
      type: String,
      value: ''
    },
    
    // 按钮配置
    showCancel: {
      type: Boolean,
      value: true
    },
    showConfirm: {
      type: Boolean,
      value: true
    },
    cancelText: {
      type: String,
      value: '取消'
    },
    confirmText: {
      type: String,
      value: '确定'
    },
    
    // 按钮样式类
    cancelButtonClass: {
      type: String,
      value: ''
    },
    confirmButtonClass: {
      type: String,
      value: ''
    },
    
    // 行为配置
    maskClosable: {
      type: Boolean,
      value: true
    },
    showClose: {
      type: Boolean,
      value: false
    },
    
    // 动画配置
    animationDuration: {
      type: Number,
      value: 300
    },
    
    // 层级
    zIndex: {
      type: Number,
      value: 1000
    }
  },

  data: {
    showButtons: true,
    contentStyle: '',
    bodyStyle: '',
    animating: false
  },

  lifetimes: {
    attached() {
      this.updateStyles()
    }
  },

  observers: {
    'size, maxHeight': function() {
      this.updateStyles()
    },
    'showCancel, showConfirm': function() {
      this.setData({
        showButtons: this.data.showCancel || this.data.showConfirm
      })
    }
  },

  methods: {
    onShowChange(show) {
      if (show) {
        this.showModal()
      } else {
        this.hideModal()
      }
    },

    updateStyles() {
      let contentStyle = `z-index: ${this.data.zIndex + 1};`
      let bodyStyle = ''
      
      // 根据尺寸设置样式
      switch (this.data.size) {
        case 'small':
          contentStyle += 'width: 280px; max-width: 90%;'
          break
        case 'large':
          contentStyle += 'width: 90%; max-width: 500px;'
          break
        case 'full':
          contentStyle += 'width: 95%; height: 80%;'
          bodyStyle += 'flex: 1; overflow-y: auto;'
          break
        default:
          contentStyle += 'width: 320px; max-width: 90%;'
          break
      }
      
      // 设置最大高度
      if (this.data.maxHeight) {
        bodyStyle += `max-height: ${this.data.maxHeight}; overflow-y: auto;`
      }
      
      this.setData({
        contentStyle,
        bodyStyle
      })
    },

    showModal() {
      if (this.data.animating) return
      
      this.setData({ animating: true })
      
      // 触发显示事件
      this.triggerEvent('show')
      
      // 动画结束后重置状态
      setTimeout(() => {
        this.setData({ animating: false })
        this.triggerEvent('opened')
      }, this.data.animationDuration)
    },

    hideModal() {
      if (this.data.animating) return
      
      this.setData({ animating: true })
      
      // 触发隐藏事件
      this.triggerEvent('hide')
      
      // 动画结束后重置状态
      setTimeout(() => {
        this.setData({ animating: false })
        this.triggerEvent('closed')
      }, this.data.animationDuration)
    },

    onMaskTap() {
      if (this.data.maskClosable && !this.data.animating) {
        this.triggerEvent('maskClick')
        this.close()
      }
    },

    onContentTap() {
      // 阻止事件冒泡
    },

    onCloseTap() {
      this.triggerEvent('close')
      this.close()
    },

    onCancelTap() {
      this.triggerEvent('cancel')
      if (!this.data.preventAutoClose) {
        this.close()
      }
    },

    onConfirmTap() {
      this.triggerEvent('confirm')
      if (!this.data.preventAutoClose) {
        this.close()
      }
    },

    // 公共方法
    open() {
      this.setData({ show: true })
    },

    close() {
      this.setData({ show: false })
    },

    toggle() {
      this.setData({ show: !this.data.show })
    },

    // 设置加载状态
    setLoading(loading) {
      this.setData({ loading })
    },

    // 更新内容
    updateContent(content) {
      this.setData({ content })
    },

    // 更新标题
    updateTitle(title) {
      this.setData({ title })
    }
  },

  // 外部样式类
  externalClasses: [
    'custom-class',
    'header-class',
    'body-class',
    'footer-class'
  ]
})
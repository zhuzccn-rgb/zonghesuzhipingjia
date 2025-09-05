// src/app.js - 主应用入口
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

const logger = require('./utils/logger')
const { connectDB } = require('./config/database')
const { connectRedis } = require('./config/redis')
const errorHandler = require('./middleware/errorHandler')
const auth = require('./middleware/auth')

// 导入路由
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const courseRoutes = require('./routes/courses')
const analysisRoutes = require('./routes/analysis')
const wrongItemsRoutes = require('./routes/wrongItems')
const feedbackRoutes = require('./routes/feedback')
const uploadRoutes = require('./routes/upload')

const app = express()
const PORT = process.env.PORT || 3000

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))

app.use(compression())
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) }}))

// 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 429
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api', limiter)

// AI分析接口特殊限流
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 5, // 限制每个IP 1分钟内最多5个AI分析请求
  message: {
    error: 'AI analysis rate limit exceeded, please try again later.',
    code: 429
  }
})

// 解析JSON
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/user', auth, userRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/analysis', auth, aiLimiter, analysisRoutes)
app.use('/api/wrong-items', auth, wrongItemsRoutes)
app.use('/api/feedback', auth, feedbackRoutes)
app.use('/api/upload', auth, uploadRoutes)

// 静态文件服务
app.use('/static', express.static('public', {
  maxAge: '1d',
  etag: true
}))

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    code: 404,
    message: 'API endpoint not found',
    path: req.originalUrl
  })
})

// 错误处理中间件
app.use(errorHandler)

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDB()
    logger.info('Database connected successfully')
    
    // 连接Redis
    await connectRedis()
    logger.info('Redis connected successfully')
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`Health check: http://localhost:${PORT}/health`)
    })
    
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer()
}

module.exports = app
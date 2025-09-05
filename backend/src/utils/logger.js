// src/utils/logger.js - 日志工具
const winston = require('winston')
const path = require('path')

// 日志级别
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

// 日志颜色
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan'
}

winston.addColors(logColors)

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // 添加堆栈信息
    if (stack) {
      log += `\n${stack}`
    }
    
    // 添加元数据
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`
    }
    
    return log
  })
)

// 控制台格式（开发环境）
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`
    if (stack) {
      log += `\n${stack}`
    }
    return log
  })
)

// 创建传输器
const transports = []

// 控制台输出
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  )
} else {
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: winston.format.simple()
    })
  )
}

// 文件输出
const logDir = path.join(__dirname, '../../logs')

// 错误日志
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 5,
    tailable: true
  })
)

// 组合日志
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: logFormat,
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 14,
    tailable: true
  })
)

// HTTP请求日志
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'http.log'),
    level: 'http',
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 7,
    tailable: true
  })
)

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test'
})

// 扩展logger功能
logger.http = (message, meta = {}) => {
  logger.log('http', message, meta)
}

// 性能日志
logger.performance = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation} completed in ${duration}ms`, {
    operation,
    duration,
    ...meta
  })
}

// API请求日志
logger.api = (method, url, statusCode, duration, meta = {}) => {
  const level = statusCode >= 400 ? 'warn' : 'http'
  logger.log(level, `API ${method} ${url} ${statusCode} - ${duration}ms`, {
    method,
    url,
    statusCode,
    duration,
    ...meta
  })
}

// 数据库查询日志
logger.db = (query, duration, meta = {}) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`DB Query (${duration}ms): ${query}`, meta)
  }
}

// 用户操作日志
logger.userAction = (userId, action, details = {}) => {
  logger.info(`User Action: ${action}`, {
    userId,
    action,
    ...details,
    timestamp: new Date().toISOString()
  })
}

// 安全事件日志
logger.security = (event, details = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString(),
    severity: 'security'
  })
}

// 业务指标日志
logger.metrics = (metric, value, tags = {}) => {
  logger.info(`Metric: ${metric} = ${value}`, {
    metric,
    value,
    tags,
    timestamp: new Date().toISOString()
  })
}

// 错误上报
logger.reportError = (error, context = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context,
    timestamp: new Date().toISOString()
  }
  
  logger.error('Error reported', errorInfo)
  
  // 在生产环境中，这里可以集成Sentry等错误监控服务
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Sentry.captureException(error, { extra: context })
  }
}

// 创建子logger
logger.child = (defaultMeta = {}) => {
  return {
    error: (message, meta = {}) => logger.error(message, { ...defaultMeta, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...defaultMeta, ...meta }),
    info: (message, meta = {}) => logger.info(message, { ...defaultMeta, ...meta }),
    http: (message, meta = {}) => logger.http(message, { ...defaultMeta, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...defaultMeta, ...meta })
  }
}

// 日志轮转和清理（生产环境）
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs')
  const { promisify } = require('util')
  const readdir = promisify(fs.readdir)
  const stat = promisify(fs.stat)
  const unlink = promisify(fs.unlink)
  
  // 清理旧日志文件
  async function cleanupOldLogs() {
    try {
      const files = await readdir(logDir)
      const logFiles = files.filter(file => file.endsWith('.log'))
      
      for (const file of logFiles) {
        const filePath = path.join(logDir, file)
        const stats = await stat(filePath)
        const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
        
        // 删除30天前的日志文件
        if (ageInDays > 30) {
          await unlink(filePath)
          logger.info(`Cleaned up old log file: ${file}`)
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old logs:', error)
    }
  }
  
  // 每天凌晨2点清理日志
  setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000)
}

// 优雅关闭处理
process.on('exit', () => {
  logger.info('Application exiting...')
})

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

module.exports = logger
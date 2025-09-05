// src/config/redis.js - Redis配置
const redis = require('redis')
const logger = require('../utils/logger')

let redisClient = null

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
}

// 连接Redis
async function connectRedis() {
  try {
    redisClient = redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        connectTimeout: redisConfig.connectTimeout,
        commandTimeout: redisConfig.commandTimeout,
        keepAlive: redisConfig.keepAlive
      },
      password: redisConfig.password,
      database: redisConfig.db,
      retryDelayOnFailover: redisConfig.retryDelayOnFailover
    })

    // 错误处理
    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error)
    })

    redisClient.on('connect', () => {
      logger.info('Redis connecting...')
    })

    redisClient.on('ready', () => {
      logger.info('Redis connection ready')
    })

    redisClient.on('end', () => {
      logger.warn('Redis connection ended')
    })

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...')
    })

    // 连接Redis
    await redisClient.connect()
    
    // 测试连接
    await redisClient.ping()
    logger.info('Redis connected successfully')
    
    return redisClient
    
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    throw error
  }
}

// 关闭连接
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit()
      logger.info('Redis connection closed')
    } catch (error) {
      logger.error('Error closing Redis connection:', error)
      await redisClient.disconnect()
    }
  }
}

// 获取Redis客户端
function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized')
  }
  return redisClient
}

// Redis工具类
class RedisService {
  constructor() {
    this.client = null
  }

  // 初始化
  async init() {
    this.client = await connectRedis()
  }

  // 设置值
  async set(key, value, expireSeconds = null) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, stringValue)
      } else {
        await this.client.set(key, stringValue)
      }
      
      return true
    } catch (error) {
      logger.error('Redis set error:', error)
      return false
    }
  }

  // 获取值
  async get(key) {
    try {
      const value = await this.client.get(key)
      if (value === null) return null
      
      // 尝试解析JSON，如果失败则返回原始字符串
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch (error) {
      logger.error('Redis get error:', error)
      return null
    }
  }

  // 删除值
  async del(key) {
    try {
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      logger.error('Redis del error:', error)
      return false
    }
  }

  // 检查键是否存在
  async exists(key) {
    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      logger.error('Redis exists error:', error)
      return false
    }
  }

  // 设置过期时间
  async expire(key, seconds) {
    try {
      const result = await this.client.expire(key, seconds)
      return result === 1
    } catch (error) {
      logger.error('Redis expire error:', error)
      return false
    }
  }

  // 获取剩余过期时间
  async ttl(key) {
    try {
      return await this.client.ttl(key)
    } catch (error) {
      logger.error('Redis ttl error:', error)
      return -1
    }
  }

  // 自增
  async incr(key) {
    try {
      return await this.client.incr(key)
    } catch (error) {
      logger.error('Redis incr error:', error)
      return null
    }
  }

  // 自减
  async decr(key) {
    try {
      return await this.client.decr(key)
    } catch (error) {
      logger.error('Redis decr error:', error)
      return null
    }
  }

  // 哈希表操作
  async hset(key, field, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      await this.client.hSet(key, field, stringValue)
      return true
    } catch (error) {
      logger.error('Redis hset error:', error)
      return false
    }
  }

  async hget(key, field) {
    try {
      const value = await this.client.hGet(key, field)
      if (value === null) return null
      
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch (error) {
      logger.error('Redis hget error:', error)
      return null
    }
  }

  async hgetall(key) {
    try {
      const hash = await this.client.hGetAll(key)
      const result = {}
      
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value)
        } catch {
          result[field] = value
        }
      }
      
      return result
    } catch (error) {
      logger.error('Redis hgetall error:', error)
      return {}
    }
  }

  // 列表操作
  async lpush(key, ...values) {
    try {
      const stringValues = values.map(v => 
        typeof v === 'string' ? v : JSON.stringify(v)
      )
      return await this.client.lPush(key, stringValues)
    } catch (error) {
      logger.error('Redis lpush error:', error)
      return 0
    }
  }

  async rpop(key) {
    try {
      const value = await this.client.rPop(key)
      if (value === null) return null
      
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch (error) {
      logger.error('Redis rpop error:', error)
      return null
    }
  }

  // 集合操作
  async sadd(key, ...members) {
    try {
      const stringMembers = members.map(m => 
        typeof m === 'string' ? m : JSON.stringify(m)
      )
      return await this.client.sAdd(key, stringMembers)
    } catch (error) {
      logger.error('Redis sadd error:', error)
      return 0
    }
  }

  async smembers(key) {
    try {
      const members = await this.client.sMembers(key)
      return members.map(m => {
        try {
          return JSON.parse(m)
        } catch {
          return m
        }
      })
    } catch (error) {
      logger.error('Redis smembers error:', error)
      return []
    }
  }

  // 清空数据库（开发环境使用）
  async flushdb() {
    try {
      if (process.env.NODE_ENV !== 'production') {
        await this.client.flushDb()
        logger.info('Redis database flushed')
        return true
      } else {
        logger.warn('Cannot flush Redis in production environment')
        return false
      }
    } catch (error) {
      logger.error('Redis flushdb error:', error)
      return false
    }
  }

  // 获取连接状态
  isConnected() {
    return this.client && this.client.isOpen
  }
}

// 创建Redis服务实例
const redisService = new RedisService()

module.exports = {
  connectRedis,
  closeRedis,
  getRedisClient,
  redisService
}
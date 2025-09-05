// src/config/database.js - 数据库配置
const { Sequelize } = require('sequelize')
const logger = require('../utils/logger')

// 数据库配置
const config = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'comprehensive_evaluation',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME_TEST || 'comprehensive_evaluation_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
}

const env = process.env.NODE_ENV || 'development'
const sequelize = new Sequelize(config[env])

// 测试连接
async function connectDB() {
  try {
    await sequelize.authenticate()
    logger.info('Database connection has been established successfully.')
    
    // 在开发环境下同步数据库
    if (env === 'development') {
      await sequelize.sync({ alter: true })
      logger.info('Database synchronized successfully.')
    }
    
  } catch (error) {
    logger.error('Unable to connect to the database:', error)
    throw error
  }
}

// 关闭连接
async function closeDB() {
  try {
    await sequelize.close()
    logger.info('Database connection closed.')
  } catch (error) {
    logger.error('Error closing database connection:', error)
  }
}

module.exports = {
  sequelize,
  connectDB,
  closeDB
}
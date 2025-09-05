// src/routes/analysis.js - AI分析路由
const express = require('express')
const { body, query, validationResult } = require('express-validator')
const aiAnalysisService = require('../services/aiAnalysisService')
const { User, AnalysisRecord } = require('../models')
const logger = require('../utils/logger')

const router = express.Router()

/**
 * POST /api/analysis/generate
 * 生成AI分析
 */
router.post('/generate',
  [
    body('metrics').isObject().withMessage('metrics must be an object'),
    body('metrics.homeworkAccuracy').optional().isFloat({ min: 0, max: 100 }).withMessage('homeworkAccuracy must be between 0-100'),
    body('metrics.testmark').optional().isInt({ min: 0, max: 100 }).withMessage('testmark must be between 0-100'),
    body('metrics.interactionCount').optional().isInt({ min: 0 }).withMessage('interactionCount must be non-negative'),
    body('metrics.citation').optional().isBoolean().withMessage('citation must be boolean'),
    body('metrics.attendanceRate').optional().isFloat({ min: 0, max: 100 }).withMessage('attendanceRate must be between 0-100'),
    body('metrics.submissionRate').optional().isFloat({ min: 0, max: 100 }).withMessage('submissionRate must be between 0-100'),
    body('analysisType').optional().isIn(['comprehensive', 'course_specific', 'periodic']).withMessage('Invalid analysis type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const userId = req.user.id
      const { metrics, analysisType = 'comprehensive' } = req.body

      logger.info(`Generating AI analysis for user ${userId}`, { metrics, analysisType })

      // 验证用户存在
      const user = await User.findByPk(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: 'User not found'
        })
      }

      // 调用AI分析服务
      const result = await aiAnalysisService.generateComprehensiveAnalysis({
        userId,
        metrics,
        analysisType
      })

      res.json({
        success: true,
        code: 0,
        data: result,
        message: 'Analysis generated successfully'
      })

    } catch (error) {
      logger.error('Generate analysis error:', error)
      
      res.status(500).json({
        success: false,
        code: 500,
        message: error.message || 'Failed to generate analysis'
      })
    }
  }
)

/**
 * GET /api/analysis/overview
 * 获取分析概览
 */
router.get('/overview',
  [
    query('period').optional().isIn(['week', 'month', 'all']).withMessage('Invalid period')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const userId = req.user.id
      const { period = 'month' } = req.query

      // 计算时间范围
      const now = new Date()
      let startDate
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'all':
        default:
          startDate = new Date(0)
          break
      }

      // 获取最新的分析记录
      const latestAnalysis = await AnalysisRecord.findOne({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      })

      if (!latestAnalysis) {
        return res.json({
          success: true,
          code: 0,
          data: {
            overallScore: 0,
            scoreTrend: 0,
            analysisCount: 0,
            improvementRate: 0,
            lastUpdateTime: null,
            radarData: null,
            analysisResult: null
          }
        })
      }

      // 获取历史记录计算趋势
      const historyRecords = await AnalysisRecord.findAll({
        where: {
          user_id: userId,
          created_at: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        order: [['created_at', 'DESC']],
        limit: 10
      })

      // 计算趋势和改进率
      const scoreTrend = this.calculateScoreTrend(historyRecords)
      const improvementRate = this.calculateImprovementRate(historyRecords)

      res.json({
        success: true,
        code: 0,
        data: {
          overallScore: latestAnalysis.overall_score || 0,
          scoreTrend,
          analysisCount: historyRecords.length,
          improvementRate,
          lastUpdateTime: latestAnalysis.created_at,
          radarData: latestAnalysis.radar_data,
          analysisResult: latestAnalysis.analysis_result
        }
      })

    } catch (error) {
      logger.error('Get analysis overview error:', error)
      
      res.status(500).json({
        success: false,
        code: 500,
        message: 'Failed to get analysis overview'
      })
    }
  }
)

/**
 * GET /api/analysis/history
 * 获取分析历史记录
 */
router.get('/history',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1-50'),
    query('analysisType').optional().isIn(['comprehensive', 'course_specific', 'periodic']).withMessage('Invalid analysis type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const userId = req.user.id
      const { page = 1, limit = 10, analysisType } = req.query
      const offset = (page - 1) * limit

      const history = await aiAnalysisService.getAnalysisHistory(userId, {
        limit: parseInt(limit),
        offset,
        analysisType
      })

      res.json({
        success: true,
        code: 0,
        data: {
          list: history,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: history.length
          }
        }
      })

    } catch (error) {
      logger.error('Get analysis history error:', error)
      
      res.status(500).json({
        success: false,
        code: 500,
        message: 'Failed to get analysis history'
      })
    }
  }
)

/**
 * GET /api/analysis/trend
 * 获取趋势数据
 */
router.get('/trend',
  [
    query('type').optional().isIn(['overall', 'dimension']).withMessage('Invalid trend type'),
    query('period').optional().isIn(['week', 'month', 'all']).withMessage('Invalid period')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: 'Validation failed',
          errors: errors.array()
        })
      }

      const userId = req.user.id
      const { type = 'overall', period = 'month' } = req.query

      // 计算时间范围
      const now = new Date()
      let startDate
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'all':
        default:
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // 最多3个月
          break
      }

      // 获取历史记录
      const records = await AnalysisRecord.findAll({
        where: {
          user_id: userId,
          created_at: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        order: [['created_at', 'ASC']],
        attributes: ['overall_score', 'radar_data', 'created_at']
      })

      // 构建趋势数据
      const trendData = this.buildTrendData(records, type)

      res.json({
        success: true,
        code: 0,
        data: trendData
      })

    } catch (error) {
      logger.error('Get trend data error:', error)
      
      res.status(500).json({
        success: false,
        code: 500,
        message: 'Failed to get trend data'
      })
    }
  }
)

/**
 * DELETE /api/analysis/:id
 * 删除分析记录
 */
router.delete('/:id',
  async (req, res) => {
    try {
      const userId = req.user.id
      const { id } = req.params

      const record = await AnalysisRecord.findOne({
        where: {
          id,
          user_id: userId
        }
      })

      if (!record) {
        return res.status(404).json({
          success: false,
          code: 404,
          message: 'Analysis record not found'
        })
      }

      await record.destroy()

      res.json({
        success: true,
        code: 0,
        message: 'Analysis record deleted successfully'
      })

    } catch (error) {
      logger.error('Delete analysis record error:', error)
      
      res.status(500).json({
        success: false,
        code: 500,
        message: 'Failed to delete analysis record'
      })
    }
  }
)

// 辅助方法
router.calculateScoreTrend = function(records) {
  if (records.length < 2) return 0
  
  const latest = records[0].overall_score || 0
  const previous = records[1].overall_score || 0
  
  return latest - previous
}

router.calculateImprovementRate = function(records) {
  if (records.length < 2) return 0
  
  const latest = records[0].overall_score || 0
  const earliest = records[records.length - 1].overall_score || 0
  
  if (earliest === 0) return 0
  
  return Math.round(((latest - earliest) / earliest) * 100)
}

router.buildTrendData = function(records, type) {
  if (type === 'overall') {
    return {
      dates: records.map(r => r.created_at.toISOString().split('T')[0]),
      series: [{
        name: '综合评分',
        data: records.map(r => r.overall_score || 0),
        color: '#007AFF'
      }]
    }
  } else {
    // 分维度趋势
    const dimensions = ['focus', 'participation', 'knowledge', 'question', 'homework']
    const colors = ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#FF3B30']
    
    return {
      dates: records.map(r => r.created_at.toISOString().split('T')[0]),
      series: dimensions.map((dim, index) => ({
        name: this.getDimensionName(dim),
        data: records.map(r => {
          const radarData = r.radar_data
          if (!radarData || !radarData.dimensions) return 0
          const dimension = radarData.dimensions.find(d => d.name === this.getDimensionName(dim))
          return dimension ? dimension.score : 0
        }),
        color: colors[index]
      }))
    }
  }
}

router.getDimensionName = function(key) {
  const nameMap = {
    focus: '专注度',
    participation: '参与度',
    knowledge: '知识掌握',
    question: '提问表现',
    homework: '作业完成度'
  }
  return nameMap[key] || key
}

module.exports = router
// src/services/aiAnalysisService.js - AI分析服务
const axios = require('axios')
const logger = require('../utils/logger')
const { AnalysisRecord } = require('../models')
const { getRedisClient } = require('../config/redis')

class AIAnalysisService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    this.model = process.env.OPENAI_MODEL || 'gpt-4'
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  /**
   * 生成综合素质分析
   * @param {Object} params - 分析参数
   * @param {number} params.userId - 用户ID
   * @param {Object} params.metrics - 学习指标
   * @param {string} params.analysisType - 分析类型
   * @returns {Object} 分析结果
   */
  async generateComprehensiveAnalysis(params) {
    const { userId, metrics, analysisType = 'comprehensive' } = params
    
    try {
      logger.info(`Starting AI analysis for user ${userId}`, { metrics, analysisType })
      
      // 1. 规则计算基线分数
      const baselineScores = this.calculateBaselineScores(metrics)
      logger.debug('Baseline scores calculated', baselineScores)
      
      // 2. 检查缓存
      const cacheKey = this.generateCacheKey(userId, metrics, analysisType)
      const cachedResult = await this.getCachedResult(cacheKey)
      if (cachedResult) {
        logger.info('Returning cached analysis result')
        return cachedResult
      }
      
      // 3. 调用LLM生成解读
      const llmResult = await this.callLLMForAnalysis(baselineScores, metrics)
      
      // 4. 构建最终结果
      const result = {
        overallScore: baselineScores.overall,
        radarData: this.buildRadarData(baselineScores, llmResult),
        analysisResult: {
          comment: llmResult.comment,
          strengths: llmResult.strengths || [],
          suggestions: llmResult.actions || [],
          detailed_analysis: llmResult.detailed_analysis || {}
        },
        timestamp: new Date().toISOString()
      }
      
      // 5. 保存到数据库
      await this.saveAnalysisRecord(userId, metrics, result, analysisType)
      
      // 6. 缓存结果
      await this.cacheResult(cacheKey, result, 30 * 60) // 30分钟缓存
      
      logger.info(`AI analysis completed for user ${userId}`)
      return result
      
    } catch (error) {
      logger.error('AI analysis failed', { userId, error: error.message })
      throw new Error(`AI分析失败: ${error.message}`)
    }
  }

  /**
   * 规则计算基线分数
   * @param {Object} metrics - 学习指标
   * @returns {Object} 基线分数
   */
  calculateBaselineScores(metrics) {
    const {
      homeworkAccuracy = 0,
      testmark = 0,
      interactionCount = 0,
      citation = false,
      attendanceRate = 0,
      submissionRate = 0
    } = metrics

    // 专注度评分 (0-100)
    const focusScore = Math.min(100, Math.max(0, 
      attendanceRate * 0.6 + 
      (interactionCount / 10) * 0.4 * 100
    ))

    // 参与度评分 (0-100)
    const participationScore = Math.min(100, Math.max(0,
      (interactionCount / 20) * 0.5 * 100 +
      submissionRate * 0.3 +
      (citation ? 20 : 0)
    ))

    // 知识掌握评分 (0-100)
    const knowledgeScore = Math.min(100, Math.max(0,
      (testmark / 100) * 60 +
      homeworkAccuracy * 0.4
    ))

    // 提问表现评分 (0-100) 
    const questionScore = Math.min(100, Math.max(0,
      (interactionCount / 15) * 100
    ))

    // 作业完成度评分 (0-100)
    const homeworkScore = Math.min(100, Math.max(0,
      submissionRate * 0.7 +
      homeworkAccuracy * 0.3
    ))

    // 计算综合评分
    const overall = Math.round(
      (focusScore * 0.2 + 
       participationScore * 0.2 + 
       knowledgeScore * 0.3 + 
       questionScore * 0.15 + 
       homeworkScore * 0.15)
    )

    return {
      overall,
      focus: Math.round(focusScore),
      participation: Math.round(participationScore),
      knowledge: Math.round(knowledgeScore),
      question: Math.round(questionScore),
      homework: Math.round(homeworkScore)
    }
  }

  /**
   * 调用LLM进行分析
   * @param {Object} baselineScores - 基线分数
   * @param {Object} metrics - 原始指标
   * @returns {Object} LLM分析结果
   */
  async callLLMForAnalysis(baselineScores, metrics) {
    const prompt = this.buildAnalysisPrompt(baselineScores, metrics)
    
    let lastError
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`LLM analysis attempt ${attempt}/${this.maxRetries}`)
        
        const response = await axios.post(
          `${this.openaiBaseUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: '你是一个专业的教学分析助手，擅长分析学生的学习表现并给出建设性建议。请严格按照JSON格式返回结果。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: "json_object" }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        )

        const content = response.data.choices[0].message.content
        const result = JSON.parse(content)
        
        // 验证返回结果格式
        if (!this.validateLLMResult(result)) {
          throw new Error('LLM返回结果格式不正确')
        }
        
        logger.info('LLM analysis completed successfully')
        return result
        
      } catch (error) {
        lastError = error
        logger.warn(`LLM analysis attempt ${attempt} failed:`, error.message)
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt)
        }
      }
    }
    
    // 所有重试失败，返回默认结果
    logger.error('All LLM analysis attempts failed, using fallback', lastError.message)
    return this.getFallbackAnalysis(baselineScores)
  }

  /**
   * 构建分析提示词
   * @param {Object} baselineScores - 基线分数
   * @param {Object} metrics - 原始指标
   * @returns {string} 提示词
   */
  buildAnalysisPrompt(baselineScores, metrics) {
    return `请基于以下学生学习指标进行综合分析：

原始指标：
- 英语听写准确率: ${metrics.homeworkAccuracy}%
- 考试分数: ${metrics.testmark}分
- 课堂互动次数: ${metrics.interactionCount}次
- 背书完成情况: ${metrics.citation ? '已完成' : '未完成'}
- 出勤率: ${metrics.attendanceRate}%
- 作业提交率: ${metrics.submissionRate}%

计算得出的维度评分：
- 专注度: ${baselineScores.focus}分
- 参与度: ${baselineScores.participation}分  
- 知识掌握: ${baselineScores.knowledge}分
- 提问表现: ${baselineScores.question}分
- 作业完成度: ${baselineScores.homework}分
- 综合评分: ${baselineScores.overall}分

请返回JSON格式的分析结果：
{
  "comment": "一句话总结学生的整体表现",
  "strengths": ["优势1", "优势2"],
  "actions": ["具体改进建议1", "具体改进建议2"],
  "detailed_analysis": {
    "focus": "专注度分析",
    "participation": "参与度分析", 
    "knowledge": "知识掌握分析",
    "question": "提问表现分析",
    "homework": "作业完成度分析"
  }
}`
  }

  /**
   * 验证LLM返回结果
   * @param {Object} result - LLM结果
   * @returns {boolean} 是否有效
   */
  validateLLMResult(result) {
    return result &&
           typeof result.comment === 'string' &&
           Array.isArray(result.strengths) &&
           Array.isArray(result.actions) &&
           typeof result.detailed_analysis === 'object'
  }

  /**
   * 获取降级分析结果
   * @param {Object} baselineScores - 基线分数
   * @returns {Object} 降级结果
   */
  getFallbackAnalysis(baselineScores) {
    const { overall } = baselineScores
    
    let comment = '综合表现良好，继续保持！'
    if (overall >= 90) {
      comment = '表现优秀，各方面都很出色！'
    } else if (overall >= 70) {
      comment = '表现良好，还有进步空间。'
    } else if (overall >= 50) {
      comment = '表现一般，需要加强学习。'
    } else {
      comment = '需要更多努力，建议寻求帮助。'
    }

    return {
      comment,
      strengths: ['学习态度积极'],
      actions: ['保持良好的学习习惯', '多参与课堂互动'],
      detailed_analysis: {
        focus: '专注度有待提高',
        participation: '参与度需要加强',
        knowledge: '知识掌握需要巩固',
        question: '鼓励多提问',
        homework: '按时完成作业'
      }
    }
  }

  /**
   * 构建雷达图数据
   * @param {Object} baselineScores - 基线分数
   * @param {Object} llmResult - LLM结果
   * @returns {Object} 雷达图数据
   */
  buildRadarData(baselineScores, llmResult) {
    const dimensions = [
      {
        name: '专注度',
        score: baselineScores.focus,
        color: '#007AFF',
        description: llmResult.detailed_analysis?.focus || '专注度表现'
      },
      {
        name: '参与度', 
        score: baselineScores.participation,
        color: '#5856D6',
        description: llmResult.detailed_analysis?.participation || '参与度表现'
      },
      {
        name: '知识掌握',
        score: baselineScores.knowledge, 
        color: '#34C759',
        description: llmResult.detailed_analysis?.knowledge || '知识掌握情况'
      },
      {
        name: '提问表现',
        score: baselineScores.question,
        color: '#FF9500', 
        description: llmResult.detailed_analysis?.question || '提问表现'
      },
      {
        name: '作业完成度',
        score: baselineScores.homework,
        color: '#FF3B30',
        description: llmResult.detailed_analysis?.homework || '作业完成情况'
      }
    ]

    return { dimensions }
  }

  /**
   * 保存分析记录
   * @param {number} userId - 用户ID
   * @param {Object} metrics - 输入指标
   * @param {Object} result - 分析结果
   * @param {string} analysisType - 分析类型
   */
  async saveAnalysisRecord(userId, metrics, result, analysisType) {
    try {
      await AnalysisRecord.create({
        user_id: userId,
        analysis_type: analysisType,
        input_metrics: metrics,
        radar_data: result.radarData,
        analysis_result: result.analysisResult,
        overall_score: result.overallScore
      })
      logger.info(`Analysis record saved for user ${userId}`)
    } catch (error) {
      logger.error('Failed to save analysis record:', error)
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 生成缓存键
   * @param {number} userId - 用户ID
   * @param {Object} metrics - 指标
   * @param {string} analysisType - 分析类型
   * @returns {string} 缓存键
   */
  generateCacheKey(userId, metrics, analysisType) {
    const metricsHash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(metrics))
      .digest('hex')
    return `ai_analysis:${userId}:${analysisType}:${metricsHash}`
  }

  /**
   * 获取缓存结果
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存结果
   */
  async getCachedResult(key) {
    try {
      const redis = getRedisClient()
      const cached = await redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.warn('Failed to get cached result:', error.message)
      return null
    }
  }

  /**
   * 缓存结果
   * @param {string} key - 缓存键
   * @param {Object} result - 结果
   * @param {number} ttl - 过期时间(秒)
   */
  async cacheResult(key, result, ttl) {
    try {
      const redis = getRedisClient()
      await redis.setex(key, ttl, JSON.stringify(result))
    } catch (error) {
      logger.warn('Failed to cache result:', error.message)
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 毫秒
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取分析历史
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Array} 历史记录
   */
  async getAnalysisHistory(userId, options = {}) {
    const { limit = 10, offset = 0, analysisType } = options
    
    const whereClause = { user_id: userId }
    if (analysisType) {
      whereClause.analysis_type = analysisType
    }

    const records = await AnalysisRecord.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      attributes: ['id', 'analysis_type', 'overall_score', 'created_at']
    })

    return records.map(record => ({
      id: record.id,
      analysisType: record.analysis_type,
      overallScore: record.overall_score,
      createdAt: record.created_at
    }))
  }
}

module.exports = new AIAnalysisService()
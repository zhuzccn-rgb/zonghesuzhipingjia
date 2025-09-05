// src/models/index.js - 数据模型定义
const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/database')

// 用户模型
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  openid: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
    comment: '微信openid'
  },
  unionid: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: true,
    comment: '微信unionid'
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '用户昵称'
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '头像URL'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '手机号码'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '邮箱地址'
  },
  grade: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '年级'
  },
  school: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '学校名称'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
    comment: '用户状态'
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  }
}, {
  tableName: 'users',
  comment: '用户表'
})

// 课程模型
const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '课程标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '课程描述'
  },
  cover_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '封面图片URL'
  },
  teacher: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '授课老师'
  },
  teacher_avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '老师头像URL'
  },
  course_type: {
    type: DataTypes.ENUM('chinese', 'math', 'english', 'science', 'art', 'other'),
    allowNull: false,
    comment: '课程类型'
  },
  difficulty: {
    type: DataTypes.ENUM('basic', 'intermediate', 'advanced'),
    defaultValue: 'basic',
    comment: '难度等级'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '课程时长(秒)'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '课程价格'
  },
  original_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '原价'
  },
  max_students: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    comment: '最大学生数'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '开始时间'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '结束时间'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled'),
    defaultValue: 'draft',
    comment: '课程状态'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '课程标签'
  },
  playback_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '回放视频URL'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序权重'
  }
}, {
  tableName: 'courses',
  comment: '课程表'
})

// 报名记录模型
const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Course,
      key: 'id'
    }
  },
  enrollment_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '报名时间'
  },
  status: {
    type: DataTypes.ENUM('enrolled', 'completed', 'cancelled', 'expired'),
    defaultValue: 'enrolled',
    comment: '报名状态'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '学习进度(0-100)'
  },
  completion_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  }
}, {
  tableName: 'enrollments',
  comment: '报名记录表',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'course_id']
    }
  ]
})

// 回放记录模型
const PlaybackRecord = sequelize.define('PlaybackRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Course,
      key: 'id'
    }
  },
  watch_position: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '观看位置(秒)'
  },
  watch_duration: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '观看时长(秒)'
  },
  last_watch_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '最后观看时间'
  }
}, {
  tableName: 'playback_records',
  comment: '回放记录表',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'course_id']
    }
  ]
})

// AI分析记录模型
const AnalysisRecord = sequelize.define('AnalysisRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Course,
      key: 'id'
    }
  },
  analysis_type: {
    type: DataTypes.ENUM('comprehensive', 'course_specific', 'periodic'),
    defaultValue: 'comprehensive',
    comment: '分析类型'
  },
  input_metrics: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '输入指标数据'
  },
  radar_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '雷达图数据'
  },
  analysis_result: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'AI分析结果'
  },
  overall_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '综合评分'
  },
  analysis_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '分析时间'
  }
}, {
  tableName: 'analysis_records',
  comment: 'AI分析记录表'
})

// 错题记录模型
const WrongItem = sequelize.define('WrongItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Course,
      key: 'id'
    }
  },
  question_content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '题目内容'
  },
  correct_answer: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '正确答案'
  },
  user_answer: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户答案'
  },
  question_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '题目类型'
  },
  subject: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '学科'
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium',
    comment: '难度等级'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签'
  },
  error_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误原因分析'
  },
  review_status: {
    type: DataTypes.ENUM('pending', 'reviewing', 'mastered'),
    defaultValue: 'pending',
    comment: '复习状态'
  },
  review_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '复习次数'
  },
  last_review_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后复习时间'
  }
}, {
  tableName: 'wrong_items',
  comment: '错题记录表'
})

// 反馈记录模型
const Feedback = sequelize.define('Feedback', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Course,
      key: 'id'
    }
  },
  feedback_type: {
    type: DataTypes.ENUM('course_rating', 'teacher_feedback', 'peer_feedback', 'self_reflection'),
    allowNull: false,
    comment: '反馈类型'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '反馈内容'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '评分(1-5)'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签'
  },
  is_anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否匿名'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: '审核状态'
  }
}, {
  tableName: 'feedback',
  comment: '反馈记录表'
})

// 定义模型关联关系
User.hasMany(Enrollment, { foreignKey: 'user_id' })
Enrollment.belongsTo(User, { foreignKey: 'user_id' })

Course.hasMany(Enrollment, { foreignKey: 'course_id' })
Enrollment.belongsTo(Course, { foreignKey: 'course_id' })

User.hasMany(PlaybackRecord, { foreignKey: 'user_id' })
PlaybackRecord.belongsTo(User, { foreignKey: 'user_id' })

Course.hasMany(PlaybackRecord, { foreignKey: 'course_id' })
PlaybackRecord.belongsTo(Course, { foreignKey: 'course_id' })

User.hasMany(AnalysisRecord, { foreignKey: 'user_id' })
AnalysisRecord.belongsTo(User, { foreignKey: 'user_id' })

Course.hasMany(AnalysisRecord, { foreignKey: 'course_id' })
AnalysisRecord.belongsTo(Course, { foreignKey: 'course_id' })

User.hasMany(WrongItem, { foreignKey: 'user_id' })
WrongItem.belongsTo(User, { foreignKey: 'user_id' })

Course.hasMany(WrongItem, { foreignKey: 'course_id' })
WrongItem.belongsTo(Course, { foreignKey: 'course_id' })

User.hasMany(Feedback, { foreignKey: 'user_id' })
Feedback.belongsTo(User, { foreignKey: 'user_id' })

Course.hasMany(Feedback, { foreignKey: 'course_id' })
Feedback.belongsTo(Course, { foreignKey: 'course_id' })

module.exports = {
  User,
  Course,
  Enrollment,
  PlaybackRecord,
  AnalysisRecord,
  WrongItem,
  Feedback,
  sequelize
}
# 综合素质评价助手 - 微信小程序
## Submodules

This repository uses Git submodules.

After cloning, run:

git submodule update --init --recursive

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![WeChat](https://img.shields.io/badge/WeChat-MiniProgram-green.svg)](https://developers.weixin.qq.com/miniprogram/dev/framework/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![AI](https://img.shields.io/badge/AI-GPT--4-orange.svg)](https://openai.com/)

> 基于AI技术的学生综合素质评价平台，支持课程管理、智能分析、错题统计等功能。

##  功能特色

###  核心功能
- **线上课程报名**: 课程浏览、在线报名、学习进度跟踪
- **智能上课提醒**: 基于微信订阅消息的课前提醒
- **课程回放**: 支持断点续播的视频回放系统
- **AI综合分析**: 五维度雷达图分析 + GPT-4智能解读
- **错题分析**: 错题收集、分类统计、复习提醒
- **课堂反馈**: 多维度反馈收集和展示

###  设计亮点
- **苹果风格UI**: 圆角矩形设计语言
- **液态玻璃效果**: 半透明模糊背景，层次丰富
- **响应式布局**: 适配各种屏幕尺寸
- **暗色模式**: 完整的深色主题支持
- **无障碍优化**: 支持辅助功能和大字体

###  AI分析系统
- **规则计算基线**: 基于学习指标的科学评分算法
- **LLM智能解读**: GPT-4生成个性化学习建议
- **五维度评估**: 专注度、参与度、知识掌握、提问表现、作业完成度
- **趋势分析**: 历史数据对比和改进建议

## 🏗 技术架构

### 前端技术栈
- **框架**: 微信小程序原生开发
- **语言**: JavaScript + WXML + WXSS
- **组件库**: 自研液态玻璃UI组件
- **图表**: ECharts for WeChat (雷达图、趋势图)
- **状态管理**: 本地存储 + 缓存策略

### 后端技术栈
- **运行时**: Node.js 16+
- **框架**: Express.js
- **数据库**: MySQL + Sequelize ORM
- **缓存**: Redis
- **AI服务**: OpenAI GPT-4 API
- **文件存储**: 对象存储 + CDN

### 核心特性
- **性能优化**: 代码分包、懒加载、虚拟滚动
- **缓存策略**: 多层缓存、智能预加载
- **错误处理**: 全局异常捕获、自动重试
- **安全保障**: JWT认证、请求限流、数据校验

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 5.7
- Redis >= 6.0
- 微信开发者工具

### 1. 克隆项目
```bash
git clone https://github.com/your-username/comprehensive-evaluation-assistant.git
cd comprehensive-evaluation-assistant
```

### 2. 后端配置
```bash
cd backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入数据库和API配置

# 启动后端服务
npm run dev
```

### 3. 数据库初始化
```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE comprehensive_evaluation;

# 运行迁移
npm run migrate
```

### 4. 前端配置
```bash
# 使用微信开发者工具打开 miniprogram 目录
# 配置 app.js 中的 baseUrl 为后端服务地址
# 配置小程序 AppID
```

### 5. 启动开发
- 后端: `npm run dev` (端口: 3000)
- 前端: 微信开发者工具编译预览

## 📁 项目结构

```
comprehensive-evaluation-assistant/
├── miniprogram/                 # 微信小程序前端
│   ├── pages/                  # 页面文件
│   │   ├── index/             # 首页
│   │   ├── courses/           # 课程列表
│   │   ├── analysis/          # AI分析页
│   │   └── ...
│   ├── components/            # 自定义组件
│   │   ├── course-card/       # 课程卡片
│   │   ├── glass-modal/       # 液态玻璃弹窗
│   │   └── ...
│   ├── utils/                 # 工具类
│   │   ├── api.js            # API封装
│   │   ├── storage.js        # 存储管理
│   │   └── ...
│   ├── app.js                # 小程序入口
│   ├── app.json              # 小程序配置
│   └── app.wxss              # 全局样式
├── backend/                   # Node.js 后端
│   ├── src/
│   │   ├── routes/           # 路由定义
│   │   ├── models/           # 数据模型
│   │   ├── services/         # 业务服务
│   │   │   └── aiAnalysisService.js  # AI分析服务
│   │   ├── middleware/       # 中间件
│   │   ├── config/           # 配置文件
│   │   └── utils/            # 工具函数
│   ├── package.json
│   └── .env.example
├── docs/                     # 文档
├── PERFORMANCE_CHECKLIST.md # 性能优化清单
└── README.md
```

##  AI分析模块详解

### 工作流程
1. **数据收集**: 收集学习指标（作业准确率、考试分数、互动次数等）
2. **规则计算**: 使用科学算法计算五个维度的基线分数
3. **LLM增强**: 调用GPT-4生成个性化解读和建议
4. **结果展示**: 雷达图可视化 + 文字说明

### 核心算法
```javascript
// 专注度评分 (0-100)
const focusScore = Math.min(100, Math.max(0, 
  attendanceRate * 0.6 + 
  (interactionCount / 10) * 0.4 * 100
))

// 知识掌握评分 (0-100)
const knowledgeScore = Math.min(100, Math.max(0,
  (testmark / 100) * 60 +
  homeworkAccuracy * 0.4
))
```

### LLM提示词示例
```
请基于以下学生学习指标进行综合分析：

原始指标：
- 英语听写准确率: 85%
- 考试分数: 78分
- 课堂互动次数: 12次
- 背书完成情况: 已完成
- 出勤率: 95%
- 作业提交率: 90%

请返回JSON格式的分析结果...
```

## 🎨 UI组件系统

### 液态玻璃效果实现
```css
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

### 组件特性
- **高度可复用**: 支持多种尺寸和样式配置
- **性能优化**: 使用transform和opacity进行动画
- **响应式设计**: 适配不同屏幕尺寸
- **无障碍支持**: 完整的ARIA标签和键盘导航

## 📊 性能优化

详见 [性能优化清单](PERFORMANCE_CHECKLIST.md)

### 关键优化点
- **代码分包**: 主包 < 2MB，按功能模块分包
- **图片优化**: WebP格式 + CDN + 懒加载
- **缓存策略**: 多层缓存 + 智能过期
- **网络优化**: 请求合并 + 并发控制
- **渲染优化**: 虚拟滚动 + setData优化

### 性能基准
- 首屏加载: < 2秒
- 页面切换: < 500ms
- 内存使用: < 100MB
- 帧率保持: 60fps

##  安全特性

### 数据安全
- **JWT认证**: 无状态身份验证
- **请求限流**: 防止API滥用
- **数据校验**: 输入参数严格验证
- **SQL注入防护**: 使用ORM参数化查询

### 隐私保护
- **数据脱敏**: 敏感信息加密存储
- **用户授权**: 明确的权限请求流程
- **日志脱敏**: 生产环境日志不包含敏感信息

##  测试

### 运行测试
```bash
# 后端单元测试
cd backend
npm test

# 前端测试（使用微信开发者工具）
# 开启调试模式进行功能测试
```

### 测试覆盖
- 单元测试: API接口、工具函数
- 集成测试: 数据库操作、AI服务调用
- 端到端测试: 关键用户流程

##  部署指南

### 生产环境部署
1. **后端部署**
   ```bash
   # 构建生产版本
   npm run build
   
   # 使用PM2启动
   pm2 start ecosystem.config.js --env production
   ```

2. **数据库配置**
   - 配置主从复制
   - 设置备份策略
   - 优化索引和查询

3. **CDN配置**
   - 静态资源CDN加速
   - 图片处理和压缩
   - 缓存策略配置

4. **小程序发布**
   - 代码审查和测试
   - 提交微信审核
   - 版本管理和回滚

## 🤝 贡献指南

### 开发流程
1. Fork 项目
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 Airbnb JavaScript 风格指南
- 编写清晰的提交信息
- 添加必要的测试用例

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [微信小程序](https://developers.weixin.qq.com/miniprogram/) - 小程序开发平台
- [OpenAI](https://openai.com/) - GPT-4 AI服务
- [ECharts](https://echarts.apache.org/) - 数据可视化库
- 所有贡献者和测试用户

## 📞 联系方式

- 项目主页: [GitHub Repository](https://github.com/zhuzccn-rgb/comprehensive-evaluation-assistant)
- 问题反馈: [Issues](https://github.com/zhuzccn/comprehensive-evaluation-assistant/issues)

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！

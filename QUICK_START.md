# 快速开始指南

本指南将帮助您快速设置和使用德州扑克玩家数据统计系统的Supabase版本。

## 🚀 5分钟快速设置

### 步骤1: 创建Supabase项目 (2分钟)

1. 访问 [supabase.com](https://supabase.com)
2. 点击 "Start your project" 
3. 使用GitHub账号登录或注册新账号
4. 点击 "New Project"
5. 选择组织，输入项目名称（如：poker-stats）
6. 设置数据库密码
7. 选择地区（推荐选择离您最近的地区）
8. 点击 "Create new project"

### 步骤2: 获取项目信息 (1分钟)

项目创建完成后：

1. 进入项目仪表板
2. 点击左侧菜单的 "Settings" → "API"
3. 复制以下信息：
   - **Project URL**: 类似 `https://xxxxxxxx.supabase.co`
   - **anon public**: API密钥，类似 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 步骤3: 设置数据库 (1分钟)

1. 在项目仪表板，点击左侧菜单的 "SQL Editor"
2. 点击 "New query"
3. 复制 `supabase_database_schema.sql` 文件中的所有SQL代码
4. 粘贴到SQL编辑器中
5. 点击 "Run" 执行SQL语句
6. 确认所有表和函数创建成功

### 步骤4: 配置用户脚本 (1分钟)

1. 打开 `德州扑克松紧凶玩家数据显示-Supabase版-2.1.user.js`
2. 找到第50行左右的配置部分：

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // 替换为你的Supabase项目URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // 替换为你的Supabase匿名密钥
    // ...
};
```

3. 将 `YOUR_SUPABASE_URL` 替换为步骤2中复制的Project URL
4. 将 `YOUR_SUPABASE_ANON_KEY` 替换为步骤2中复制的anon public密钥

### 步骤5: 安装脚本 (30秒)

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击Tampermonkey图标，选择 "创建新脚本"
3. 删除默认内容
4. 复制整个用户脚本内容并粘贴
5. 按 `Ctrl+S` 保存脚本
6. 访问德州扑克游戏页面，脚本将自动启动

## 🎯 使用方法

### 在游戏中使用

1. 访问德州扑克游戏页面
2. 统计面板会自动出现在右下角
3. 开始游戏后，数据会自动收集和显示
4. 数据会每30秒自动上传到云端（如果配置正确）

### 查询玩家数据

1. 打开 `player_query_interface.html` 文件
2. 首次使用时输入Supabase配置信息
3. 输入要查询的玩家ID
4. 点击"查询数据"查看统计信息

## 🔧 常见问题解决

### 问题1: 脚本不工作

**解决方案:**
- 确认Tampermonkey已启用
- 检查脚本是否匹配正确的URL
- 查看浏览器控制台是否有错误信息

### 问题2: 数据不上传

**解决方案:**
- 检查Supabase配置是否正确
- 确认网络连接正常
- 在统计面板查看同步状态指示器

### 问题3: 查询不到数据

**解决方案:**
- 确认玩家ID输入正确（区分大小写）
- 检查Supabase配置
- 确认该玩家有游戏数据记录

## 📊 数据说明

### 关键指标

- **VPIP 15-25%**: 紧弱型玩家
- **VPIP 25-35%**: 正常型玩家  
- **VPIP >35%**: 松弱型玩家
- **PFR < VPIP**: 被动型玩家
- **PFR ≈ VPIP**: 激进型玩家

### 颜色编码

- 🟢 绿色: 极松/极主动
- 🔵 蓝色: 松/主动
- 🟡 黄色: 正常
- 🟠 橙色: 紧/被动
- 🔴 红色: 极紧/极被动

## 🧪 测试系统

运行测试脚本验证系统功能：

1. 打开 `test_supabase_integration.js`
2. 修改测试配置中的Supabase信息
3. 在浏览器控制台中运行：
   ```javascript
   runSupabaseTests()
   ```

## 📱 移动设备支持

- 查询界面支持移动设备
- 用户脚本主要针对桌面浏览器优化
- 移动端支持将在后续版本中改进

## 🔄 数据同步

- 本地数据实时更新
- 云端同步每30秒执行一次
- 支持多设备数据同步
- 网络断开时数据暂存本地

## 🛡️ 隐私和安全

- 所有数据存储在您的Supabase项目中
- 使用匿名密钥，无需注册账号
- 数据仅用于统计分析
- 可以随时删除所有数据

## 📞 获取帮助

如果遇到问题：

1. 查看 `README.md` 详细文档
2. 检查浏览器控制台错误信息
3. 运行测试脚本诊断问题
4. 联系开发者：shaowu[2691980]

---

**恭喜！** 您现在已经完成了德州扑克数据统计系统的设置。开始收集和分析玩家数据，提升您的游戏水平！🎰
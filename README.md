# 德州扑克玩家数据统计系统 - Supabase版

这是一个增强版的德州扑克玩家数据统计系统，支持云端数据存储和查询功能。系统可以自动收集玩家的VPIP、PFR、3BET、F3B、CB、BF等统计数据，并将其上传到Supabase云端数据库，支持跨设备数据同步和在线查询。

## 功能特性

### 🎯 核心统计功能
- **VPIP** (Voluntarily Put In Pot): 主动入池率
- **PFR** (Pre-Flop Raise): 翻前加注率
- **3BET** (Three Bet): 三次下注率
- **F3B** (Fold to Three Bet): 面对三次下注弃牌率
- **CB** (Continuation Bet): 持续下注率
- **BF** (Bet Fold): 面对下注弃牌率

### 📊 数据展示功能
- 实时显示在桌玩家统计数据
- 颜色分类系统，直观展示玩家类型
- 支持本地和云端数据混合显示
- 可拖拽的统计面板
- 详细的原始数据显示

### ☁️ 云端同步功能
- 自动上传数据到Supabase云端
- 支持跨设备数据同步
- 数据缓存机制，提高查询效率
- 错误重试机制，确保数据完整性

### 🔍 在线查询功能
- 独立的查询界面
- 通过玩家ID精确查询
- 支持所有统计指标的查询
- 响应式设计，支持移动设备

## 文件结构

```
├── 德州扑克松紧凶玩家数据显示-Supabase版-2.1.user.js  # 增强版用户脚本
├── supabase_database_schema.sql                        # 数据库表结构
├── supabase_config.js                                  # Supabase配置文件
├── supabase_client.js                                  # Supabase客户端工具类
├── player_query_interface.html                         # 玩家数据查询界面
└── README.md                                           # 说明文档
```

## 安装和配置

### 1. 创建Supabase项目

1. 访问 [Supabase](https://supabase.com) 并创建账号
2. 创建新项目
3. 在项目设置中获取以下信息：
   - Project URL
   - anon public API Key

### 2. 设置数据库表结构

1. 在Supabase项目的SQL编辑器中执行 `supabase_database_schema.sql` 中的SQL语句
2. 这将创建所需的数据库表和函数

### 3. 配置用户脚本

1. 打开 `德州扑克松紧凶玩家数据显示-Supabase版-2.1.user.js`
2. 找到以下配置部分：

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // 替换为你的Supabase项目URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // 替换为你的Supabase匿名密钥
    // ... 其他配置
};
```

3. 将 `YOUR_SUPABASE_URL` 和 `YOUR_SUPABASE_ANON_KEY` 替换为你的实际值

### 4. 安装用户脚本

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 将用户脚本内容复制到Tampermonkey中
3. 确保脚本匹配 `https://www.torn.com/page.php?sid=holdem*`

### 5. 设置查询界面

1. 打开 `player_query_interface.html`
2. 在配置部分输入你的Supabase项目信息
3. 保存配置后即可使用查询功能

## 使用说明

### 用户脚本使用

1. 访问德州扑克游戏页面
2. 脚本会自动开始收集数据
3. 统计面板会显示在页面右下角
4. 可以拖拽面板到合适位置
5. 数据会自动上传到云端（如果已配置）

### 查询界面使用

1. 打开 `player_query_interface.html`
2. 配置Supabase连接信息
3. 输入要查询的玩家ID
4. 点击"查询数据"按钮
5. 查看详细的统计数据

## 数据说明

### 统计指标解释

| 指标 | 全称 | 说明 | 正常范围 |
|------|------|------|----------|
| VPIP | Voluntarily Put In Pot | 主动入池率 | 15-30% |
| PFR | Pre-Flop Raise | 翻前加注率 | 10-20% |
| 3BET | Three Bet | 三次下注率 | 5-15% |
| F3B | Fold to Three Bet | 面对三次下注弃牌率 | 40-60% |
| CB | Continuation Bet | 持续下注率 | 50-70% |
| BF | Bet Fold | 面对下注弃牌率 | 40-60% |

### 玩家类型分类

#### VPIP类型
- **极紧** (< 20%): 只玩最好的牌
- **紧** (20-40%): 选择性较多
- **正常** (40-60%): 平衡的游戏风格
- **松** (60-70%): 玩更多牌
- **很松** (70-80%): 玩很多牌
- **极松** (> 80%): 几乎玩所有牌

#### PFR类型
- **极被动** (< 10%): 很少加注
- **被动** (10-15%): 偶尔加注
- **较被动** (15-20%): 加注较少
- **正常** (20-25%): 平衡的加注
- **较主动** (25-30%): 加注较多
- **主动** (30-35%): 频繁加注
- **极主动** (> 35%): 非常激进

## 配置选项

### Supabase配置

```javascript
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
    upload: {
        enabled: true,        // 是否启用自动上传
        interval: 30000,      // 上传间隔（毫秒）
        batchSize: 50,        // 批量上传大小
        maxRetries: 3,        // 重试次数
        retryDelay: 5000      // 重试延迟（毫秒）
    },
    query: {
        timeout: 10000,       // 查询超时时间（毫秒）
        cacheTime: 300000     // 缓存时间（毫秒）
    }
};
```

## 故障排除

### 常见问题

1. **数据不上传到云端**
   - 检查Supabase配置是否正确
   - 确认网络连接正常
   - 查看浏览器控制台错误信息

2. **查询不到数据**
   - 确认玩家ID输入正确
   - 检查Supabase配置
   - 确认数据库中存在该玩家的数据

3. **统计面板不显示**
   - 确认脚本已正确安装
   - 检查页面URL是否匹配
   - 查看浏览器控制台错误信息

### 调试模式

在用户脚本中设置 `DEBUG_MODE = true` 可以查看详细的调试信息。

## API参考

### 查询玩家数据

```javascript
// 通过玩家ID查询数据
const playerData = await queryPlayerById('玩家ID');

// 手动上传数据到云端
await uploadPlayerStatsToCloud();

// 加载云端玩家数据
await loadCloudPlayerStats(['玩家ID1', '玩家ID2']);
```

### 数据库表结构

#### poker_player_stats 表
- `player_id`: 玩家ID
- `total_hands`: 总手数
- `total_vpip`: 总VPIP次数
- `total_pfr`: 总PFR次数
- `total_three_bet`: 总3BET次数
- `total_fold_to_three_bet`: 总F3B次数
- `total_continuation_bet`: 总CB次数
- `total_fold_to_continuation_bet`: 总BF次数
- `games`: 参与游戏数

## 更新日志

### v2.1 (2025-05-24)
- 新增Supabase云端数据存储功能
- 新增通过玩家ID查询云端数据功能
- 新增数据自动同步机制
- 新增云端数据缓存机制
- 新增数据上传状态显示

### v2.0 (2025-05-24)
- 新增3BET（三次下注）统计功能
- 新增F3B（面对三次下注弃牌率）统计功能
- 新增CB（持续下注率）统计功能
- 新增BF（面对下注弃牌率）统计功能
- 重新设计界面，支持6项指标同时显示
- 优化颜色分类系统，更直观展示玩家类型

### v1.1 (2025-05-24)
- 修复翻前被raise后再CALL重复计算的BUG
- 修复翻前allin不能被正确识别BUG

### v1.0 (2025-05-24)
- 现已支持本地保存
- 支持不同颜色区分入池率
- 支持上桌离桌自动更新

## 许可证

本项目采用 MIT 许可证。

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 联系方式

如有问题或建议，请联系：shaowu[2691980]
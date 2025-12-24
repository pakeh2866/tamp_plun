# 德州扑克脚本 Supabase 云端集成指南

## 📋 概述

本指南介绍如何使用德州扑克脚本的 Supabase 云端存储功能，实现玩家数据的云端同步和查询。

## 🚀 快速开始

### 1. 安装脚本

1. 确保已安装 Tampermonkey 浏览器扩展
2. 安装德州扑克脚本（`德州扑克松紧凶玩家数据显示-1.1.user.js`）
3. 脚本会自动加载 Supabase SDK，无需额外安装

### 2. 配置 Supabase

脚本已预配置 Supabase 连接信息：
- URL: `https://ofqcrvrwynvfndlyvwxj.supabase.co`
- Key: `sb_publishable_UatkL70zLpCzgpmytIZs6g_BYvvF668`

### 3. 启动脚本

1. 访问德州扑克游戏页面：`https://www.torn.com/page.php?sid=holdem*`
2. 脚本会自动启动并初始化 Supabase 连接
3. 查看浏览器控制台确认连接状态

## 📊 功能特性

### 🔄 自动同步

- **本地存储**: 数据优先保存在浏览器本地
- **云端上传**: 每30秒自动上传新数据到 Supabase
- **智能合并**: 自动合并本地和云端数据
- **状态指示**: 面板显示同步状态（⚪空闲 🔄上传中 ✅成功 ❌失败）

### 📈 数据统计

支持以下统计指标的云端存储：
- **VPIP**: 自愿入池率
- **PFR**: 翻前加注率
- **3BET**: 三次下注率
- **F3B**: 面对三次下注弃牌率
- **CB**: 持续下注率
- **BF**: 面对下注弃牌率

### 🔍 数据查询

- **自动查询**: 自动查询在桌玩家的云端数据
- **云端标识**: 有云端数据的玩家显示 ☁️ 图标
- **同步时间**: 显示最后同步时间
- **数据对比**: 显示本地和云端数据对比

## 🎮 使用方法

### 查看玩家数据

1. 在德州扑克游戏中，统计面板会自动显示在右下角
2. 面板显示当前在桌玩家的统计数据
3. 云端数据会自动合并并显示

### 同步状态

- **⚪ 空闲**: 等待下次上传
- **🔄 上传中**: 正在上传数据到云端
- **✅ 成功**: 上传完成
- **❌ 失败**: 上传失败，请检查网络连接

### 数据标识

- **☁️ 云端图标**: 表示该玩家有云端数据
- **云端信息行**: 显示云端手数、局数和同步时间

## 🛠️ 技术实现

### 数据库表结构

#### `poker_player_stats` 表
```sql
CREATE TABLE poker_player_stats (
    player_id TEXT PRIMARY KEY,
    total_hands INTEGER DEFAULT 0,
    total_vpip INTEGER DEFAULT 0,
    total_pfr INTEGER DEFAULT 0,
    total_three_bet INTEGER DEFAULT 0,
    total_fold_to_three_bet INTEGER DEFAULT 0,
    total_continuation_bet INTEGER DEFAULT 0,
    total_fold_to_continuation_bet INTEGER DEFAULT 0,
    total_check_fold INTEGER DEFAULT 0,
    total_raise_fold INTEGER DEFAULT 0,
    games INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `poker_games` 表
```sql
CREATE TABLE poker_games (
    game_id TEXT PRIMARY KEY,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    player_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API 调用示例

#### 上传玩家数据
```javascript
const { error } = await supabase
    .from('poker_player_stats')
    .upsert({
        player_id: 'player123',
        total_hands: 100,
        total_vpip: 25,
        // ... 其他统计数据
        updated_at: new Date().toISOString()
    }, {
        onConflict: 'player_id'
    });
```

#### 查询玩家数据
```javascript
const { data, error } = await supabase
    .from('poker_player_stats')
    .select('*')
    .eq('player_id', 'player123')
    .single();
```

## 🔧 配置选项

### 脚本配置

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://ofqcrvrwynvfndlyvwxj.supabase.co',
    SUPABASE_KEY: 'sb_publishable_UatkL70zLpCzgpmytIZs6g_BYvvF668',
    UPLOAD: {
        enabled: true,           // 是否启用自动上传
        interval: 30000,         // 上传间隔（毫秒）
        batchSize: 50           // 批量上传大小
    }
};
```

### 调试模式

设置 `DEBUG_MODE = true` 可在控制台查看详细日志：
- 数据上传状态
- 查询结果
- 错误信息
- 同步进度

## 🧪 测试功能

使用 `test_supabase_simple.js` 测试脚本：

1. 在浏览器控制台中运行测试代码
2. 验证 Supabase 连接
3. 测试数据上传和查询功能

## 📝 注意事项

### 隐私和安全

- 仅上传游戏统计数据，不包含个人信息
- 使用匿名访问密钥，无需账户登录
- 数据存储在安全的 Supabase 云端

### 性能优化

- 批量上传减少网络请求
- 本地缓存减少查询次数
- 智能合并避免数据冲突

### 故障排除

1. **连接失败**: 检查网络连接和 Supabase 服务状态
2. **上传失败**: 查看控制台错误信息，重试上传
3. **数据不同步**: 确认脚本版本和配置正确

## 🆘 获取帮助

如遇到问题，请：
1. 查看浏览器控制台错误信息
2. 确认脚本版本为最新
3. 检查网络连接状态
4. 联系开发者获取支持

---

**版本**: 2.2  
**更新日期**: 2025-05-24  
**作者**: shaowu[2691980]
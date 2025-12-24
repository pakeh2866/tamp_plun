// Supabase配置文件
// 请根据你的Supabase项目信息修改以下配置

const SUPABASE_CONFIG = {
    // 你的Supabase项目URL
    url: 'YOUR_SUPABASE_URL',
    
    // 你的Supabase匿名密钥（在Supabase项目设置 > API中找到）
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
    
    // 数据库表名
    tables: {
        playerStats: 'poker_player_stats',
        games: 'poker_games',
        gamePlayers: 'poker_game_players',
        playerStatsView: 'player_stats_view'
    },
    
    // 上传配置
    upload: {
        // 是否启用自动上传
        enabled: true,
        // 上传间隔（毫秒）
        interval: 30000, // 30秒
        // 批量上传大小
        batchSize: 50,
        // 重试次数
        maxRetries: 3,
        // 重试延迟（毫秒）
        retryDelay: 5000
    },
    
    // 查询配置
    query: {
        // 查询超时时间（毫秒）
        timeout: 10000,
        // 缓存时间（毫秒）
        cacheTime: 300000 // 5分钟
    }
};

// 导出配置（适用于不同的模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
} else if (typeof window !== 'undefined') {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
} else {
    // UserScript环境
    (function() {
        // 在UserScript中，配置将直接使用
    })();
}
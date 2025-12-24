// 简单的Supabase集成测试
// 这个文件用于测试德州扑克脚本的Supabase功能

// 配置信息
const CONFIG = {
    SUPABASE_URL: 'https://ofqcrvrwynvfndlyvwxj.supabase.co',
    SUPABASE_KEY: 'sb_publishable_UatkL70zLpCzgpmytIZs6g_BYvvF668'
};

// 测试函数
async function testSupabaseConnection() {
    console.log('🧪 开始测试Supabase连接...');
    
    try {
        // 创建Supabase客户端
        const { data, error } = await supabase
            .from('poker_player_stats')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('❌ Supabase连接测试失败:', error);
            return false;
        }
        
        console.log('✅ Supabase连接测试成功');
        return true;
    } catch (error) {
        console.error('❌ Supabase连接测试异常:', error);
        return false;
    }
}

// 测试数据上传
async function testDataUpload() {
    console.log('🧪 开始测试数据上传...');
    
    const testData = {
        player_id: 'test_player_' + Date.now(),
        total_hands: 100,
        total_vpip: 25,
        total_pfr: 15,
        total_three_bet: 5,
        total_fold_to_three_bet: 3,
        total_continuation_bet: 8,
        total_fold_to_continuation_bet: 4,
        total_check_fold: 2,
        total_raise_fold: 1,
        games: 50,
        updated_at: new Date().toISOString()
    };
    
    try {
        const { data, error } = await supabase
            .from('poker_player_stats')
            .insert(testData);
            
        if (error) {
            console.error('❌ 数据上传测试失败:', error);
            return false;
        }
        
        console.log('✅ 数据上传测试成功:', testData.player_id);
        return testData.player_id;
    } catch (error) {
        console.error('❌ 数据上传测试异常:', error);
        return false;
    }
}

// 测试数据查询
async function testDataQuery(playerId) {
    console.log('🧪 开始测试数据查询...');
    
    try {
        const { data, error } = await supabase
            .from('poker_player_stats')
            .select('*')
            .eq('player_id', playerId)
            .single();
            
        if (error) {
            console.error('❌ 数据查询测试失败:', error);
            return false;
        }
        
        console.log('✅ 数据查询测试成功:', data);
        return data;
    } catch (error) {
        console.error('❌ 数据查询测试异常:', error);
        return false;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🚀 开始运行Supabase集成测试套件');
    
    // 测试连接
    const connectionOk = await testSupabaseConnection();
    if (!connectionOk) {
        console.log('❌ 连接测试失败，跳过后续测试');
        return;
    }
    
    // 测试上传
    const testPlayerId = await testDataUpload();
    if (!testPlayerId) {
        console.log('❌ 上传测试失败，跳过查询测试');
        return;
    }
    
    // 测试查询
    const queriedData = await testDataQuery(testPlayerId);
    if (!queriedData) {
        console.log('❌ 查询测试失败');
        return;
    }
    
    console.log('🎉 所有测试通过！Supabase集成功能正常');
}

// 如果在浏览器环境中运行
if (typeof window !== 'undefined' && window.supabase) {
    // 初始化Supabase客户端
    window.supabaseClient = window.supabase.createClient(
        CONFIG.SUPABASE_URL,
        CONFIG.SUPABASE_KEY
    );
    
    // 运行测试
    runAllTests();
} else {
    console.log('⚠️ 请在浏览器环境中运行此测试，并确保已加载Supabase SDK');
}

// 导出测试函数（如果在Node.js环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testSupabaseConnection,
        testDataUpload,
        testDataQuery,
        runAllTests
    };
}
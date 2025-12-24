// 德州扑克数据系统测试脚本
// 用于测试Supabase集成功能

// 测试配置
const TEST_CONFIG = {
    supabaseUrl: 'YOUR_SUPABASE_URL', // 替换为测试用的Supabase URL
    supabaseKey: 'YOUR_SUPABASE_ANON_KEY', // 替换为测试用的Supabase Key
    testPlayerId: 'TestPlayer_' + Date.now()
};

// 测试数据
const TEST_PLAYER_DATA = {
    p_player_id: TEST_CONFIG.testPlayerId,
    p_total_hands: 100,
    p_total_vpip: 25,
    p_total_pfr: 18,
    p_total_three_bet: 5,
    p_total_fold_to_three_bet: 3,
    p_total_continuation_bet: 12,
    p_total_fold_to_continuation_bet: 8,
    p_total_check_fold: 2,
    p_total_raise_fold: 1,
    p_games: 100
};

class SupabaseTester {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.supabaseUrl;
        this.apiKey = config.supabaseKey;
        this.testResults = [];
    }

    // 记录测试结果
    logTest(testName, success, message = '') {
        const result = {
            test: testName,
            success: success,
            message: message,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        
        const status = success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${testName}: ${message}`);
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}/rest/v1/${endpoint}`;
        const headers = {
            'apikey': this.apiKey,
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...options.headers
        };

        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    // 测试数据库连接
    async testConnection() {
        try {
            const response = await this.request('poker_player_stats?limit=1');
            this.logTest('数据库连接测试', true, '成功连接到Supabase数据库');
            return true;
        } catch (error) {
            this.logTest('数据库连接测试', false, error.message);
            return false;
        }
    }

    // 测试插入玩家数据
    async testInsertPlayerData() {
        try {
            const response = await this.request('rpc/upsert_player_stats', {
                method: 'POST',
                body: TEST_PLAYER_DATA
            });
            
            this.logTest('插入玩家数据测试', true, `成功插入测试玩家数据: ${TEST_CONFIG.testPlayerId}`);
            return true;
        } catch (error) {
            this.logTest('插入玩家数据测试', false, error.message);
            return false;
        }
    }

    // 测试查询玩家数据
    async testQueryPlayerData() {
        try {
            const data = await this.request(`player_stats_view?player_id=eq.${TEST_CONFIG.testPlayerId}`);
            
            if (data.length > 0) {
                const player = data[0];
                this.logTest('查询玩家数据测试', true, 
                    `成功查询到玩家数据: VPIP=${player.vpip_percentage}%, PFR=${player.pfr_percentage}%`);
                return true;
            } else {
                this.logTest('查询玩家数据测试', false, '未找到测试玩家数据');
                return false;
            }
        } catch (error) {
            this.logTest('查询玩家数据测试', false, error.message);
            return false;
        }
    }

    // 测试更新玩家数据
    async testUpdatePlayerData() {
        try {
            const updatedData = {
                ...TEST_PLAYER_DATA,
                p_total_hands: 150,
                p_total_vpip: 40,
                p_games: 150
            };

            const response = await this.request('rpc/upsert_player_stats', {
                method: 'POST',
                body: updatedData
            });
            
            this.logTest('更新玩家数据测试', true, '成功更新测试玩家数据');
            return true;
        } catch (error) {
            this.logTest('更新玩家数据测试', false, error.message);
            return false;
        }
    }

    // 测试删除玩家数据
    async testDeletePlayerData() {
        try {
            const response = await this.request(`poker_player_stats?player_id=eq.${TEST_CONFIG.testPlayerId}`, {
                method: 'DELETE'
            });
            
            this.logTest('删除玩家数据测试', true, '成功删除测试玩家数据');
            return true;
        } catch (error) {
            this.logTest('删除玩家数据测试', false, error.message);
            return false;
        }
    }

    // 测试游戏数据记录
    async testGameRecord() {
        try {
            const gameData = {
                game_id: `test_game_${Date.now()}`,
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 300000).toISOString(), // 5分钟后
                duration: 300000 // 5分钟
            };

            const response = await this.request('poker_games', {
                method: 'POST',
                body: gameData
            });
            
            this.logTest('游戏数据记录测试', true, '成功记录游戏数据');
            return true;
        } catch (error) {
            this.logTest('游戏数据记录测试', false, error.message);
            return false;
        }
    }

    // 测试批量查询
    async testBatchQuery() {
        try {
            const playerIds = [TEST_CONFIG.testPlayerId];
            const idParams = playerIds.map(id => `player_id=eq.${id}`).join('&');
            const data = await this.request(`player_stats_view?${idParams}`);
            
            this.logTest('批量查询测试', true, `成功批量查询 ${data.length} 个玩家数据`);
            return true;
        } catch (error) {
            this.logTest('批量查询测试', false, error.message);
            return false;
        }
    }

    // 运行所有测试
    async runAllTests() {
        console.log('🚀 开始运行Supabase集成测试...\n');
        
        const tests = [
            () => this.testConnection(),
            () => this.testInsertPlayerData(),
            () => this.testQueryPlayerData(),
            () => this.testUpdatePlayerData(),
            () => this.testQueryPlayerData(), // 再次查询验证更新
            () => this.testGameRecord(),
            () => this.testBatchQuery(),
            () => this.testDeletePlayerData()
        ];

        let passedTests = 0;
        let totalTests = tests.length;

        for (const test of tests) {
            try {
                const result = await test();
                if (result) passedTests++;
            } catch (error) {
                console.error('测试执行错误:', error);
            }
            
            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 输出测试总结
        console.log('\n📊 测试结果总结:');
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过测试: ${passedTests}`);
        console.log(`失败测试: ${totalTests - passedTests}`);
        console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        // 输出详细结果
        console.log('\n📋 详细测试结果:');
        this.testResults.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
        });

        return passedTests === totalTests;
    }
}

// 在浏览器环境中运行测试
if (typeof window !== 'undefined') {
    window.runSupabaseTests = async function() {
        if (TEST_CONFIG.supabaseUrl === 'YOUR_SUPABASE_URL' || 
            TEST_CONFIG.supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
            console.error('❌ 请先在TEST_CONFIG中配置正确的Supabase URL和Key');
            return false;
        }

        const tester = new SupabaseTester(TEST_CONFIG);
        return await tester.runAllTests();
    };

    console.log('测试函数已加载。在控制台中运行 runSupabaseTests() 来开始测试。');
}

// 在Node.js环境中运行测试
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseTester, TEST_CONFIG };
}
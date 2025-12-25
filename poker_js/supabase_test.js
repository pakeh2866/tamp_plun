// ==UserScript==
// @name         Supabase 数据上传测试脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  测试向 Supabase 上传德州扑克玩家统计数据
// @author       Test
// @match        https://www.torn.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      supabase.co
// @require      https://unpkg.com/@supabase/supabase-js@2.49.3/dist/umd/supabase.js
// ==/UserScript==

(function() {
    'use strict';
    
    // 调试标志
    const DEBUG_MODE = true;
    
    // Supabase 配置 - 请确保这些值是正确的
    const CONFIG = {
        SUPABASE_URL: 'https://ofqcrvrwynvfndlyvwxj.supabase.co',
        SUPABASE_KEY: 'sb_publishable_UatkL70zLpCzgpmytIZs6g_BYvvF668' // 请检查这个密钥是否完整
    };
    
    // 诊断配置
    function diagnoseConfig() {
        if(DEBUG_MODE) {
            console.log('🔍 配置诊断:');
            console.log('Supabase URL:', CONFIG.SUPABASE_URL);
            console.log('URL 格式检查:', CONFIG.SUPABASE_URL.match(/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/) ? '✅ 正确' : '❌ 错误');
            
            console.log('API 密钥:', CONFIG.SUPABASE_KEY);
            console.log('密钥长度:', CONFIG.SUPABASE_KEY.length);
            
            if (CONFIG.SUPABASE_KEY.startsWith('sb_publishable_')) {
                console.error('❌ API 密钥格式错误: 这看起来是一个截断的密钥');
                console.error('💡 正确的 Supabase 公开密钥应该以 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 开头');
                console.error('💡 请从 Supabase Dashboard > Project Settings > API 复制完整的 anon public 密钥');
            } else if (CONFIG.SUPABASE_KEY.startsWith('eyJ')) {
                console.log('✅ API 密钥格式正确 (JWT 格式)');
            } else {
                console.error('❌ API 密钥格式未知');
            }
        }
    }
    
    // 测试数据
    const TEST_PLAYERS = [
        {
            player_id: 'test_player_1',
            total_hands: 100,
            total_vpip: 25,
            total_pfr: 18,
            total_three_bet: 5,
            total_fold_to_three_bet: 3,
            total_continuation_bet: 12,
            total_fold_to_continuation_bet: 8,
            total_check_fold: 15,
            total_raise_fold: 2,
            games: 100
        },
        {
            player_id: 'test_player_2',
            total_hands: 150,
            total_vpip: 45,
            total_pfr: 30,
            total_three_bet: 8,
            total_fold_to_three_bet: 5,
            total_continuation_bet: 20,
            total_fold_to_continuation_bet: 12,
            total_check_fold: 20,
            total_raise_fold: 3,
            games: 150
        },
        {
            player_id: 'test_player_3',
            total_hands: 80,
            total_vpip: 20,
            total_pfr: 12,
            total_three_bet: 3,
            total_fold_to_three_bet: 2,
            total_continuation_bet: 8,
            total_fold_to_continuation_bet: 5,
            total_check_fold: 12,
            total_raise_fold: 1,
            games: 80
        }
    ];
    
    let supabase = null;
    
    // 初始化 Supabase 客户端
    async function initSupabase() {
        if (!window.supabase) {
            if(DEBUG_MODE) console.error('❌ Supabase SDK 未加载');
            return false;
        }
        
        try {
            supabase = window.supabase.createClient(
                CONFIG.SUPABASE_URL,
                CONFIG.SUPABASE_KEY
            );
            if(DEBUG_MODE) console.log('✅ Supabase 客户端初始化成功');
            return true;
        } catch (error) {
            if(DEBUG_MODE) console.error('❌ Supabase 客户端初始化失败:', error);
            return false;
        }
    }
    
    // 测试基本网络连接
    async function testBasicConnection() {
        if(DEBUG_MODE) console.log('🔍 测试基本网络连接...');
        
        try {
            // 直接测试 Supabase REST API
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/`, {
                method: 'GET',
                headers: {
                    'apikey': CONFIG.SUPABASE_KEY,
                    'Content-Type': 'application/json'
                }
            });
            
            if(DEBUG_MODE) {
                console.log('📡 网络请求状态:', response.status);
                console.log('📡 响应头:', response.headers);
            }
            
            if (response.ok) {
                if(DEBUG_MODE) console.log('✅ 基本网络连接成功');
                return true;
            } else {
                if(DEBUG_MODE) {
                    console.error('❌ 网络请求失败，状态码:', response.status);
                    console.error('❌ 响应文本:', await response.text());
                }
                return false;
            }
        } catch (error) {
            if(DEBUG_MODE) {
                console.error('❌ 基本网络连接异常:', error);
                console.error('异常类型:', error.name);
                console.error('异常信息:', error.message);
                
                // 网络错误分析
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    console.error('💡 可能原因:');
                    console.error('  1. Supabase URL 不正确');
                    console.error('  2. 网络连接问题');
                    console.error('  3. CORS 限制');
                    console.error('  4. 防火墙或代理问题');
                    console.error('  5. Supabase 服务不可用');
                }
            }
            return false;
        }
    }
    
    // 测试 API 密钥
    async function testApiKey() {
        if(DEBUG_MODE) console.log('🔑 测试 API 密钥...');
        
        try {
            // 测试 API 密钥是否有效
            const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/`, {
                method: 'GET',
                headers: {
                    'apikey': CONFIG.SUPABASE_KEY,
                    'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                if(DEBUG_MODE) console.log('✅ API 密钥有效');
                return true;
            } else {
                if(DEBUG_MODE) {
                    console.error('❌ API 密钥无效，状态码:', response.status);
                    const responseText = await response.text();
                    console.error('❌ 响应内容:', responseText);
                    
                    if (response.status === 401) {
                        console.error('💡 API 密钥可能不完整或格式错误');
                        console.error('💡 正确的密钥应该以 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 开头');
                    }
                }
                return false;
            }
        } catch (error) {
            if(DEBUG_MODE) {
                console.error('❌ API 密钥测试异常:', error);
            }
            return false;
        }
    }
    
    // 测试连接
    async function testConnection() {
        if(DEBUG_MODE) console.log('🔍 测试 Supabase 连接...');
        
        // 1. 先测试基本网络连接
        const basicConnected = await testBasicConnection();
        if (!basicConnected) {
            if(DEBUG_MODE) console.error('❌ 基本网络连接失败，无法继续测试');
            return false;
        }
        
        // 2. 测试 API 密钥
        const apiKeyValid = await testApiKey();
        if (!apiKeyValid) {
            if(DEBUG_MODE) console.error('❌ API 密钥无效，无法继续测试');
            return false;
        }
        
        // 3. 测试数据库连接
        try {
            // 测试基本连接
            const { data, error } = await supabase
                .from('poker_player_stats')
                .select('count')
                .limit(1);
                
            if (error) {
                if(DEBUG_MODE) {
                    console.error('❌ 数据库连接测试失败:', error);
                    console.error('错误代码:', error.code);
                    console.error('错误详情:', error.details);
                    console.error('错误提示:', error.hint);
                    
                    // 常见错误分析
                    if (error.code === 'PGRST301') {
                        console.error('💡 可能原因: API 密钥无效或权限不足');
                    } else if (error.code === 'PGRST116') {
                        console.error('💡 可能原因: 表 poker_player_stats 不存在');
                    } else if (error.code === '42501') {
                        console.error('💡 可能原因: 权限被拒绝，检查 RLS 策略');
                    }
                }
                return false;
            }
            
            if(DEBUG_MODE) console.log('✅ 数据库连接测试成功');
            return true;
        } catch (error) {
            if(DEBUG_MODE) {
                console.error('❌ 数据库连接测试异常:', error);
                console.error('异常类型:', error.name);
                console.error('异常信息:', error.message);
            }
            return false;
        }
    }
    
    // 测试表是否存在
    async function testTableExists() {
        if(DEBUG_MODE) console.log('🔍 检查表是否存在...');
        
        try {
            const { data, error } = await supabase
                .from('poker_player_stats')
                .select('*')
                .limit(1);
                
            if (error) {
                if(DEBUG_MODE) {
                    console.error('❌ 表检查失败:', error);
                    if (error.code === 'PGRST116') {
                        console.error('💡 表 poker_player_stats 不存在，请先创建表');
                        console.error('💡 您可以在 Supabase Dashboard 的 Table Editor 中手动创建表');
                        console.error('💡 或者在 SQL Editor 中执行 supabase_database_schema.sql 文件');
                    }
                }
                return false;
            }
            
            if(DEBUG_MODE) console.log('✅ 表存在且可访问');
            return true;
        } catch (error) {
            if(DEBUG_MODE) console.error('❌ 表检查异常:', error);
            return false;
        }
    }
    
    // 上传测试数据
    async function uploadTestData() {
        if(DEBUG_MODE) console.log('📤 开始上传测试数据...');
        
        let successCount = 0;
        let failCount = 0;
        
        for (const player of TEST_PLAYERS) {
            try {
                if(DEBUG_MODE) console.log(`📤 上传玩家: ${player.player_id}`);
                
                const { data, error } = await supabase
                    .from('poker_player_stats')
                    .upsert({
                        player_id: player.player_id,
                        total_hands: player.total_hands,
                        total_vpip: player.total_vpip,
                        total_pfr: player.total_pfr,
                        total_three_bet: player.total_three_bet,
                        total_fold_to_three_bet: player.total_fold_to_three_bet,
                        total_continuation_bet: player.total_continuation_bet,
                        total_fold_to_continuation_bet: player.total_fold_to_continuation_bet,
                        total_check_fold: player.total_check_fold,
                        total_raise_fold: player.total_raise_fold,
                        games: player.games,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'player_id'
                    });
                
                if (error) {
                    if(DEBUG_MODE) {
                        console.error(`❌ 上传玩家 ${player.player_id} 失败:`, error);
                        console.error('错误代码:', error.code);
                        console.error('错误详情:', error.details);
                        console.error('错误提示:', error.hint);
                        console.error('上传的数据:', player);
                    }
                    failCount++;
                } else {
                    if(DEBUG_MODE) console.log(`✅ 玩家 ${player.player_id} 上传成功`);
                    successCount++;
                }
            } catch (error) {
                if(DEBUG_MODE) {
                    console.error(`❌ 上传玩家 ${player.player_id} 异常:`, error);
                    console.error('异常类型:', error.name);
                    console.error('异常信息:', error.message);
                }
                failCount++;
            }
        }
        
        if(DEBUG_MODE) {
            console.log(`📊 上传结果: 成功 ${successCount} 个, 失败 ${failCount} 个`);
            if (successCount > 0) {
                console.log('🎉 部分或全部数据上传成功！');
            } else {
                console.log('❌ 所有数据上传失败，请检查配置和权限');
            }
        }
        
        return successCount > 0;
    }
    
    // 验证上传的数据
    async function verifyUploadedData() {
        if(DEBUG_MODE) console.log('🔍 验证上传的数据...');
        
        try {
            for (const player of TEST_PLAYERS) {
                const { data, error } = await supabase
                    .from('poker_player_stats')
                    .select('*')
                    .eq('player_id', player.player_id)
                    .single();
                
                if (error) {
                    if(DEBUG_MODE) console.error(`❌ 查询玩家 ${player.player_id} 失败:`, error);
                } else if (data) {
                    if(DEBUG_MODE) {
                        console.log(`✅ 玩家 ${player.player_id} 数据验证成功:`);
                        console.log('  - 总手数:', data.total_hands);
                        console.log('  - VPIP:', data.total_vpip);
                        console.log('  - PFR:', data.total_pfr);
                        console.log('  - 游戏数:', data.games);
                        console.log('  - 更新时间:', data.updated_at);
                    }
                }
            }
        } catch (error) {
            if(DEBUG_MODE) console.error('❌ 验证数据异常:', error);
        }
    }
    
    // 清理测试数据
    async function cleanupTestData() {
        if(DEBUG_MODE) console.log('🧹 清理测试数据...');
        
        try {
            for (const player of TEST_PLAYERS) {
                const { error } = await supabase
                    .from('poker_player_stats')
                    .delete()
                    .eq('player_id', player.player_id);
                
                if (error) {
                    if(DEBUG_MODE) console.error(`❌ 删除玩家 ${player.player_id} 失败:`, error);
                } else {
                    if(DEBUG_MODE) console.log(`✅ 玩家 ${player.player_id} 已删除`);
                }
            }
        } catch (error) {
            if(DEBUG_MODE) console.error('❌ 清理数据异常:', error);
        }
    }
    
    // 创建测试界面
    function createTestUI() {
        // 创建测试面板
        const panel = document.createElement('div');
        panel.id = 'supabase-test-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        
        panel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">🧪 Supabase 测试面板</h3>
            
            <div style="margin-bottom: 10px;">
                <strong>URL:</strong> ${CONFIG.SUPABASE_URL}
            </div>
            
            <div style="margin-bottom: 10px;">
                <strong>密钥:</strong> ${CONFIG.SUPABASE_KEY.substring(0, 20)}...
            </div>
            
            <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                <strong>测试数据:</strong><br>
                ${TEST_PLAYERS.length} 个玩家数据
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button id="test-connection" style="padding: 8px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">测试连接</button>
                <button id="test-table" style="padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">检查表</button>
                <button id="upload-data" style="padding: 8px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">上传数据</button>
                <button id="verify-data" style="padding: 8px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">验证数据</button>
                <button id="cleanup-data" style="padding: 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">清理数据</button>
                <button id="run-all-tests" style="padding: 10px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">运行完整测试</button>
            </div>
            
            <div id="test-log" style="margin-top: 15px; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap;"></div>
        `;
        
        document.body.appendChild(panel);
        
        // 日志输出函数
        function log(message) {
            const logDiv = document.getElementById('test-log');
            const timestamp = new Date().toLocaleTimeString();
            logDiv.textContent += `[${timestamp}] ${message}\n`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        // 重写 console.log 和 console.error 以显示在面板中
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = function(...args) {
            originalLog.apply(console, args);
            if (DEBUG_MODE) log(args.join(' '));
        };
        
        console.error = function(...args) {
            originalError.apply(console, args);
            if (DEBUG_MODE) log('ERROR: ' + args.join(' '));
        };
        
        // 绑定按钮事件
        document.getElementById('test-connection').addEventListener('click', async () => {
            log('开始测试连接...');
            const success = await testConnection();
            log(success ? '✅ 连接测试成功' : '❌ 连接测试失败');
        });
        
        document.getElementById('test-table').addEventListener('click', async () => {
            log('开始检查表...');
            const exists = await testTableExists();
            log(exists ? '✅ 表存在' : '❌ 表不存在或无法访问');
        });
        
        document.getElementById('upload-data').addEventListener('click', async () => {
            log('开始上传数据...');
            const success = await uploadTestData();
            log(success ? '✅ 数据上传成功' : '❌ 数据上传失败');
        });
        
        document.getElementById('verify-data').addEventListener('click', async () => {
            log('开始验证数据...');
            await verifyUploadedData();
            log('✅ 数据验证完成');
        });
        
        document.getElementById('cleanup-data').addEventListener('click', async () => {
            log('开始清理数据...');
            await cleanupTestData();
            log('✅ 数据清理完成');
        });
        
        document.getElementById('run-all-tests').addEventListener('click', async () => {
            log('开始运行完整测试...');
            
            // 1. 初始化
            const initialized = await initSupabase();
            if (!initialized) {
                log('❌ 初始化失败，测试终止');
                return;
            }
            log('✅ 初始化成功');
            
            // 2. 测试连接
            const connected = await testConnection();
            if (!connected) {
                log('❌ 连接失败，测试终止');
                return;
            }
            log('✅ 连接测试通过');
            
            // 3. 检查表
            const tableExists = await testTableExists();
            if (!tableExists) {
                log('❌ 表不存在，测试终止');
                return;
            }
            log('✅ 表检查通过');
            
            // 4. 上传数据
            const uploaded = await uploadTestData();
            if (!uploaded) {
                log('❌ 数据上传失败，测试终止');
                return;
            }
            log('✅ 数据上传成功');
            
            // 5. 验证数据
            await verifyUploadedData();
            log('✅ 数据验证完成');
            
            log('🎉 所有测试完成！');
        });
    }
    
    // 主函数
    async function main() {
        if(DEBUG_MODE) console.log('🚀 Supabase 测试脚本启动');
        
        // 初始化 Supabase
        const initialized = await initSupabase();
        if (!initialized) {
            if(DEBUG_MODE) console.error('❌ 无法初始化 Supabase 客户端');
            return;
        }
        
        // 创建测试界面
        createTestUI();
        
        if(DEBUG_MODE) console.log('✅ 测试面板已创建，可以开始测试');
    }
    
    // 启动
    window.addEventListener('load', () => {
        setTimeout(main, 1000);
    });
})();
// ==UserScript==
// @name         Supabase 简单上传测试
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  简单测试 Supabase 数据上传
// @author       Test
// @match        https://www.torn.com/*
// @grant        GM_addStyle
// @connect      supabase.co
// @require      https://unpkg.com/@supabase/supabase-js@2.49.3/dist/umd/supabase.js
// ==/UserScript==

(function() {
    'use strict';
    
    // Supabase 配置 - 请更新为正确的密钥
    const CONFIG = {
        SUPABASE_URL: 'https://ofqcrvrwynvfndlyvwxj.supabase.co',
        SUPABASE_KEY: 'sb_publishable_UatkL70zLpCzgpmytIZs6g_BYvvF668' // 需要更新为完整密钥
    };
    
    // 测试数据
    const TEST_DATA = {
        player_id: 'test_user_' + Date.now(),
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
    };
    
    let supabase = null;
    
    // 初始化 Supabase
    async function initSupabase() {
        if (!window.supabase) {
            console.error('❌ Supabase SDK 未加载');
            return false;
        }
        
        try {
            supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            console.log('✅ Supabase 初始化成功');
            return true;
        } catch (error) {
            console.error('❌ Supabase 初始化失败:', error);
            return false;
        }
    }
    
    // 上传测试数据
    async function uploadTest() {
        console.log('📤 开始上传测试...');
        
        try {
            const { data, error } = await supabase
                .from('poker_player_stats')
                .upsert({
                    ...TEST_DATA,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'player_id'
                });
            
            if (error) {
                console.error('❌ 上传失败:', error);
                console.error('错误代码:', error.code);
                console.error('错误详情:', error.details);
                
                // 常见错误提示
                if (error.code === 'PGRST116') {
                    console.error('💡 表不存在，请先创建表');
                } else if (error.code === 'PGRST301') {
                    console.error('💡 API 密钥无效，请检查密钥');
                }
                return false;
            }
            
            console.log('✅ 上传成功!');
            console.log('数据:', data);
            return true;
        } catch (error) {
            console.error('❌ 上传异常:', error);
            return false;
        }
    }
    
    // 创建简单界面
    function createUI() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        panel.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">🧪 Supabase 测试</h3>
            <button id="test-upload" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">测试上传</button>
            <div id="result" style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 12px;"></div>
        `;
        
        document.body.appendChild(panel);
        
        document.getElementById('test-upload').addEventListener('click', async () => {
            const resultDiv = document.getElementById('result');
            resultDiv.textContent = '测试中...';
            
            const success = await uploadTest();
            resultDiv.textContent = success ? '✅ 上传成功!' : '❌ 上传失败，查看控制台详情';
            resultDiv.style.background = success ? '#d4edda' : '#f8d7da';
        });
    }
    
    // 启动
    window.addEventListener('load', async () => {
        await initSupabase();
        createUI();
        console.log('🚀 测试脚本已加载，点击按钮测试上传');
    });
})();
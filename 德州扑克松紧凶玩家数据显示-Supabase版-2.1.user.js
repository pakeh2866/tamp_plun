// ==UserScript==
// @name         德州扑克松紧凶玩家数据显示-Supabase版
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  根据游戏日志计算玩家VPIP/PFR/3BET/F3B/CB/BF等多项德州扑克统计数据，支持Supabase云端存储和查询
// @author       shaowu[2691980]
// @match        https://www.torn.com/page.php?sid=holdem*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/* 数据会显示到网页右上角，手机显示估计暂不支持，后续会开发适配手机， */
/* 20250524 发布2.1  Supabase云端集成
                      1.新增Supabase云端数据存储功能
                      2.新增通过玩家ID查询云端数据功能
                      3.新增数据自动同步机制
                      4.新增云端数据缓存机制
                      5.新增数据上传状态显示*/

/* 20250524 发布2.0  重大功能更新
                      1.新增3BET（三次下注）统计功能
                      2.新增F3B（面对三次下注弃牌率）统计功能
                      3.新增CB（持续下注率）统计功能
                      4.新增BF（面对下注弃牌率）统计功能
                      5.重新设计界面，支持6项指标同时显示
                      6.优化颜色分类系统，更直观展示玩家类型*/

/* 20250524 发布1.1  修复BUG
                      1.修复翻前被raise后再CALL重复计算的BUG
                      2.修复翻前allin不能被正确识别BUG*/

/* 20250524 发布1.0 现已支持本地保存，
                    支持不同颜色区分入池率，
                    支持上桌离桌自动更新

                    待开发功能
                    1.根据入池率进行排序
                    2.将自己ID的操作去掉
                    3.将VPIP细分为 open/limp/3bet/4bet
                    4.后续将会继续增加翻后数据展示
                    5.将数据分开和位置头像结合起来，直接显示到位置对应人旁边*/

/* 使用立即执行函数确保作用域隔离 */
let currentTime = 0; // 游戏阶段：0=翻后/游戏结束，1=翻前阶段
let currentStreet = 0; // 当前街道：0=翻前, 1=翻牌, 2=转牌, 3=河牌
let lastRaisePlayer = null; // 上一个加注的玩家
let lastBetPlayer = null; // 上一个下注的玩家
let raiseCount = 0; // 当前轮次加注次数
(function() {
    'use strict';
    /* 清空缓存用，一般情况请勿放开 */
    //clearAllStorage();
    /* 调试标志 - 设为true时输出详细日志 */
    const DEBUG_MODE = true;

    // Supabase配置 - 请根据你的Supabase项目信息修改
    const SUPABASE_CONFIG = {
        url: 'https://ofqcrvrwynvfndlyvwxj.supabase.co', // 替换为你的Supabase项目URL
        anonKey: 'sb_publishable_UatkL70zLpCzgpmytIZs6g_BYvvF668', // 替换为你的Supabase匿名密钥
        upload: {
            enabled: true, // 是否启用自动上传
            interval: 30000, // 上传间隔（毫秒）
            batchSize: 50, // 批量上传大小
            maxRetries: 3, // 重试次数
            retryDelay: 5000 // 重试延迟（毫秒）
        },
        query: {
            timeout: 10000, // 查询超时时间（毫秒）
            cacheTime: 300000 // 缓存时间（毫秒）
        }
    };

    /* 存储游戏和玩家数据 */
    let gameStats = {}; // 游戏统计数据：{gameId: {players: {playerId: {hands: 手数, vpip: 主动入池次数, pfr: 翻前加注次数, threeBet: 三次下注次数, foldToThreeBet: 面对三次下注弃牌次数, continuationBet: 持续下注次数, foldToContinuationBet: 面对持续下注弃牌次数, checkFold: 检查弃牌次数, raiseFold: 加注弃牌次数}}, startTime: 时间戳}}
    let playerStats = {}; // 玩家累计统计数据：{playerId: {totalHands: 总手数, totalVpip: 总主动入池次数, totalPfr: 总翻前加注次数, totalThreeBet: 总三次下注次数, totalFoldToThreeBet: 总面对三次下注弃牌次数, totalContinuationBet: 总持续下注次数, totalFoldToContinuationBet: 总面对持续下注弃牌次数, totalCheckFold: 总检查弃牌次数, totalRaiseFold: 总加注弃牌次数, games: 参与游戏数}}
    let processed_ids = []; // 本局已处理的玩家ID列表，防止重复计算
    let table_player = {}; // 桌面玩家状态：{playerId: {intable: true/false}}
    let currentGameId = null; // 当前游戏唯一ID
    let gameCounter = 0; // 游戏计数器
    
    // Supabase相关变量
    let supabaseClient = null;
    let uploadQueue = [];
    let lastUploadTime = 0;
    let cloudPlayerStats = {}; // 云端玩家数据缓存
    let syncStatus = 'idle'; // 同步状态: idle, uploading, success, error
    
    if(DEBUG_MODE) console.log('=== VPIP脚本启动 ===');
    if(DEBUG_MODE) console.log('验证processed_ids是否为数组:', Array.isArray(processed_ids));
    
    // 初始化Supabase客户端
    function initSupabaseClient() {
        if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || 
            SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || 
            SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
            if(DEBUG_MODE) console.warn('⚠️ Supabase配置未设置，将仅使用本地存储');
            return false;
        }

        supabaseClient = new SupabaseClient(SUPABASE_CONFIG);
        if(DEBUG_MODE) console.log('✅ Supabase客户端初始化成功');
        return true;
    }

    // Supabase客户端类
    class SupabaseClient {
        constructor(config) {
            this.config = config;
            this.baseUrl = config.url;
            this.apiKey = config.anonKey;
            this.cache = new Map();
        }

        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}/rest/v1/${endpoint}`;
            const headers = {
                'apikey': this.apiKey,
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
                ...options.headers
            };

            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url: url,
                    headers: headers,
                    data: options.body ? JSON.stringify(options.body) : undefined,
                    onload: function(response) {
                        try {
                            if (response.status >= 200 && response.status < 300) {
                                const data = response.responseText ? JSON.parse(response.responseText) : null;
                                resolve(data);
                            } else {
                                reject(new Error(`HTTP ${response.status}: ${response.responseText}`));
                            }
                        } catch (e) {
                            reject(e);
                        }
                    },
                    onerror: function(error) {
                        reject(new Error('Network error'));
                    },
                    ontimeout: function() {
                        reject(new Error('Request timeout'));
                    },
                    timeout: this.config.query.timeout
                });
            });
        }

        async requestWithRetry(endpoint, options = {}, maxRetries = 3, delay = 1000) {
            let lastError;
            
            for (let i = 0; i < maxRetries; i++) {
                try {
                    return await this.request(endpoint, options);
                } catch (error) {
                    lastError = error;
                    if(DEBUG_MODE) console.warn(`请求失败，重试 ${i + 1}/${maxRetries}:`, error.message);
                    
                    if (i < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                    }
                }
            }
            
            throw lastError;
        }

        async getPlayerStats(playerId) {
            const cacheKey = `player_${playerId}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < this.config.query.cacheTime) {
                return cached.data;
            }

            try {
                const data = await this.requestWithRetry(
                    `player_stats_view?player_id=eq.${playerId}`,
                    { method: 'GET' },
                    3,
                    1000
                );

                const result = data.length > 0 ? data[0] : null;
                
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });

                return result;
            } catch (error) {
                if(DEBUG_MODE) console.error('获取玩家统计数据失败:', error);
                return null;
            }
        }

        async upsertPlayerStats(playerData) {
            try {
                const response = await this.requestWithRetry(
                    `rpc/upsert_player_stats`,
                    {
                        method: 'POST',
                        body: playerData
                    },
                    this.config.upload.maxRetries,
                    this.config.upload.retryDelay
                );

                const cacheKey = `player_${playerData.p_player_id}`;
                this.cache.delete(cacheKey);

                return response;
            } catch (error) {
                if(DEBUG_MODE) console.error('上传玩家统计数据失败:', error);
                throw error;
            }
        }

        async recordGame(gameData) {
            try {
                const response = await this.requestWithRetry(
                    `poker_games`,
                    {
                        method: 'POST',
                        body: gameData
                    },
                    this.config.upload.maxRetries,
                    this.config.upload.retryDelay
                );

                return response;
            } catch (error) {
                if(DEBUG_MODE) console.error('记录游戏数据失败:', error);
                throw error;
            }
        }

        async recordGamePlayers(gamePlayersData) {
            try {
                const response = await this.requestWithRetry(
                    `poker_game_players`,
                    {
                        method: 'POST',
                        body: gamePlayersData
                    },
                    this.config.upload.maxRetries,
                    this.config.upload.retryDelay
                );

                return response;
            } catch (error) {
                if(DEBUG_MODE) console.error('记录游戏玩家数据失败:', error);
                throw error;
            }
        }
    }

    // 从本地存储加载数据
    try {
        const storedPlayerStats = GM_getValue('playerStats');
        if (storedPlayerStats) {
            playerStats = JSON.parse(storedPlayerStats);
            if(DEBUG_MODE) console.log('成功加载玩家历史数据:', Object.keys(playerStats).length, '个玩家');
        } else {
            if(DEBUG_MODE) console.log('未找到玩家历史数据，使用空数据开始');
        }
        
        const storedGameStats = GM_getValue('gameStats');
        if (storedGameStats) {
            gameStats = JSON.parse(storedGameStats);
            if(DEBUG_MODE) console.log('成功加载游戏历史数据:', Object.keys(gameStats).length, '局游戏');
        } else {
            if(DEBUG_MODE) console.log('未找到游戏历史数据，使用空数据开始');
        }
    } catch (e) {
        console.error('加载持久化数据时出错:', e);
    }

    // 从云端加载玩家数据
    async function loadCloudPlayerStats(playerIds) {
        if (!supabaseClient || playerIds.length === 0) return;

        try {
            syncStatus = 'uploading';
            const stats = await Promise.all(
                playerIds.map(playerId => supabaseClient.getPlayerStats(playerId))
            );

            stats.forEach(stat => {
                if (stat) {
                    cloudPlayerStats[stat.player_id] = stat;
                }
            });

            syncStatus = 'success';
            if(DEBUG_MODE) console.log('✅ 云端数据加载完成，共', Object.keys(cloudPlayerStats).length, '个玩家');
        } catch (error) {
            syncStatus = 'error';
            if(DEBUG_MODE) console.error('❌ 加载云端数据失败:', error);
        }
    }

    // 上传玩家数据到云端
    async function uploadPlayerStatsToCloud() {
        if (!supabaseClient || !SUPABASE_CONFIG.upload.enabled) return;

        const now = Date.now();
        if (now - lastUploadTime < SUPABASE_CONFIG.upload.interval) {
            return; // 还未到上传时间
        }

        try {
            syncStatus = 'uploading';
            const playersToUpload = Object.keys(playerStats).map(playerId => ({
                p_player_id: playerId,
                p_total_hands: playerStats[playerId].totalHands || 0,
                p_total_vpip: playerStats[playerId].totalVpip || 0,
                p_total_pfr: playerStats[playerId].totalPfr || 0,
                p_total_three_bet: playerStats[playerId].totalThreeBet || 0,
                p_total_fold_to_three_bet: playerStats[playerId].totalFoldToThreeBet || 0,
                p_total_continuation_bet: playerStats[playerId].totalContinuationBet || 0,
                p_total_fold_to_continuation_bet: playerStats[playerId].totalFoldToContinuationBet || 0,
                p_total_check_fold: playerStats[playerId].totalCheckFold || 0,
                p_total_raise_fold: playerStats[playerId].totalRaiseFold || 0,
                p_games: playerStats[playerId].games || 0
            }));

            // 批量上传
            const batchSize = SUPABASE_CONFIG.upload.batchSize;
            for (let i = 0; i < playersToUpload.length; i += batchSize) {
                const batch = playersToUpload.slice(i, i + batchSize);
                await Promise.all(
                    batch.map(playerData => supabaseClient.upsertPlayerStats(playerData))
                );
            }

            lastUploadTime = now;
            syncStatus = 'success';
            if(DEBUG_MODE) console.log('✅ 玩家数据上传成功，共', playersToUpload.length, '个玩家');
        } catch (error) {
            syncStatus = 'error';
            if(DEBUG_MODE) console.error('❌ 上传玩家数据失败:', error);
        }
    }

    // 上传游戏数据到云端
    async function uploadGameDataToCloud(gameId) {
        if (!supabaseClient || !gameId || !gameStats[gameId]) return;

        try {
            const game = gameStats[gameId];
            
            // 上传游戏基本信息
            const gameRecord = {
                game_id: gameId,
                start_time: game.startTime ? new Date(game.startTime).toISOString() : null,
                end_time: game.endTime ? new Date(game.endTime).toISOString() : null,
                duration: game.duration || null
            };

            await supabaseClient.recordGame(gameRecord);

            // 上传游戏玩家数据
            const gamePlayers = Object.keys(game.players).map(playerId => ({
                game_id: gameId,
                player_id: playerId,
                hands: game.players[playerId].hands || 0,
                vpip: game.players[playerId].vpip || 0,
                pfr: game.players[playerId].pfr || 0,
                three_bet: game.players[playerId].threeBet || 0,
                fold_to_three_bet: game.players[playerId].foldToThreeBet || 0,
                continuation_bet: game.players[playerId].continuationBet || 0,
                fold_to_continuation_bet: game.players[playerId].foldToContinuationBet || 0,
                check_fold: game.players[playerId].checkFold || 0,
                raise_fold: game.players[playerId].raiseFold || 0
            }));

            for (const playerData of gamePlayers) {
                await supabaseClient.recordGamePlayers(playerData);
            }

            if(DEBUG_MODE) console.log('✅ 游戏数据上传成功:', gameId);
        } catch (error) {
            if(DEBUG_MODE) console.error('❌ 上传游戏数据失败:', gameId, error);
        }
    }

    /* 核心日志解析函数 */
    function parseGameLog(div) {
        try {
            // 提取玩家和行为信息
            const playerElem = div.querySelector('em');
            const actionElem = div.querySelector('span');

            if (!playerElem || !actionElem) {
                if(DEBUG_MODE) console.warn('缺少必要元素:', div);
                return;
            }

            const playerId = playerElem.textContent.trim();
            const action = actionElem.textContent.trim();

            if(DEBUG_MODE) console.log('=== 解析日志条目 ===');
            if(DEBUG_MODE) console.log('玩家ID:', playerId, '行为:', action, '当前游戏阶段:', currentTime === 1 ? '翻前' : '翻后/结束');
            
            // 处理玩家离桌
            if(/^left/i.test(action))
            {
                table_player[playerId] = {intable:false};
                if(DEBUG_MODE) console.log('🚪 玩家离桌:', playerId);
                return;
            }
            
            // 处理玩家入桌（暂时不处理）
            if(/^joined/i.test(action))
            {
                if(DEBUG_MODE) console.log('👋 玩家入桌:', playerId);
                return;
            }
            
            // 翻前阶段开始
            if(playerId == "The preflop")
            {
                currentTime = 1;
                // 生成新的游戏唯一ID
                gameCounter++;
                currentGameId = `game_${Date.now()}_${gameCounter}`;
                gameStats[currentGameId] = {
                    players: {},
                    startTime: Date.now(),
                    startTimestamp: new Date().toLocaleString()
                };
                if(DEBUG_MODE) console.log('🎯 进入翻前阶段，开始新游戏');
                if(DEBUG_MODE) console.log('🆔 生成游戏ID:', currentGameId);
                return;
            }
            
            // 处理盲注（不计入VPIP）
            if(/^post/i.test(action))
            {
                if(DEBUG_MODE) console.log('💰 盲注行为:', playerId, action, '(不计入VPIP)');
                return;
            }
            
            // 街道变化处理
            if(playerId == "The flop:")
            {
                currentStreet = 1; // 进入翻牌圈
                raiseCount = 0; // 重置加注次数
                lastRaisePlayer = null; // 重置最后加注玩家
                lastBetPlayer = null; // 重置最后下注玩家
                if(DEBUG_MODE) console.log('🎴 进入翻牌圈');
                return;
            }
            
            if(playerId == "The turn:")
            {
                currentStreet = 2; // 进入转牌圈
                raiseCount = 0; // 重置加注次数
                lastRaisePlayer = null; // 重置最后加注玩家
                lastBetPlayer = null; // 重置最后下注玩家
                if(DEBUG_MODE) console.log('🎴 进入转牌圈');
                return;
            }
            
            if(playerId == "The river:")
            {
                currentStreet = 3; // 进入河牌圈
                raiseCount = 0; // 重置加注次数
                lastRaisePlayer = null; // 重置最后加注玩家
                lastBetPlayer = null; // 重置最后下注玩家
                if(DEBUG_MODE) console.log('🎴 进入河牌圈');
                return;
            }
            
            // 游戏结束处理
            if(/^won/i.test(action))
            {
                currentTime = 0;
                currentStreet = 0;
                processed_ids = [];
                lastRaisePlayer = null;
                lastBetPlayer = null;
                raiseCount = 0;
                
                // 结束当前游戏
                if(currentGameId && gameStats[currentGameId]) {
                    gameStats[currentGameId].endTime = Date.now();
                    gameStats[currentGameId].endTimestamp = new Date().toLocaleString();
                    gameStats[currentGameId].duration = gameStats[currentGameId].endTime - gameStats[currentGameId].startTime;
                    if(DEBUG_MODE) console.log('🏁 游戏结束:', currentGameId);
                    if(DEBUG_MODE) console.log('⏱️ 游戏时长:', Math.round(gameStats[currentGameId].duration / 1000), '秒');
                    
                    // 上传游戏数据到云端
                    uploadGameDataToCloud(currentGameId);
                }
                
                savePlayerStats(); // 保存数据
                currentGameId = null; // 重置当前游戏ID
                if(DEBUG_MODE) console.log('清空已处理玩家列表:', processed_ids);
                return;
            }
            
            // ========== VPIP核心计算逻辑 ==========
            if( currentTime === 1){
                if(DEBUG_MODE) console.log('📊 [翻前阶段] 处理玩家:', playerId, '游戏ID:', currentGameId);
                
                // 步骤1: 初始化玩家累计数据（如果第一次出现）
                playerStats[playerId] = playerStats[playerId] || {
                    totalHands: 0,
                    totalVpip: 0,
                    totalPfr: 0,
                    totalThreeBet: 0,
                    totalFoldToThreeBet: 0,
                    totalContinuationBet: 0,
                    totalFoldToContinuationBet: 0,
                    totalCheckFold: 0,
                    totalRaiseFold: 0,
                    games: 0
                };
                
                // 步骤2: 初始化当前游戏中的玩家数据
                if(currentGameId && gameStats[currentGameId]) {
                    gameStats[currentGameId].players[playerId] = gameStats[currentGameId].players[playerId] || {
                        hands: 0,
                        vpip: 0,
                        pfr: 0,
                        threeBet: 0,
                        foldToThreeBet: 0,
                        continuationBet: 0,
                        foldToContinuationBet: 0,
                        checkFold: 0,
                        raiseFold: 0
                    };
                }
                
                // 步骤3: 防重复计算检查
                if(processed_ids.includes(playerId))
                {
                    if(DEBUG_MODE) console.log('⚠️ 玩家', playerId, '本局已记录过，跳过');
                    return;
                }
                
                // 步骤4: 标记玩家已处理和在桌
                processed_ids.push(playerId);
                table_player[playerId] = {intable:true};
                
                // 步骤5: 更新累计数据
                playerStats[playerId].totalHands++;
                playerStats[playerId].games++;
                
                // 步骤6: 更新当前游戏数据
                if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                    gameStats[currentGameId].players[playerId].hands++;
                }
                
                // 步骤7: 判断行为类型
                const isVpipAction = /^called/i.test(action) || /^raised/i.test(action)||/^checked/i.test(action)||/^allin/i.test(action);
                const isPfrAction = /^raised/i.test(action) || (/^allin/i.test(action) && currentTime === 1); // 翻前allin也算加注
                const isThreeBetAction = /^raised/i.test(action) && raiseCount >= 1; // 当已有加注时再次加注为3bet
                const isFoldAction = /^folded/i.test(action);
                const isCheckAction = /^checked/i.test(action);
                const isCallAction = /^called/i.test(action);
                
                // 初始化所有统计数据（如果需要）
                playerStats[playerId].totalPfr = playerStats[playerId].totalPfr || 0;
                playerStats[playerId].totalThreeBet = playerStats[playerId].totalThreeBet || 0;
                playerStats[playerId].totalFoldToThreeBet = playerStats[playerId].totalFoldToThreeBet || 0;
                playerStats[playerId].totalContinuationBet = playerStats[playerId].totalContinuationBet || 0;
                playerStats[playerId].totalFoldToContinuationBet = playerStats[playerId].totalFoldToContinuationBet || 0;
                playerStats[playerId].totalCheckFold = playerStats[playerId].totalCheckFold || 0;
                playerStats[playerId].totalRaiseFold = playerStats[playerId].totalRaiseFold || 0;
                
                if (isVpipAction) {
                    // 更新累计VPIP
                    playerStats[playerId].totalVpip++;
                    
                    // 更新当前游戏VPIP
                    if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                        gameStats[currentGameId].players[playerId].vpip++;
                    }
                    
                    // 检查是否为PFR行为
                    if (isPfrAction) {
                        // 更新累计PFR
                        playerStats[playerId].totalPfr++;
                        
                        // 更新当前游戏PFR
                        if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                            gameStats[currentGameId].players[playerId].pfr++;
                        }
                        
                        // 检查是否为3BET行为
                        if (isThreeBetAction) {
                            playerStats[playerId].totalThreeBet++;
                            if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                                gameStats[currentGameId].players[playerId].threeBet++;
                            }
                            if(DEBUG_MODE) console.log(`🔥 3BET更新: ${playerId} | 加注次数: ${raiseCount}`);
                        }
                        
                        // 更新加注状态
                        lastRaisePlayer = playerId;
                        raiseCount++;
                        
                        const vpipRate = ((playerStats[playerId].totalVpip / playerStats[playerId].totalHands) * 100).toFixed(1);
                        const pfrRate = ((playerStats[playerId].totalPfr / playerStats[playerId].totalHands) * 100).toFixed(1);
                        const threeBetRate = playerStats[playerId].totalPfr > 0 ? ((playerStats[playerId].totalThreeBet / playerStats[playerId].totalPfr) * 100).toFixed(1) : "0.0";
                        if(DEBUG_MODE) console.log(`🔥 PFR+VPIP更新: ${playerId} | 总手数: ${playerStats[playerId].totalHands} | 总VPIP: ${playerStats[playerId].totalVpip} | 总PFR: ${playerStats[playerId].totalPfr} | 总3BET: ${playerStats[playerId].totalThreeBet} | VPIP率: ${vpipRate}% | PFR率: ${pfrRate}% | 3BET率: ${threeBetRate}% | 行为: ${action}`);
                    } else if (isCallAction && lastRaisePlayer && raiseCount >= 1) {
                        // 面对加注的跟注，记录为面对3bet的跟注
                        if(DEBUG_MODE) console.log(`📞 面对加注跟注: ${playerId} | 加注者: ${lastRaisePlayer} | 加注次数: ${raiseCount}`);
                    } else {
                        const vpipRate = ((playerStats[playerId].totalVpip / playerStats[playerId].totalHands) * 100).toFixed(1);
                        const pfrRate = ((playerStats[playerId].totalPfr / playerStats[playerId].totalHands) * 100).toFixed(1);
                        if(DEBUG_MODE) console.log(`✅ VPIP更新: ${playerId} | 总手数: ${playerStats[playerId].totalHands} | 总VPIP: ${playerStats[playerId].totalVpip} | 总PFR: ${playerStats[playerId].totalPfr} | VPIP率: ${vpipRate}% | PFR率: ${pfrRate}% | 行为: ${action}`);
                    }
                } else {
                    // 处理弃牌行为
                    if (isFoldAction) {
                        // 面对加注的弃牌
                        if (lastRaisePlayer && raiseCount >= 1) {
                            playerStats[playerId].totalFoldToThreeBet++;
                            if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                                gameStats[currentGameId].players[playerId].foldToThreeBet++;
                            }
                            if(DEBUG_MODE) console.log(`🏳️ 面对加注弃牌: ${playerId} | 加注者: ${lastRaisePlayer} | 加注次数: ${raiseCount}`);
                        }
                        
                        // 面对下注的弃牌（翻后）
                        if (lastBetPlayer && currentStreet > 0) {
                            playerStats[playerId].totalFoldToContinuationBet++;
                            if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                                gameStats[currentGameId].players[playerId].foldToContinuationBet++;
                            }
                            if(DEBUG_MODE) console.log(`🏳️ 面对下注弃牌: ${playerId} | 下注者: ${lastBetPlayer} | 街道: ${currentStreet}`);
                        }
                    }
                    
                    // 处理检查后弃牌
                    if (isCheckAction && lastBetPlayer && currentStreet > 0) {
                        playerStats[playerId].totalCheckFold++;
                        if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                            gameStats[currentGameId].players[playerId].checkFold++;
                        }
                        if(DEBUG_MODE) console.log(`👁️ 检查后弃牌: ${playerId} | 街道: ${currentStreet}`);
                    }
                    
                    const vpipRate = ((playerStats[playerId].totalVpip / playerStats[playerId].totalHands) * 100).toFixed(1);
                    const pfrRate = ((playerStats[playerId].totalPfr / playerStats[playerId].totalHands) * 100).toFixed(1);
                    if(DEBUG_MODE) console.log(`❌ 非VPIP行为: ${playerId} | 总手数: ${playerStats[playerId].totalHands} | 总VPIP: ${playerStats[playerId].totalVpip} | 总PFR: ${playerStats[playerId].totalPfr} | VPIP率: ${vpipRate}% | PFR率: ${pfrRate}% | 行为: ${action}`);
                }
            } else if(currentTime === 0 && currentStreet > 0) {
                // 翻后阶段处理
                if(DEBUG_MODE) console.log('📊 [翻后阶段] 处理玩家:', playerId, '街道:', currentStreet);
                
                // 初始化玩家数据（如果第一次出现）
                playerStats[playerId] = playerStats[playerId] || {
                    totalHands: 0,
                    totalVpip: 0,
                    totalPfr: 0,
                    totalThreeBet: 0,
                    totalFoldToThreeBet: 0,
                    totalContinuationBet: 0,
                    totalFoldToContinuationBet: 0,
                    totalCheckFold: 0,
                    totalRaiseFold: 0,
                    games: 0
                };
                
                // 初始化当前游戏中的玩家数据
                if(currentGameId && gameStats[currentGameId]) {
                    gameStats[currentGameId].players[playerId] = gameStats[currentGameId].players[playerId] || {
                        hands: 0,
                        vpip: 0,
                        pfr: 0,
                        threeBet: 0,
                        foldToThreeBet: 0,
                        continuationBet: 0,
                        foldToContinuationBet: 0,
                        checkFold: 0,
                        raiseFold: 0
                    };
                }
                
                // 判断行为类型
                const isBetAction = /^bet/i.test(action) || /^raised/i.test(action);
                const isFoldAction = /^folded/i.test(action);
                const isCheckAction = /^checked/i.test(action);
                const isCallAction = /^called/i.test(action);
                
                // 处理下注/加注行为
                if (isBetAction) {
                    // 检查是否为持续下注（翻前加注者在翻后的下注）
                    if (lastRaisePlayer === playerId && currentStreet === 1) {
                        playerStats[playerId].totalContinuationBet++;
                        if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                            gameStats[currentGameId].players[playerId].continuationBet++;
                        }
                        if(DEBUG_MODE) console.log(`🔥 持续下注(CB): ${playerId} | 街道: ${currentStreet}`);
                    }
                    
                    // 更新下注状态
                    lastBetPlayer = playerId;
                    lastRaisePlayer = playerId;
                    raiseCount++;
                }
                
                // 处理弃牌行为
                if (isFoldAction) {
                    // 面对下注的弃牌
                    if (lastBetPlayer) {
                        playerStats[playerId].totalFoldToContinuationBet++;
                        if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                            gameStats[currentGameId].players[playerId].foldToContinuationBet++;
                        }
                        if(DEBUG_MODE) console.log(`🏳️ 面对下注弃牌: ${playerId} | 下注者: ${lastBetPlayer} | 街道: ${currentStreet}`);
                    }
                }
                
                // 处理检查后弃牌
                if (isCheckAction && lastBetPlayer) {
                    playerStats[playerId].totalCheckFold++;
                    if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                        gameStats[currentGameId].players[playerId].checkFold++;
                    }
                    if(DEBUG_MODE) console.log(`👁️ 检查后弃牌: ${playerId} | 街道: ${currentStreet}`);
                }
                
            } else {
                if(DEBUG_MODE) console.log('⏸️ [其他阶段] 跳过统计:', playerId, action);
            }

        } catch (e) {
            console.error('解析错误:', e);
        }
    }

    /* 创建观察者监听日志容器 */
    function initObserver() {
        // 关键：需要找到日志的父容器（示例选择器需按实际修改）
        const logContainer = document.querySelector('div.logs___mOaPH');
        if (!logContainer) {
            console.error('未找到日志容器');
            return;
        }
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    // 精确匹配新增的日志条目DIV
                    if (node.nodeType === 1 && node.matches('div.message___RlFXd')) {
                        parseGameLog(node);
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        DEBUG_MODE && console.log('启动MutationObserver');
    }

    /* 显示统计面板 */
    function showStats() {
        try {
            if(DEBUG_MODE) console.log('🔄 更新统计面板显示');
            
            const container = document.getElementById('vpip-stats') || createStatsContainer();
            const tablePlayers = Object.keys(table_player).filter(id => table_player[id].intable);
            
            if(DEBUG_MODE) console.log('当前在桌玩家:', tablePlayers);
            
            // 按VPIP率排序显示
            const sortedPlayers = tablePlayers
                .filter(id => playerStats[id] || cloudPlayerStats[id])
                .sort((a, b) => {
                    const statA = playerStats[a] || cloudPlayerStats[a];
                    const statB = playerStats[b] || cloudPlayerStats[b];
                    const rateA = statA.totalHands > 0 ? statA.totalVpip / statA.totalHands : 0;
                    const rateB = statB.totalHands > 0 ? statB.totalVpip / statB.totalHands : 0;
                    return rateB - rateA; // 按VPIP率降序排列
                });
            
            let html = '';
            
            // 面板标题
            html += '<div style="text-align:center;margin-bottom:12px;border-bottom:1px solid #333;padding-bottom:8px;">';
            html += '<h3 style="margin:0;color:#333;font-size:17px;">🎰 德州扑克统计</h3>';
            
            // 同步状态指示器
            const statusColor = syncStatus === 'success' ? '#44ff44' : 
                              syncStatus === 'error' ? '#ff4444' : 
                              syncStatus === 'uploading' ? '#ffaa00' : '#666666';
            const statusText = syncStatus === 'success' ? '云端已同步' : 
                             syncStatus === 'error' ? '同步失败' : 
                             syncStatus === 'uploading' ? '同步中...' : '本地模式';
            
            html += `<div style="font-size:11px;color:${statusColor};margin-top:4px;">${statusText}</div>`;
            
            if(currentGameId) {
                html += `<div style="font-size:11px;color:#666;margin-top:2px;">游戏: ${currentGameId.split('_')[1]}</div>`;
            }
            html += '</div>';
            
            if (sortedPlayers.length === 0) {
                html += '<div style="text-align:center;color:#999;padding:20px;font-size:14px;">暂无在桌玩家数据</div>';
            } else {
                // 玩家统计卡片
                for (const playerId of sortedPlayers) {
                    const localStat = playerStats[playerId];
                    const cloudStat = cloudPlayerStats[playerId];
                    const stat = localStat || cloudStat;
                    
                    if (!stat) continue;
                    
                    const isCloudData = !localStat && cloudStat;
                    const vpipPercent = stat.totalHands > 0
                        ? (stat.totalVpip / stat.totalHands * 100).toFixed(1)
                        : "0.0";
                    const pfrPercent = stat.totalHands > 0
                        ? (stat.totalPfr / stat.totalHands * 100).toFixed(1)
                        : "0.0";
                    const threeBetPercent = stat.totalPfr > 0
                        ? (stat.totalThreeBet / stat.totalPfr * 100).toFixed(1)
                        : "0.0";
                    const foldToThreeBetPercent = (stat.totalThreeBet + stat.totalFoldToThreeBet) > 0
                        ? (stat.totalFoldToThreeBet / (stat.totalThreeBet + stat.totalFoldToThreeBet) * 100).toFixed(1)
                        : "0.0";
                    const continuationBetPercent = stat.totalPfr > 0
                        ? (stat.totalContinuationBet / stat.totalPfr * 100).toFixed(1)
                        : "0.0";
                    const foldToContinuationBetPercent = (stat.totalContinuationBet + stat.totalFoldToContinuationBet) > 0
                        ? (stat.totalFoldToContinuationBet / (stat.totalContinuationBet + stat.totalFoldToContinuationBet) * 100).toFixed(1)
                        : "0.0";
                    
                    const vpipColor = getVpipColor(vpipPercent);
                    const pfrColor = getPfrColor(pfrPercent);
                    const threeBetColor = getThreeBetColor(threeBetPercent);
                    const foldToThreeBetColor = getFoldToThreeBetColor(foldToThreeBetPercent);
                    const continuationBetColor = getContinuationBetColor(continuationBetPercent);
                    const foldToContinuationBetColor = getFoldToContinuationBetColor(foldToContinuationBetPercent);
                    
                    const vpipType = getPlayerType(vpipPercent);
                    const pfrType = getPfrType(pfrPercent);
                    const threeBetType = getThreeBetType(threeBetPercent);
                    const foldToThreeBetType = getFoldToThreeBetType(foldToThreeBetPercent);
                    const continuationBetType = getContinuationBetType(continuationBetPercent);
                    const foldToContinuationBetType = getFoldToContinuationBetType(foldToContinuationBetPercent);
                    
                    // 获取当前游戏数据
                    let currentGameVpip = 0;
                    let currentGameHands = 0;
                    let currentGamePfr = 0;
                    let currentGameThreeBet = 0;
                    let currentGameFoldToThreeBet = 0;
                    let currentGameContinuationBet = 0;
                    let currentGameFoldToContinuationBet = 0;
                    if(currentGameId && gameStats[currentGameId] && gameStats[currentGameId].players[playerId]) {
                        const currentStat = gameStats[currentGameId].players[playerId];
                        currentGameHands = currentStat.hands;
                        currentGameVpip = currentStat.vpip;
                        currentGamePfr = currentStat.pfr || 0;
                        currentGameThreeBet = currentStat.threeBet || 0;
                        currentGameFoldToThreeBet = currentStat.foldToThreeBet || 0;
                        currentGameContinuationBet = currentStat.continuationBet || 0;
                        currentGameFoldToContinuationBet = currentStat.foldToContinuationBet || 0;
                    }
                    
                    // 玩家卡片
                    html += '<div style="margin-bottom:12px;padding:12px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;box-shadow:0 1px 3px rgba(0,0,0,0.1);">';
                    
                    // 玩家名称和基本信息
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
                    html += `<div style="font-weight:bold;color:#333;font-size:15px;">${playerId}</div>`;
                    html += `<div style="font-size:11px;color:#666;background:#e9e9e9;padding:3px5px;border-radius:3px;">局: ${stat.games}</div>`;
                    if (isCloudData) {
                        html += `<div style="font-size:10px;color:#4488ff;background:#e6f3ff;padding:2px4px;border-radius:3px;margin-left:4px;">云端</div>`;
                    }
                    html += '</div>';
                    
                    // 第一行：VPIP和PFR主要指标
                    html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
                    html += '<div style="flex:1;text-align:center;padding:5px;background:white;border-radius:4px;margin-right:4px;border:1px solid #e0e0e0;">';
                    html += `<div style="font-size:12px;color:#666;margin-bottom:2px;font-weight:bold;">VPIP</div>`;
                    html += `<div style="font-size:16px;font-weight:bold;color:${vpipColor};margin-bottom:2px;">${vpipPercent}%</div>`;
                    html += '</div>';
                    html += '<div style="flex:1;text-align:center;padding:5px;background:white;border-radius:4px;margin-left:4px;border:1px solid #e0e0e0;">';
                    html += `<div style="font-size:12px;color:#666;margin-bottom:2px;font-weight:bold;">PFR</div>`;
                    html += `<div style="font-size:16px;font-weight:bold;color:${pfrColor};margin-bottom:2px;">${pfrPercent}%</div>`;
                    html += '</div>';
                    html += '</div>';
                    
                    // VPIP和PFR评价行
                    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">';
                    html += `<div style="flex:1;text-align:center;font-size:10px;color:${vpipColor};background:${vpipColor}20;padding:2px4px;border-radius:3px;margin-right:4px;">${vpipType}</div>`;
                    html += `<div style="flex:1;text-align:center;font-size:10px;color:${pfrColor};background:${pfrColor}20;padding:2px4px;border-radius:3px;margin-left:4px;">${pfrType}</div>`;
                    html += '</div>';
                    
                    // 第二行：3BET和F3B指标
                    html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
                    html += '<div style="flex:1;text-align:center;padding:5px;background:white;border-radius:4px;margin-right:4px;border:1px solid #e0e0e0;">';
                    html += `<div style="font-size:12px;color:#666;margin-bottom:2px;font-weight:bold;">3BET</div>`;
                    html += `<div style="font-size:16px;font-weight:bold;color:${threeBetColor};margin-bottom:2px;">${threeBetPercent}%</div>`;
                    html += '</div>';
                    html += '<div style="flex:1;text-align:center;padding:5px;background:white;border-radius:4px;margin-left:4px;border:1px solid #e0e0e0;">';
                    html += `<div style="font-size:12px;color:#666;margin-bottom:2px;font-weight:bold;">F3B</div>`;
                    html += `<div style="font-size:16px;font-weight:bold;color:${foldToThreeBetColor};margin-bottom:2px;">${foldToThreeBetPercent}%</div>`;
                    html += '</div>';
                    html += '</div>';
                    
                    // 3BET和F3B评价行
                    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">';
                    html += `<div style="flex:1;text-align:center;font-size:10px;color:${threeBetColor};background:${threeBetColor}20;padding:2px4px;border-radius:3px;margin-right:4px;">${threeBetType}</div>`;
                    html += `<div style="flex:1;text-align:center;font-size:10px;color:${foldToThreeBetColor};background:${foldToThreeBetColor}20;padding:2px4px;border-radius:3px;margin-left:4px;">${foldToThreeBetType}</div>`;
                    html += '</div>';
                    
                    // 第三行：CB和BF指标
                    html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
                    html += '<div style="flex:1;text-align:center;padding:5px;background:white;border-radius:4px;margin-right:4px;border:1px solid #e0e0e0;">';
                    html += `<div style="font-size:12px;color:#666;margin-bottom:2px;font-weight:bold;">CB</div>`;
                    html += `<div style="font-size:16px;font-weight:bold;color:${continuationBetColor};margin-bottom:2px;">${continuationBetPercent}%</div>`;
                    html += '</div>';
                    html += '<div style="flex:1;text-align:center;padding:5px;background:white;border-radius:4px;margin-left:4px;border:1px solid #e0e0e0;">';
                    html += `<div style="font-size:12px;color:#666;margin-bottom:2px;font-weight:bold;">BF</div>`;
                    html += `<div style="font-size:16px;font-weight:bold;color:${foldToContinuationBetColor};margin-bottom:2px;">${foldToContinuationBetPercent}%</div>`;
                    html += '</div>';
                    html += '</div>';
                    
                    // CB和BF评价行
                    html += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">';
                    html += `<div style="flex:1;text-align:center;font-size:10px;color:${continuationBetColor};background:${continuationBetColor}20;padding:2px4px;border-radius:3px;margin-right:4px;">${continuationBetType}</div>`;
                    html += `<div style="flex:1;text-align:center;font-size:10px;color:${foldToContinuationBetColor};background:${foldToContinuationBetColor}20;padding:2px4px;border-radius:3px;margin-left:4px;">${foldToContinuationBetType}</div>`;
                    html += '</div>';
                    
                    // 详细数据
                    html += '<div style="display:flex;justify-content:space-between;font-size:10px;color:#666;margin-bottom:8px;flex-wrap:wrap;">';
                    html += `<div style="width:33%;">手: <span style="font-weight:bold;color:#333;">${stat.totalHands}</span></div>`;
                    html += `<div style="width:33%;">V: <span style="font-weight:bold;color:#333;">${stat.totalVpip}</span></div>`;
                    html += `<div style="width:33%;">P: <span style="font-weight:bold;color:#333;">${stat.totalPfr}</span></div>`;
                    html += `<div style="width:33%;">3: <span style="font-weight:bold;color:#333;">${stat.totalThreeBet}</span></div>`;
                    html += `<div style="width:33%;">F: <span style="font-weight:bold;color:#333;">${stat.totalFoldToThreeBet}</span></div>`;
                    html += `<div style="width:33%;">C: <span style="font-weight:bold;color:#333;">${stat.totalContinuationBet}</span></div>`;
                    html += '</div>';
                    
                    html += '</div>';
                }
            }
            
            // 底部信息
            html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#999;text-align:center;">';
            html += `<div>玩家: ${sortedPlayers.length} | 游戏: ${Object.keys(gameStats).length}</div>`;
            html += '<div style="margin-top:3px;">VPIP=入池率 | PFR=加注率 | 3BET=三次下注 | F3B=面对三次弃牌</div>';
            html += '<div style="margin-top:3px;">CB=持续下注 | BF=面对下注弃牌</div>';
            if (supabaseClient) {
                html += '<div style="margin-top:3px;color:#4488ff;">📡 支持云端数据同步</div>';
            }
            html += '</div>';

            container.innerHTML = html;
            
            if(DEBUG_MODE) console.log('✅ 统计面板更新完成，显示', sortedPlayers.length, '个玩家');
        } catch (e) {
            console.error('❌ 显示统计错误:', e);
        }
    }

    /* 创建统计容器 */
    function createStatsContainer() {
        const STORAGE_KEY = 'vpip-stats-position-v1';

        // 创建容器
        const div = document.createElement('div');
        div.id = 'vpip-stats';
        div.style.cssText = `
        position: fixed;
        right: 50px;
        bottom: 50px;
        background: white;
        padding: 15px;
        border: 2px solid #333;
        border-radius: 8px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 9999;
        font-family: 'Segoe UI', Arial, sans-serif;
        color: #333;
        cursor: move;
        user-select: none;
        width: 320px;
        max-height: 500px;
        font-size: 14px;
        line-height: 1.4;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        overflow-y: auto;
    `;

    // 读取并应用已保存的位置（如果存在）
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const pos = JSON.parse(saved);
            // 如果保存的是 left/top，则直接使用；否则尝试使用 right/bottom -> 转换为 left/top
            if (typeof pos.left === 'number' && typeof pos.top === 'number') {
                div.style.left = pos.left + 'px';
                div.style.top = pos.top + 'px';
                div.style.right = 'auto';
                div.style.bottom = 'auto';
            } else if (typeof pos.right === 'number' && typeof pos.bottom === 'number') {
                // 将 right/bottom 转换为 left/top（基于当前窗口尺寸）
                const left = window.innerWidth - pos.right - (pos.width || div.offsetWidth);
                const top = window.innerHeight - pos.bottom - (pos.height || div.offsetHeight);
                div.style.left = Math.max(0, left) + 'px';
                div.style.top = Math.max(0, top) + 'px';
                div.style.right = 'auto';
                div.style.bottom = 'auto';
            }
        }
    } catch (e) {
        console.warn('读取 VPIP 面板位置失败:', e);
    }

    // 拖拽实现
    let isDown = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    function onMouseDown(e) {
        // 仅左键
        if (e.button !== 0) return;
        isDown = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = div.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;

        // 切换为 left/top 布局，防止 right/bottom 与 left/top 冲突
        div.style.left = rect.left + 'px';
        div.style.top = rect.top + 'px';
        div.style.right = 'auto';
        div.style.bottom = 'auto';

        // 临时样式优化
        div.style.transition = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!isDown) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // 限制到窗口内（简单约束）
        const rect = div.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - w));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - h));

        div.style.left = newLeft + 'px';
        div.style.top = newTop + 'px';
    }

    function onMouseUp() {
        if (!isDown) return;
        isDown = false;
        div.style.transition = '';

        // 保存位置到 localStorage：存储 left/top 和元素宽高，以及 right/bottom 备用值
        try {
            const rect = div.getBoundingClientRect();
            const saved = {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                // 同时也保存按右下角偏移量，便于未来切换回默认布局
                right: Math.round(window.innerWidth - rect.left - rect.width),
                bottom: Math.round(window.innerHeight - rect.top - rect.height),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        } catch (e) {
            console.warn('保存 VPIP 面板位置失败:', e);
        }

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    // 支持触摸
    function onTouchStart(e) {
        if (!e.touches || e.touches.length !== 1) return;
        const touch = e.touches[0];
        // 模拟鼠标按下
        onMouseDown({ button: 0, clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => e.preventDefault() });
    }
    function onTouchMove(e) {
        if (!e.touches || e.touches.length !== 1) return;
        const touch = e.touches[0];
        onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
    function onTouchEnd() {
        onMouseUp();
    }

    div.addEventListener('mousedown', onMouseDown);
    div.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // 双击可恢复到默认右下角位置并清除保存
    div.addEventListener('dblclick', () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('清除 VPIP 面板位置失败:', e);
        }
        // 恢复样式到默认右下角
        div.style.left = 'auto';
        div.style.top = 'auto';
        div.style.right = '50px';
        div.style.bottom = '50px';
    });

    document.body.appendChild(div);
    return div;
}

    /* 保存数据到本地存储 */
    function savePlayerStats() {
        try {
            GM_setValue('playerStats', JSON.stringify(playerStats));
            GM_setValue('gameStats', JSON.stringify(gameStats));
            if(DEBUG_MODE) console.log('💾 玩家数据已保存，共', Object.keys(playerStats).length, '个玩家');
            if(DEBUG_MODE) console.log('💾 游戏数据已保存，共', Object.keys(gameStats).length, '局游戏');
        } catch (e) {
            console.error('❌ 保存数据时出错:', e);
        }
    }

    // 添加查询玩家数据的函数
    async function queryPlayerById(playerId) {
        if (!supabaseClient) {
            if(DEBUG_MODE) console.warn('Supabase客户端未初始化，无法查询云端数据');
            return playerStats[playerId] || null;
        }

        try {
            // 先查询云端数据
            const cloudData = await supabaseClient.getPlayerStats(playerId);
            if (cloudData) {
                if(DEBUG_MODE) console.log('✅ 从云端获取到玩家数据:', playerId);
                return cloudData;
            }

            // 如果云端没有数据，返回本地数据
            if(DEBUG_MODE) console.log('云端无数据，返回本地数据:', playerId);
            return playerStats[playerId] || null;
        } catch (error) {
            if(DEBUG_MODE) console.error('查询玩家数据失败:', error);
            return playerStats[playerId] || null;
        }
    }

    // 主初始化函数
    function main() {
        // 初始化Supabase客户端
        const supabaseEnabled = initSupabaseClient();
        
        // 启动观察者
        initObserver();
        
        // 定时更新显示
        setInterval(() => showStats(), 2000);
        
        // 定时上传数据到云端
        if (supabaseEnabled && SUPABASE_CONFIG.upload.enabled) {
            setInterval(() => uploadPlayerStatsToCloud(), SUPABASE_CONFIG.upload.interval);
            if(DEBUG_MODE) console.log('📡 启动云端数据同步，间隔:', SUPABASE_CONFIG.upload.interval / 1000, '秒');
        }
        
        // 定期加载在桌玩家的云端数据
        if (supabaseEnabled) {
            setInterval(() => {
                const tablePlayers = Object.keys(table_player).filter(id => table_player[id].intable);
                if (tablePlayers.length > 0) {
                    loadCloudPlayerStats(tablePlayers);
                }
            }, 60000); // 每分钟检查一次云端数据
        }
    }

    // 颜色和类型判断函数（保持原有函数不变）
    function getVpipColor(vpipPercent) {
        if (vpipPercent < 20) return '#ff4444';      // 红色 - 极紧
        if (vpipPercent < 40) return '#ff8800';      // 橙色 - 紧
        if (vpipPercent < 60) return '#ffcc00';      // 黄色 - 正常
        if (vpipPercent < 70) return '#4488ff';      // 蓝色 - 松
        if (vpipPercent < 80) return '#00ccff';      // 青色 - 很松
        return '#44ff44';                            // 绿色 - 极松
    }
    
    function getPlayerType(vpipPercent) {
        if (vpipPercent < 20) return '极紧';
        if (vpipPercent < 40) return '紧';
        if (vpipPercent < 60) return '正常';
        if (vpipPercent < 70) return '松';
        if (vpipPercent < 80) return '很松';
        return '极松';
    }
    
    function getPfrColor(pfrPercent) {
        if (pfrPercent < 10) return '#cc0000';      // 深红 - 极被动
        if (pfrPercent < 15) return '#ff4444';      // 红色 - 被动
        if (pfrPercent < 20) return '#ff8800';      // 橙色 - 较被动
        if (pfrPercent < 25) return '#ffcc00';      // 黄色 - 正常
        if (pfrPercent < 30) return '#66bb00';      // 更深的绿 - 较主动
        if (pfrPercent < 35) return '#339900';      // 深绿 - 主动
        return '#006600';                            // 很深的绿 - 极主动
    }
    
    function getPfrType(pfrPercent) {
        if (pfrPercent < 10) return '极被动';
        if (pfrPercent < 15) return '被动';
        if (pfrPercent < 20) return '较被动';
        if (pfrPercent < 25) return '正常';
        if (pfrPercent < 30) return '较主动';
        if (pfrPercent < 35) return '主动';
        return '极主动';
    }
    
    // 3BET颜色和类型判断函数
    function getThreeBetColor(threeBetPercent) {
        if (threeBetPercent < 5) return '#cc0000';      // 深红 - 极少3bet
        if (threeBetPercent < 10) return '#ff4444';     // 红色 - 很少3bet
        if (threeBetPercent < 15) return '#ff8800';     // 橙色 - 较少3bet
        if (threeBetPercent < 20) return '#ffcc00';     // 黄色 - 正常3bet
        if (threeBetPercent < 25) return '#66bb00';     // 更深的绿 - 较多3bet
        if (threeBetPercent < 30) return '#339900';     // 深绿 - 很多3bet
        return '#006600';                               // 很深的绿 - 极多3bet
    }
    
    function getThreeBetType(threeBetPercent) {
        if (threeBetPercent < 5) return '极少';
        if (threeBetPercent < 10) return '很少';
        if (threeBetPercent < 15) return '较少';
        if (threeBetPercent < 20) return '正常';
        if (threeBetPercent < 25) return '较多';
        if (threeBetPercent < 30) return '很多';
        return '极多';
    }
    
    // F3B颜色和类型判断函数
    function getFoldToThreeBetColor(foldToThreeBetPercent) {
        if (foldToThreeBetPercent < 30) return '#006600';  // 很深的绿 - 很少弃牌
        if (foldToThreeBetPercent < 40) return '#339900';  // 深绿 - 较少弃牌
        if (foldToThreeBetPercent < 50) return '#66bb00';  // 更深的绿 - 正常弃牌
        if (foldToThreeBetPercent < 60) return '#ffcc00';  // 黄色 - 较多弃牌
        if (foldToThreeBetPercent < 70) return '#ff8800';  // 橙色 - 很多弃牌
        if (foldToThreeBetPercent < 80) return '#ff4444';  // 红色 - 极多弃牌
        return '#cc0000';                                  // 深红 - 几乎总是弃牌
    }
    
    function getFoldToThreeBetType(foldToThreeBetPercent) {
        if (foldToThreeBetPercent < 30) return '很少弃牌';
        if (foldToThreeBetPercent < 40) return '较少弃牌';
        if (foldToThreeBetPercent < 50) return '正常弃牌';
        if (foldToThreeBetPercent < 60) return '较多弃牌';
        if (foldToThreeBetPercent < 70) return '很多弃牌';
        if (foldToThreeBetPercent < 80) return '极多弃牌';
        return '总是弃牌';
    }
    
    // CB颜色和类型判断函数
    function getContinuationBetColor(continuationBetPercent) {
        if (continuationBetPercent < 30) return '#cc0000';     // 深红 - 极少CB
        if (continuationBetPercent < 40) return '#ff4444';     // 红色 - 很少CB
        if (continuationBetPercent < 50) return '#ff8800';     // 橙色 - 较少CB
        if (continuationBetPercent < 60) return '#ffcc00';     // 黄色 - 正常CB
        if (continuationBetPercent < 70) return '#66bb00';     // 更深的绿 - 较多CB
        if (continuationBetPercent < 80) return '#339900';     // 深绿 - 很多CB
        return '#006600';                                       // 很深的绿 - 极多CB
    }
    
    function getContinuationBetType(continuationBetPercent) {
        if (continuationBetPercent < 30) return '极少';
        if (continuationBetPercent < 40) return '很少';
        if (continuationBetPercent < 50) return '较少';
        if (continuationBetPercent < 60) return '正常';
        if (continuationBetPercent < 70) return '较多';
        if (continuationBetPercent < 80) return '很多';
        return '极多';
    }
    
    // BF颜色和类型判断函数
    function getFoldToContinuationBetColor(foldToContinuationBetPercent) {
        if (foldToContinuationBetPercent < 30) return '#006600';  // 很深的绿 - 很少弃牌
        if (foldToContinuationBetPercent < 40) return '#339900';  // 深绿 - 较少弃牌
        if (foldToContinuationBetPercent < 50) return '#66bb00';  // 更深的绿 - 正常弃牌
        if (foldToContinuationBetPercent < 60) return '#ffcc00';  // 黄色 - 较多弃牌
        if (foldToContinuationBetPercent < 70) return '#ff8800';  // 橙色 - 很多弃牌
        if (foldToContinuationBetPercent < 80) return '#ff4444';  // 红色 - 极多弃牌
        return '#cc0000';                                          // 深红 - 几乎总是弃牌
    }
    
    function getFoldToContinuationBetType(foldToContinuationBetPercent) {
        if (foldToContinuationBetPercent < 30) return '很少弃牌';
        if (foldToContinuationBetPercent < 40) return '较少弃牌';
        if (foldToContinuationBetPercent < 50) return '正常弃牌';
        if (foldToContinuationBetPercent < 60) return '较多弃牌';
        if (foldToContinuationBetPercent < 70) return '很多弃牌';
        if (foldToContinuationBetPercent < 80) return '极多弃牌';
        return '总是弃牌';
    }

    // 清理全部缓存
    function clearAllStorage() {
        const keys = GM_listValues();
        keys.forEach(key => GM_deleteValue(key));
    }

    // 延迟启动确保日志容器存在
    window.addEventListener('load', () => {
        setTimeout(main, 3000); // 根据实际页面加载速度调整
    });

    // 将查询函数暴露到全局作用域，方便调试和外部调用
    window.queryPlayerById = queryPlayerById;
    window.uploadPlayerStatsToCloud = uploadPlayerStatsToCloud;
    window.loadCloudPlayerStats = loadCloudPlayerStats;
})();
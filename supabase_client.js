// Supabase客户端工具类
// 用于处理与Supabase数据库的交互

class SupabaseClient {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.url;
        this.apiKey = config.anonKey;
        this.cache = new Map();
        this.pendingUploads = new Map();
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

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, message: ${await response.text()}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Supabase请求错误:', error);
            throw error;
        }
    }

    // 带重试的请求方法
    async requestWithRetry(endpoint, options = {}, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await this.request(endpoint, options);
            } catch (error) {
                lastError = error;
                console.warn(`请求失败，重试 ${i + 1}/${maxRetries}:`, error.message);
                
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                }
            }
        }
        
        throw lastError;
    }

    // 查询玩家统计数据
    async getPlayerStats(playerId) {
        const cacheKey = `player_${playerId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.config.query.cacheTime) {
            return cached.data;
        }

        try {
            const data = await this.requestWithRetry(
                `${this.config.tables.playerStatsView}?player_id=eq.${playerId}`,
                { method: 'GET' },
                3,
                1000
            );

            const result = data.length > 0 ? data[0] : null;
            
            // 缓存结果
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            console.error('获取玩家统计数据失败:', error);
            return null;
        }
    }

    // 批量查询玩家统计数据
    async getMultiplePlayerStats(playerIds) {
        if (playerIds.length === 0) return [];

        try {
            const idParams = playerIds.map(id => `player_id=eq.${id}`).join('&');
            const data = await this.requestWithRetry(
                `${this.config.tables.playerStatsView}?${idParams}`,
                { method: 'GET' },
                3,
                1000
            );

            // 缓存结果
            data.forEach(player => {
                const cacheKey = `player_${player.player_id}`;
                this.cache.set(cacheKey, {
                    data: player,
                    timestamp: Date.now()
                });
            });

            return data;
        } catch (error) {
            console.error('批量获取玩家统计数据失败:', error);
            return [];
        }
    }

    // 上传或更新玩家统计数据
    async upsertPlayerStats(playerData) {
        try {
            const response = await this.requestWithRetry(
                `rpc/upsert_player_stats`,
                {
                    method: 'POST',
                    body: JSON.stringify(playerData)
                },
                this.config.upload.maxRetries,
                this.config.upload.retryDelay
            );

            // 清除缓存
            const cacheKey = `player_${playerData.p_player_id}`;
            this.cache.delete(cacheKey);

            return response;
        } catch (error) {
            console.error('上传玩家统计数据失败:', error);
            throw error;
        }
    }

    // 批量上传玩家统计数据
    async batchUpsertPlayerStats(playersData) {
        const results = [];
        const batchSize = this.config.upload.batchSize;

        for (let i = 0; i < playersData.length; i += batchSize) {
            const batch = playersData.slice(i, i + batchSize);
            const batchPromises = batch.map(playerData => 
                this.upsertPlayerStats(playerData).catch(error => {
                    console.error(`批量上传失败 - 玩家 ${playerData.p_player_id}:`, error);
                    return { error, playerId: playerData.p_player_id };
                })
            );

            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            } catch (error) {
                console.error('批量上传批次失败:', error);
                results.push({ error, batch: batch.map(p => p.p_player_id) });
            }
        }

        return results;
    }

    // 记录游戏数据
    async recordGame(gameData) {
        try {
            const response = await this.requestWithRetry(
                this.config.tables.games,
                {
                    method: 'POST',
                    body: JSON.stringify(gameData)
                },
                this.config.upload.maxRetries,
                this.config.upload.retryDelay
            );

            return response;
        } catch (error) {
            console.error('记录游戏数据失败:', error);
            throw error;
        }
    }

    // 记录游戏玩家数据
    async recordGamePlayers(gamePlayersData) {
        try {
            const response = await this.requestWithRetry(
                this.config.tables.gamePlayers,
                {
                    method: 'POST',
                    body: JSON.stringify(gamePlayersData)
                },
                this.config.upload.maxRetries,
                this.config.upload.retryDelay
            );

            return response;
        } catch (error) {
            console.error('记录游戏玩家数据失败:', error);
            throw error;
        }
    }

    // 添加到待上传队列
    addToUploadQueue(type, data) {
        const queueKey = `queue_${type}`;
        if (!this.pendingUploads.has(queueKey)) {
            this.pendingUploads.set(queueKey, []);
        }
        
        this.pendingUploads.get(queueKey).push({
            data,
            timestamp: Date.now()
        });
    }

    // 处理待上传队列
    async processUploadQueue() {
        const results = [];

        for (const [queueKey, items] of this.pendingUploads.entries()) {
            if (items.length === 0) continue;

            const type = queueKey.replace('queue_', '');
            
            try {
                let result;
                switch (type) {
                    case 'playerStats':
                        const playerData = items.map(item => item.data);
                        result = await this.batchUpsertPlayerStats(playerData);
                        break;
                    case 'games':
                        // 游戏数据通常单个上传
                        for (const item of items) {
                            await this.recordGame(item.data);
                        }
                        result = { success: true, count: items.length };
                        break;
                    case 'gamePlayers':
                        // 游戏玩家数据可以批量上传
                        const gamePlayersData = items.map(item => item.data);
                        for (const data of gamePlayersData) {
                            await this.recordGamePlayers(data);
                        }
                        result = { success: true, count: items.length };
                        break;
                    default:
                        console.warn('未知的上传类型:', type);
                        continue;
                }

                results.push({ type, result, count: items.length });
                
                // 清空已处理的队列
                this.pendingUploads.set(queueKey, []);
                
            } catch (error) {
                console.error(`处理上传队列失败 - ${type}:`, error);
                results.push({ type, error, count: items.length });
            }
        }

        return results;
    }

    // 清除缓存
    clearCache(playerId = null) {
        if (playerId) {
            this.cache.delete(`player_${playerId}`);
        } else {
            this.cache.clear();
        }
    }

    // 获取缓存统计
    getCacheStats() {
        return {
            size: this.cache.size,
            pendingUploads: Array.from(this.pendingUploads.entries()).map(([key, items]) => ({
                type: key.replace('queue_', ''),
                count: items.length
            }))
        };
    }
}

// 导出客户端类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseClient;
} else if (typeof window !== 'undefined') {
    window.SupabaseClient = SupabaseClient;
}
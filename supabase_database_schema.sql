-- 德州扑克玩家统计数据表
CREATE TABLE poker_player_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id VARCHAR(255) NOT NULL,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id)
);

-- 游戏记录表
CREATE TABLE poker_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL UNIQUE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 游戏时长（毫秒）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 游戏玩家关联表
CREATE TABLE poker_game_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL REFERENCES poker_games(game_id),
    player_id VARCHAR(255) NOT NULL,
    hands INTEGER DEFAULT 0,
    vpip INTEGER DEFAULT 0,
    pfr INTEGER DEFAULT 0,
    three_bet INTEGER DEFAULT 0,
    fold_to_three_bet INTEGER DEFAULT 0,
    continuation_bet INTEGER DEFAULT 0,
    fold_to_continuation_bet INTEGER DEFAULT 0,
    check_fold INTEGER DEFAULT 0,
    raise_fold INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_poker_player_stats_player_id ON poker_player_stats(player_id);
CREATE INDEX idx_poker_games_game_id ON poker_games(game_id);
CREATE INDEX idx_poker_game_players_game_id ON poker_game_players(game_id);
CREATE INDEX idx_poker_game_players_player_id ON poker_game_players(player_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_poker_player_stats_updated_at 
    BEFORE UPDATE ON poker_player_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全性 (RLS)
ALTER TABLE poker_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_game_players ENABLE ROW LEVEL SECURITY;

-- 创建策略允许所有操作（生产环境中应该更严格）
CREATE POLICY "Enable all operations on poker_player_stats" ON poker_player_stats
    FOR ALL USING (true);

CREATE POLICY "Enable all operations on poker_games" ON poker_games
    FOR ALL USING (true);

CREATE POLICY "Enable all operations on poker_game_players" ON poker_game_players
    FOR ALL USING (true);

-- 创建用于查询玩家统计的视图
CREATE VIEW player_stats_view AS
SELECT 
    player_id,
    total_hands,
    total_vpip,
    total_pfr,
    total_three_bet,
    total_fold_to_three_bet,
    total_continuation_bet,
    total_fold_to_continuation_bet,
    total_check_fold,
    total_raise_fold,
    games,
    CASE 
        WHEN total_hands > 0 THEN ROUND((total_vpip::DECIMAL / total_hands::DECIMAL) * 100, 1)
        ELSE 0 
    END as vpip_percentage,
    CASE 
        WHEN total_hands > 0 THEN ROUND((total_pfr::DECIMAL / total_hands::DECIMAL) * 100, 1)
        ELSE 0 
    END as pfr_percentage,
    CASE 
        WHEN total_pfr > 0 THEN ROUND((total_three_bet::DECIMAL / total_pfr::DECIMAL) * 100, 1)
        ELSE 0 
    END as three_bet_percentage,
    CASE 
        WHEN (total_three_bet + total_fold_to_three_bet) > 0 THEN ROUND((total_fold_to_three_bet::DECIMAL / (total_three_bet + total_fold_to_three_bet)::DECIMAL) * 100, 1)
        ELSE 0 
    END as fold_to_three_bet_percentage,
    CASE 
        WHEN total_pfr > 0 THEN ROUND((total_continuation_bet::DECIMAL / total_pfr::DECIMAL) * 100, 1)
        ELSE 0 
    END as continuation_bet_percentage,
    CASE 
        WHEN (total_continuation_bet + total_fold_to_continuation_bet) > 0 THEN ROUND((total_fold_to_continuation_bet::DECIMAL / (total_continuation_bet + total_fold_to_continuation_bet)::DECIMAL) * 100, 1)
        ELSE 0 
    END as fold_to_continuation_bet_percentage,
    updated_at
FROM poker_player_stats;

-- 创建用于更新或插入玩家统计的函数
CREATE OR REPLACE FUNCTION upsert_player_stats(
    p_player_id VARCHAR(255),
    p_total_hands INTEGER DEFAULT 0,
    p_total_vpip INTEGER DEFAULT 0,
    p_total_pfr INTEGER DEFAULT 0,
    p_total_three_bet INTEGER DEFAULT 0,
    p_total_fold_to_three_bet INTEGER DEFAULT 0,
    p_total_continuation_bet INTEGER DEFAULT 0,
    p_total_fold_to_continuation_bet INTEGER DEFAULT 0,
    p_total_check_fold INTEGER DEFAULT 0,
    p_total_raise_fold INTEGER DEFAULT 0,
    p_games INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO poker_player_stats (
        player_id, total_hands, total_vpip, total_pfr, total_three_bet,
        total_fold_to_three_bet, total_continuation_bet, total_fold_to_continuation_bet,
        total_check_fold, total_raise_fold, games
    ) VALUES (
        p_player_id, p_total_hands, p_total_vpip, p_total_pfr, p_total_three_bet,
        p_total_fold_to_three_bet, p_total_continuation_bet, p_total_fold_to_continuation_bet,
        p_total_check_fold, p_total_raise_fold, p_games
    )
    ON CONFLICT (player_id) DO UPDATE SET
        total_hands = EXCLUDED.total_hands,
        total_vpip = EXCLUDED.total_vpip,
        total_pfr = EXCLUDED.total_pfr,
        total_three_bet = EXCLUDED.total_three_bet,
        total_fold_to_three_bet = EXCLUDED.total_fold_to_three_bet,
        total_continuation_bet = EXCLUDED.total_continuation_bet,
        total_fold_to_continuation_bet = EXCLUDED.total_fold_to_continuation_bet,
        total_check_fold = EXCLUDED.total_check_fold,
        total_raise_fold = EXCLUDED.total_raise_fold,
        games = EXCLUDED.games,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
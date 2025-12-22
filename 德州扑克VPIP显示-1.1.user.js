// ==UserScript==
// @name         德州扑克VPIP显示
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  根据游戏日志计算玩家VPIP(主动入池率)
// @author       shaowu[2691980]
// @match        https://www.torn.com/page.php?sid=holdem*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// ==/UserScript==
/* 数据会显示到网页右上角，手机显示估计暂不支持，后续会开发适配手机， */
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
let currentTime = 123;
(function() {
    'use strict';
    /* 清空缓存用，一般情况请勿放开 */
    //clearAllStorage();
    /* 调试标志 - 设为true时输出详细日志 */
    const DEBUG_MODE = true;

    /* 存储玩家数据 */
    let playerStats = {};
    let processed_ids = [];
    let table_player = {intable:false};
    console.log(Array.isArray(processed_ids)); // 验证是否为真数组
    // 从本地存储加载playerStats
    try {
        const storedPlayerStats = GM_getValue('playerStats');
        if (storedPlayerStats) {
            playerStats = JSON.parse(storedPlayerStats);
        }
    } catch (e) {
        console.error('加载持久化数据时出错:', e);
    }

    /* 核心日志解析函数 */
    function parseGameLog(div) {
        try {

            const playerElem = div.querySelector('em');
            const actionElem = div.querySelector('span');

            if (!playerElem || !actionElem) {
                if(DEBUG_MODE) console.warn('缺少必要元素:', div);
                return;
            }

            const playerId = playerElem.textContent.trim();
            const action = actionElem.textContent.trim();

            //                if(DEBUG_MODE) console.log('处理玩家:', playerId, '行为:', action);
            if(/^left/i.test(action))
            {
                /* left the table */
                table_player[playerId] = {intable:false};
                console.log("%s left the table ",playerId);
                console.log(table_player[playerId]);
            }
            if(/^joined/i.test(action))
            {
                /* join  the table */
                return;

            }
            if(playerId == "The preflop")
            {
                currentTime = 1;

                return;

            }
            if(/^post/i.test(action))
            {

                return;

            }
            if(playerId == "The flop:" || /^won/i.test(action))
            {
                currentTime = 0;
                processed_ids = [];
                // 在一轮游戏结束时，将playerStats持久化存储
                savePlayerStats();
                console.log("清0");
                console.log(processed_ids);
                return;
                /* 出翻牌了,或者翻牌前直接胜利 */
            }
            if( currentTime === 1){
                /* 初始化玩家记录 */
                playerStats[playerId] = playerStats[playerId] || {hands: 0, vpip: 0};
                if(processed_ids.includes(playerId))
                {
                    console.log("%s 该玩家本局被记录过了",playerId);
                    return;
                }
                processed_ids.push(playerId); // 添加元素
                table_player[playerId] = {intable:true};

                /* 更新统计 */
                playerStats[playerId].hands++;
                if (/^called/i.test(action) || /^raised/i.test(action)||/^checked/i.test(action)||/^allin/i.test(action)) {
                    playerStats[playerId].vpip++;
                }
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

            const container = document.getElementById('vpip-stats') || createStatsContainer();

            let html = '<h3>VPIP统计</h3><table>';
            html += '<tr><th>玩家</th><th>手数</th><th>VPIP</th></tr>';
            for (const id in playerStats) {
                const stat = playerStats[id];
                if(table_player[id] && (table_player[id].intable))
                {
                    const percent = stat.hands > 0
                    ? (stat.vpip / stat.hands * 100).toFixed(1)
                    : "0.0";
                    const color = getVpipColor(percent);
                    html += `<tr>
                    <td>${id} &nbsp;&nbsp;</td>
                    <td>${stat.hands} </td>
                    <td style="color:${color}">${percent}%</td>
                </tr>`;
                }
            }

            container.innerHTML = html + '</table>';
        } catch (e) {
            console.error('显示统计错误:', e);
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
        padding: 10px;
        border: 1px solid #333;
        border-radius: 4px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        font-family: Arial, sans-serif;
        color: #111;
        cursor: move;
        user-select: none;
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
    /* 保存playerStats到本地存储 */
    function savePlayerStats() {
        try {
            GM_setValue('playerStats', JSON.stringify(playerStats));
        } catch (e) {
            console.error('保存playerStats时出错:', e);
        }
    }
    /* 主初始化函数 */
    function main() {
        initObserver();
        setInterval(() => showStats(), 2000); // 保留定时更新显示
    }
    // 延迟启动确保日志容器存在

    function getVpipColor(vpipPercent) {
        if (vpipPercent < 20) return 'red';
        if (vpipPercent < 40) return 'orange';
        if (vpipPercent < 60) return 'buff';
        if (vpipPercent < 70) return 'blue';
        if (vpipPercent < 80) return 'cyan';
        return 'green';
    }


    // 清理全部缓存
    function clearAllStorage() {
        const keys = GM_listValues();
        keys.forEach(key => GM_deleteValue(key));
    }

    window.addEventListener('load', () => {
        setTimeout(main, 3000); // 根据实际页面加载速度调整
    });
})();

// ==UserScript==
// @name         Tornw3b自动高亮并提醒低价商品
// @namespace    https://github.com/pakeh2866
// @version      0.6
// @description  w3b中低于某个价格，利润在x%以上的高亮显示,并提醒
// @author       pakeh[3973672]  如果对你有那么一点点帮助，可以send我一个Xan
// @match        https://weav3r.dev/favorites
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @lincense     MIT
// ==/UserScript==

/*
 * ==================== 更新日志 ====================
 *
 * 版本 0.5 (2026-01-01)
 * - 修复：优化了商品卡片持续高亮的BUG。
 * - 新增：按利润排序和通知、按利润率排序和通知的功能。
 * - 优化：增加了巴扎高亮增加数量。
 *
 * 版本 0.6 (2026-01-01)
 * - 新增：在获取ID的超链接时，在超链接后面增加&itemId=linkid&highlight=1#/参数。
 *
 * ==================== 使用方法 ====================
 *
 * 1. 安装脚本后访问 https://weav3r.dev/favorites
 * 2. 点击页面右上角的 ⚙️ 按钮打开设置面板
 * 3. 根据需要配置最小利润、利润率和特定品种参数
 * 4. 设置好后保持网页不关闭（可以最小化），脚本会自动监控并提醒
 * 5. 当发现符合条件的商品时，会收到通知并可以点击进入bazarr扫货
 *
 * ==================== 技术支持 ====================
 *
 * 如有问题或建议，请联系：pakeh[3973672]
 * 如果对你有那么一点点帮助，可以send我一个Xan
 *
 */

(function() {
    'use strict';

    // 主函数A - 用于 https://weav3r.dev/favorites
    function mainFunctionA() {
        // 存储上一次的数据状态，用于检测重复
        let previousDataState = null;
        
        // 创建音频对象用于播放提示音
        function createNotificationSound() {
            try {
                // 创建一个简单的提示音，使用Web Audio API
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                function playBeep(frequency = 800, duration = 200, volume = 0.3) {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = frequency;
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration / 1000);
                }
                
                return {
                    play: function() {
                        try {
                            // 播放三声提示音，频率逐渐升高
                            playBeep(600, 150, 0.3);
                            setTimeout(() => playBeep(800, 150, 0.3), 200);
                            setTimeout(() => playBeep(1000, 200, 0.3), 400);
                        } catch (error) {
                            console.error('播放提示音时出错:', error);
                        }
                    }
                };
            } catch (error) {
                console.error('创建音频上下文时出错:', error);
                // 返回一个空的播放函数作为后备
                return {
                    play: function() {
                        console.log('音频不可用，跳过提示音播放');
                    }
                };
            }
        }
        
        // 创建全局音频对象
        const notificationSound = createNotificationSound();

        // 从本地存储加载配置
        function loadConfig() {
            try {
                const savedConfig = localStorage.getItem('w3b_torn_config');
                if (savedConfig) {
                    const parsed = JSON.parse(savedConfig);
                    return {
                        minProfit: parsed.minProfit || 5000,
                        minProfitRate: parsed.minProfitRate || 4,
                        specificItems: parsed.specificItems || 'Xanax,3,810000',
                        // 条件选项：0=关闭，1=必须满足，2=只要满足就提醒
                        minProfitOption: parsed.minProfitOption || 2,
                        minProfitRateOption: parsed.minProfitRateOption || 2,
                        // 特定品种选项：0=关闭，1=启用（简化版）
                        specificItemsOption: parsed.specificItemsOption !== undefined ? parsed.specificItemsOption : 0,
                        highlightColor: '#ffeb3b',
                        lightHighlightColor: '#fff9c4',
                        profitColor: '#4caf50',
                        lossColor: '#f44336',
                        enableSound: parsed.enableSound !== undefined ? parsed.enableSound : true,  // 新增：是否启用提示音
                        blacklistIds: parsed.blacklistIds || '',  // 新增：黑名单ID列表
                        // 排序和通知选项：0=按利润排序和通知，1=按利润率排序和通知
                        sortByOption: parsed.sortByOption !== undefined ? parsed.sortByOption : 0  // 新增：排序和通知选项
                    };
                }
            } catch (error) {
                console.error('加载配置时出错:', error);
            }
            
            // 默认配置
            return {
                minProfit: 5000,
                minProfitRate: 4,
                specificItems: 'Xanax,3,810000;Panda Plushie,3,58000',
                // 条件选项：0=关闭，1=必须满足，2=只要满足就提醒
                minProfitOption: 2,
                minProfitRateOption: 2,
                // 特定品种选项：0=关闭，1=启用（简化版）
                specificItemsOption: 0,
                highlightColor: '#ffeb3b',
                lightHighlightColor: '#fff9c4',
                profitColor: '#4caf50',
                lossColor: '#f44336',
                enableSound: true,  // 新增：是否启用提示音
                blacklistIds: '',  // 新增：黑名单ID列表
                // 排序和通知选项：0=按利润排序和通知，1=按利润率排序和通知
                sortByOption: 0  // 新增：排序和通知选项
            };
        }

        // 保存配置到本地存储
        function saveConfig() {
            try {
                const configToSave = {
                    minProfit: CONFIG.minProfit,
                    minProfitRate: CONFIG.minProfitRate,
                    specificItems: CONFIG.specificItems,
                    minProfitOption: CONFIG.minProfitOption,
                    minProfitRateOption: CONFIG.minProfitRateOption,
                    specificItemsOption: CONFIG.specificItemsOption,
                    enableSound: CONFIG.enableSound,  // 新增：保存提示音设置
                    blacklistIds: CONFIG.blacklistIds,  // 新增：保存黑名单ID列表
                    sortByOption: CONFIG.sortByOption  // 新增：保存排序和通知选项
                };
                localStorage.setItem('w3b_torn_config', JSON.stringify(configToSave));
            } catch (error) {
                console.error('保存配置时出错:', error);
            }
        }

        // 全局样式配置
        const CONFIG = loadConfig();

        // 创建设置按钮元素
        function createSettingButton() {
            // 创建一个齿轮图标的设置按钮，用于打开参数配置面板
            const settingButton = document.createElement('button');
            settingButton.innerHTML = '⚙️';
            
            // 设置按钮样式，使用与目标按钮相似的class
            settingButton.className = 'p-2 rounded-md transition-colors relative';
            
            // 添加额外的样式
            settingButton.style.marginRight = '5px';
            settingButton.style.cursor = 'pointer';
            settingButton.style.minWidth = '40px';
            settingButton.style.fontSize = '16px';
            
            // 设置按钮的点击事件
            settingButton.addEventListener('click', function() {
                showSettingsPanel();
            });
            
            return settingButton;
        }
        
        // 显示设置面板
        function showSettingsPanel() {
            // 显示一个模态设置面板，允许用户配置最小利润和最大价格参数
            const existingPanel = document.getElementById('settings-panel');
            if (existingPanel) {
                existingPanel.remove();
                return;
            }

            const panel = document.createElement('div');
            panel.id = 'settings-panel';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #333;
                border-radius: 12px;
                padding: 20px;
                z-index: 10001;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
                min-width: 400px;
                max-width: 500px;
                max-height: 80vh;
                overflow-y: auto;
            `;

            panel.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333;">设置参数</h3>
                
                <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="margin: 0 0 10px 0; color: #666; font-size: 14px;">条件选项说明</h4>
                    <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">
                        <strong>最小利润/利润率条件选项：</strong><br>
                        <strong>关闭</strong>：不使用此条件<br>
                        <strong>必须满足</strong>：必须满足此条件才会提醒<br>
                        <strong>只要满足就提醒</strong>：满足此条件即可提醒<br><br>
                        <strong>特定品种条件选项：</strong><br>
                        <strong>关闭</strong>：不使用特定品种条件<br>
                        <strong>启用</strong>：特定品种中的商品需先满足特定品种条件，其他商品直接判断其他条件
                    </p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">最小利润: $</label>
                    <input type="number" id="minProfit" value="${CONFIG.minProfit}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <div style="margin-top: 5px;">
                        <select id="minProfitOption" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="0" ${CONFIG.minProfitOption === 0 ? 'selected' : ''}>关闭</option>
                            <option value="1" ${CONFIG.minProfitOption === 1 ? 'selected' : ''}>必须满足</option>
                            <option value="2" ${CONFIG.minProfitOption === 2 ? 'selected' : ''}>只要满足就提醒</option>
                        </select>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">最小利润率: %</label>
                    <input type="number" id="minProfitRate" value="${CONFIG.minProfitRate}" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <div style="margin-top: 5px;">
                        <select id="minProfitRateOption" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="0" ${CONFIG.minProfitRateOption === 0 ? 'selected' : ''}>关闭</option>
                            <option value="1" ${CONFIG.minProfitRateOption === 1 ? 'selected' : ''}>必须满足</option>
                            <option value="2" ${CONFIG.minProfitRateOption === 2 ? 'selected' : ''}>只要满足就提醒</option>
                        </select>
                    </div>
                    <small style="color: #666; font-size: 12px;">当利润率大于此值时进行提醒</small>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">特定品种提醒</label>
                    <textarea id="specificItems" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; min-height: 60px;">${CONFIG.specificItems}</textarea>
                    <div style="margin-top: 5px;">
                        <select id="specificItemsOption" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="0" ${CONFIG.specificItemsOption === 0 ? 'selected' : ''}>关闭</option>
                            <option value="1" ${CONFIG.specificItemsOption === 1 ? 'selected' : ''}>启用</option>
                        </select>
                    </div>
                    <small style="color: #666; font-size: 12px;">格式：物品1,数量,价格;物品2,数量,价格 例如：Xanax,3,810000;Panda Plushie,3,58000</small>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #ff6b6b; line-height: 1.4;">
                        <strong>注意</strong>：启用后，特定品种中的商品需先满足特定品种条件，其他商品直接判断其他条件
                    </p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">黑名单ID</label>
                    <input type="text" id="blacklistIds" value="${CONFIG.blacklistIds}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <small style="color: #666; font-size: 12px;">格式：用逗号分隔的ID列表，例如：xingchen,pakeh</small>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #ff6b6b; line-height: 1.4;">
                        <strong>注意</strong>：如果商品ID在黑名单中，该商品将被忽略并以橙红色高亮显示
                    </p>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">排序和通知方式</label>
                    <div style="margin-top: 5px;">
                        <select id="sortByOption" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="0" ${CONFIG.sortByOption === 0 ? 'selected' : ''}>按利润排序和通知</option>
                            <option value="1" ${CONFIG.sortByOption === 1 ? 'selected' : ''}>按利润率排序和通知</option>
                        </select>
                    </div>
                    <small style="color: #666; font-size: 12px;">选择排序和通知的方式：按利润最高或按利润率最高</small>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center; margin-bottom: 5px; font-weight: bold;">
                        <input type="checkbox" id="enableSound" ${CONFIG.enableSound ? 'checked' : ''} style="margin-right: 8px;">
                        启用提示音
                    </label>
                    <small style="color: #666; font-size: 12px;">在发现符合条件的商品时播放提示音</small>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancelBtn" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">取消</button>
                    <button id="saveBtn" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">保存</button>
                </div>
            `;

            document.body.appendChild(panel);

            // 使用事件监听器替代内联onclick
            document.getElementById('cancelBtn').addEventListener('click', function() {
                panel.remove();
            });

            document.getElementById('saveBtn').addEventListener('click', function() {
                CONFIG.minProfit = parseFloat(document.getElementById('minProfit').value);
                CONFIG.minProfitRate = parseFloat(document.getElementById('minProfitRate').value) || 0;
                CONFIG.specificItems = document.getElementById('specificItems').value.trim();
                CONFIG.minProfitOption = parseInt(document.getElementById('minProfitOption').value);
                CONFIG.minProfitRateOption = parseInt(document.getElementById('minProfitRateOption').value);
                CONFIG.specificItemsOption = parseInt(document.getElementById('specificItemsOption').value);
                CONFIG.enableSound = document.getElementById('enableSound').checked;  // 新增：保存提示音设置
                CONFIG.blacklistIds = document.getElementById('blacklistIds').value.trim();  // 新增：保存黑名单ID列表
                CONFIG.sortByOption = parseInt(document.getElementById('sortByOption').value);  // 新增：保存排序和通知选项
                
                // 保存配置到本地存储
                saveConfig();
                
                panel.remove();
                extractItemData(); // 重新提取并高亮数据
            });
        }
        
        // 插入设置按钮到目标位置
        function insertSettingButton() {
            // 将设置按钮插入到页面指定位置，如果找不到目标位置则固定在右上角
            const targetButtons = document.querySelectorAll('.p-2.rounded-md.transition-colors.relative');
            
            if (targetButtons.length > 0) {
                const targetButton = targetButtons[0];
                
                const existingSettingButton = targetButton.parentNode.querySelector('[data-setting-button]');
                if (existingSettingButton) {
                    return;
                }
                
                const settingButton = createSettingButton();
                settingButton.setAttribute('data-setting-button', 'true');
                
                targetButton.parentNode.insertBefore(settingButton, targetButton);
            } else {
                const existingFixedButton = document.querySelector('[data-setting-button-fixed]');
                if (existingFixedButton) {
                    return;
                }
                
                const settingButton = createSettingButton();
                settingButton.setAttribute('data-setting-button-fixed', 'true');
                settingButton.style.position = 'fixed';
                settingButton.style.top = '10px';
                settingButton.style.right = '10px';
                settingButton.style.zIndex = '9999';
                
                document.body.appendChild(settingButton);
            }
        }
        
        // 页面加载完成后执行
        window.addEventListener('load', function() {
            // 页面完全加载后初始化设置按钮
            console.log('页面加载完成，准备插入设置按钮');
            insertSettingButton();
        });
        
        // 使用MutationObserver监听DOM变化
        const observer = new MutationObserver(function(mutations) {
            // 监听页面DOM变化，确保动态加载的内容也能被处理
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    setTimeout(insertSettingButton, 100);
                    // 防抖处理：避免频繁调用extractItemData导致表格抖动
                    clearTimeout(window.extractDataTimeout);
                    window.extractDataTimeout = setTimeout(extractItemData, 500);
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        if (document.readyState === 'loading') {
            // 检查DOM加载状态，确保在合适的时机执行初始化
            document.addEventListener('DOMContentLoaded', insertSettingButton);
        } else {
            insertSettingButton();
        }
        
        // 格式化数字
        function formatNumber(num) {
            // 将数字格式化为带千位分隔符的字符串，便于阅读
            if (!num || num === 'N/A') return 'N/A';
            return parseFloat(num.replace(/,/g, '')).toLocaleString();
        }

        // 计算利润率
        function calculateProfitRate(mrkt, price) {
            // 根据市场价格和价格计算利润率百分比：(mrkt - 价格) / mrkt * 100
            if (!mrkt || !price || mrkt === 'N/A' || price === 'N/A') return 0;
            const m = parseFloat(mrkt.replace(/,/g, ''));
            const p = parseFloat(price.replace(/,/g, ''));
            if (m === 0) return 0; // 避免除零错误
            return ((m - p) / m * 100).toFixed(1);
        }

        // 解析特定品种参数
        function parseSpecificItems(specificItemsStr) {
            if (!specificItemsStr || specificItemsStr.trim() === '') return [];
            
            try {
                // 移除方括号并按分号分割
                const content = specificItemsStr.replace(/^\[|\]$/g, '');
                const items = content.split(';');
                
                const result = [];
                items.forEach(item => {
                    const parts = item.split(',');
                    if (parts.length === 3) {
                        const name = parts[0].trim();
                        const quantity = parseInt(parts[1].trim());
                        const price = parseFloat(parts[2].trim());
                        if (name && !isNaN(quantity) && !isNaN(price)) {
                            result.push({ name, quantity, price });
                        }
                    }
                });
                
                return result;
            } catch (error) {
                console.error('解析特定品种参数时出错:', error);
                return [];
            }
        }

        // 检查ID是否在黑名单中
        function isIdInBlacklist(id) {
            if (!CONFIG.blacklistIds || CONFIG.blacklistIds.trim() === '') {
                return false;
            }
            
            const blacklistArray = CONFIG.blacklistIds.split(',').map(item => item.trim().toLowerCase());
            return blacklistArray.includes(id.toLowerCase());
        }

        // 判断是否应该高亮显示，并返回满足的条件类型
        function shouldHighlight(price, profit, profitRate, itemName, itemId, quantity) {
            // 根据配置的最小利润、利润率和特定品种判断商品是否符合高亮条件
            if (!price || !profit || price === 'N/A' || profit === 'N/A') return { highlight: false, reasons: [] };
            
            // 检查ID是否在黑名单中
            if (itemId && isIdInBlacklist(itemId)) {
                return {
                    highlight: true,
                    reasons: ['黑名单'],
                    isBlacklisted: true
                };
            }
            
            const pr = parseFloat(profit.replace(/,/g, ''));
            const prRate = parseFloat(profitRate) || 0;
            
            // 检查特定品种条件是否启用
            const specificItemsEnabled = CONFIG.specificItemsOption === 1;
            
            // 检查是否是特定品种中的商品
            let isSpecificItem = false;
            let specificItemConditionMet = false;
            
            if (specificItemsEnabled && CONFIG.specificItems && itemName && itemName !== 'N/A') {
                const specificItemsList = parseSpecificItems(CONFIG.specificItems);
                
                for (const item of specificItemsList) {
                    if (itemName.toLowerCase().includes(item.name.toLowerCase())) {
                        isSpecificItem = true;
                        const itemPrice = parseFloat(price.replace(/,/g, ''));
                        // 使用传入的数量参数
                        const currentQuantity = quantity ? parseFloat(quantity.replace(/,/g, '')) : 0;
                        
                        // 同时判断价格和数量条件（且关系）
                        if (!isNaN(itemPrice) && !isNaN(currentQuantity) &&
                            itemPrice <= item.price && currentQuantity >= item.quantity) {
                            specificItemConditionMet = true;
                        }
                        break;
                    }
                }
            }
            
            // 如果是特定品种中的商品但未满足特定品种条件，不高亮
            if (isSpecificItem && !specificItemConditionMet) {
                return { highlight: false, reasons: [] };
            }
            
            // 特定品种条件未启用，判断其他条件
            const conditions = {
                minProfit: {
                    enabled: CONFIG.minProfitOption !== 0,
                    required: CONFIG.minProfitOption === 1,
                    satisfied: pr >= CONFIG.minProfit,
                    name: '最小利润'
                },
                minProfitRate: {
                    enabled: CONFIG.minProfitRateOption !== 0,
                    required: CONFIG.minProfitRateOption === 1,
                    satisfied: CONFIG.minProfitRate > 0 && prRate >= CONFIG.minProfitRate,
                    name: '利润率'
                }
            };
            
            // 收集所有启用的条件
            const enabledConditions = Object.values(conditions).filter(c => c.enabled);
            
            // 如果没有启用的条件，不高亮
            if (enabledConditions.length === 0) {
                return { highlight: false, reasons: [] };
            }
            
            // 检查所有"必须满足"的条件是否都满足
            const requiredConditions = enabledConditions.filter(c => c.required);
            const allRequiredSatisfied = requiredConditions.every(c => c.satisfied);
            
            // 如果有"必须满足"的条件且不全部满足，不高亮
            if (requiredConditions.length > 0 && !allRequiredSatisfied) {
                return { highlight: false, reasons: [] };
            }
            
            // 收集所有满足的条件
            const satisfiedConditions = enabledConditions.filter(c => c.satisfied);
            
            // 收集所有满足的条件，包括特定品种条件
            const allSatisfiedReasons = satisfiedConditions.map(c => c.name);
            
            // 如果是特定品种且满足条件，添加到原因中
            if (isSpecificItem && specificItemConditionMet) {
                allSatisfiedReasons.push('特定品种');
            }
            
            // 如果有"必须满足"的条件且全部满足，高亮
            if (requiredConditions.length > 0 && allRequiredSatisfied) {
                return {
                    highlight: true,
                    reasons: allSatisfiedReasons
                };
            }
            
            // 如果没有任何条件满足，不高亮
            if (satisfiedConditions.length === 0 && !specificItemConditionMet) {
                return { highlight: false, reasons: [] };
            }
            
            // 返回高亮结果和满足的条件名称
            return {
                highlight: true,
                reasons: allSatisfiedReasons
            };
        }

        // 生成数据状态的唯一标识（简化版）
        function generateDataState(data) {
            // 过滤出高亮且非黑名单的商品
            const highlightedItems = data.filter(item => item.highlight && !item.isBlacklisted);
            if (highlightedItems.length === 0) return '';
            
            // 根据配置的排序方式找出最优项目
            let bestItem;
            if (CONFIG.sortByOption === 1) {
                // 按利润率排序
                bestItem = highlightedItems.reduce((best, current) => {
                    const rateCurrent = parseFloat(current.profitRate) || 0;
                    const rateBest = parseFloat(best.profitRate) || 0;
                    return rateCurrent > rateBest ? current : best;
                });
            } else {
                // 按利润排序（默认）
                bestItem = highlightedItems.reduce((best, current) => {
                    const profitCurrent = parseFloat(current.profit.replace(/,/g, '')) || 0;
                    const profitBest = parseFloat(best.profit.replace(/,/g, '')) || 0;
                    return profitCurrent > profitBest ? current : best;
                });
            }
            
            return `${bestItem.topriceId}|${bestItem.price}|${bestItem.profit}|${bestItem.profitRate}`;
        }

        // 发送单个最优商品的通知
        function sendHighestProfitNotification(item) {
            if (!item) return;
            
            let extraInfo = '';
            if (CONFIG.sortByOption === 1) {
                // 按利润率排序时，显示利润率信息
                extraInfo = item.profitRate ? `，利润率: ${item.profitRate}%` : '';
            } else {
                // 按利润排序时，显示利润信息
                extraInfo = item.profit ? `，收益: $${item.profit}` : '';
            }
            const notificationText = `${item.itemName} 满足${item.highlightReason}条件${extraInfo}`;
            
            // 保存物品名称到GM存储，设置15秒过期时间
            if (typeof GM_setValue !== 'undefined') {
                const expireTime = Date.now() + 15000; // 15秒后过期
                GM_setValue('highlightItem', {
                    itemName: item.itemName,
                    expireTime: expireTime
                });
                console.log('已保存物品名称到GM存储:', item.itemName, '过期时间:', new Date(expireTime));
            }
            
            // 根据配置决定是否播放提示音
            if (CONFIG.enableSound) {
                notificationSound.play();
            }
            
            if (typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: '商品提醒',
                    text: notificationText,
                    highlight: true,
                    timeout: 8000,
                    onclick: function() {
                        // 点击通知时打开对应的链接
                        if (item.topriceLink && item.topriceLink !== 'N/A') {
                            window.open(item.topriceLink, '_blank');
                        }
                    }
                });
            } else {
                // 浏览器原生通知
                if (Notification.permission === 'granted') {
                    const notification = new Notification('商品提醒', {
                        body: notificationText,
                        icon: 'https://www.google.com/s2/favicons?sz=64&domain=centurygames.cn'
                    });
                    
                    // 为原生通知添加点击事件
                    notification.onclick = function() {
                        if (item.topriceLink && item.topriceLink !== 'N/A') {
                            window.open(item.topriceLink, '_blank');
                        }
                    };
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            const notification = new Notification('商品提醒', {
                                body: notificationText,
                                icon: 'https://www.google.com/s2/favicons?sz=64&domain=centurygames.cn'
                            });
                            
                            notification.onclick = function() {
                                if (item.topriceLink && item.topriceLink !== 'N/A') {
                                    window.open(item.topriceLink, '_blank');
                                }
                            };
                        }
                    });
                }
            }
        }

        // 发送批量通知（保留用于兼容性）
        function sendBatchNotification(items) {
            if (items.length === 0) return;
            
            let notificationText = '';
            if (items.length === 1) {
                const profit = items[0].profit ? `，收益: $${items[0].profit}` : '';
                notificationText = `${items[0].itemName} 满足${items[0].highlightReason}条件${profit}`;
            } else {
                // 按条件分组
                const groupedItems = {};
                items.forEach(item => {
                    if (!groupedItems[item.highlightReason]) {
                        groupedItems[item.highlightReason] = [];
                    }
                    groupedItems[item.highlightReason].push(item.itemName);
                });
                
                // 构建通知文本
                const parts = [];
                for (const [reason, names] of Object.entries(groupedItems)) {
                    if (names.length === 1) {
                        parts.push(`${names[0]}(${reason})`);
                    } else {
                        parts.push(`${names.length}个商品(${reason})`);
                    }
                }
                
                notificationText = `发现 ${items.length} 个符合条件的商品：${parts.join('，')}`;
            }
            
            // 根据配置决定是否播放提示音
            if (CONFIG.enableSound) {
                notificationSound.play();
            }
            
            if (typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: '商品提醒',
                    text: notificationText,
                    highlight: true,
                    timeout: 8000
                });
            } else {
                // 如果 GM_notification 不可用，使用浏览器原生通知
                if (Notification.permission === 'granted') {
                    new Notification('商品提醒', {
                        body: notificationText,
                        icon: 'https://www.google.com/s2/favicons?sz=64&domain=centurygames.cn'
                    });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            new Notification('商品提醒', {
                                body: notificationText,
                                icon: 'https://www.google.com/s2/favicons?sz=64&domain=centurygames.cn'
                            });
                        }
                    });
                }
            }
        }

        // 发送单个通知（保留用于兼容性）
        function sendNotification(itemName, reason, profit) {
            sendBatchNotification([{ itemName, highlightReason: reason, profit }]);
        }

        // 检查数据是否重复（简化版）
        function isDataDuplicate(currentData, previousState) {
            if (!previousState) return false;
            
            const currentState = generateDataState(currentData);
            
            // 解析之前的状态
            let previousHighestProfitItem = null;
            try {
                // 尝试解析为JSON（兼容旧格式）
                const parsedState = JSON.parse(previousState);
                if (parsedState.state) {
                    // 兼容旧格式
                    previousHighestProfitItem = parsedState.state;
                } else {
                    // 新格式直接是状态字符串
                    previousHighestProfitItem = previousState;
                }
            } catch (error) {
                // 如果不是JSON格式，直接使用字符串
                previousHighestProfitItem = previousState;
            }
            
            // 比较当前最高收益商品与之前的是否相同
            return currentState === previousHighestProfitItem;
        }

        // 获取收益颜色
        function getProfitColor(profit) {
            // 根据利润正负返回相应的颜色（盈利为绿色，亏损为红色）
            if (!profit || profit === 'N/A') return '#666';
            const pr = parseFloat(profit.replace(/[,$+]/g, ''));
            return pr >= 0 ? CONFIG.profitColor : CONFIG.lossColor;
        }

        // 新增功能：查找具有指定CSS类的元素并提取信息
        function extractItemData() {
            // 防止重复调用导致的抖动
            if (window.isExtracting) {
                console.log('数据提取正在进行中，跳过重复调用');
                return;
            }
            
            window.isExtracting = true;
            
            // 监听DOM变化并提取页面中的商品数据
            const elementsObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            const elements = node.querySelectorAll('.border.rounded-lg.p-2.overflow-auto');
                            if (elements.length > 0) {
                                processElements(Array.from(elements));
                            }
                        }
                    });
                });
            });

            const elements = document.querySelectorAll('.border.rounded-lg.p-2.overflow-auto');
            if (elements.length > 0) {
                processElements(Array.from(elements));
            }
            
            // 重置提取标志
            setTimeout(() => {
                window.isExtracting = false;
            }, 1000);
        }

        function processElements(elements) {
            // 处理找到的商品元素，提取详细信息并计算相关指标
            const extractedData = [];
            
            elements.forEach((element, index) => {
                try {
                    let itemName = 'N/A';
                    let linkId = 'N/A'; // 新增：存储链接ID
                    const nameContainer = element.querySelector('.flex-1.min-w-0');
                    if (nameContainer) {
                        const titleElement = nameContainer.querySelector('[title]');
                        if (titleElement && titleElement.getAttribute('title')) {
                            itemName = titleElement.getAttribute('title').trim();
                            
                            // 新增：提取href属性中的/item/后面的数字作为linkId
                            if (titleElement.hasAttribute('href')) {
                                const href = titleElement.getAttribute('href');
                                const match = href.match(/\/item\/(\d+)/);
                                if (match) {
                                    linkId = match[1];
                                    console.log(linkId)
                                }
                            }
                        } else {
                            const nameElement = nameContainer.querySelector('.item-name, .name, h3, h4, span');
                            if (nameElement) {
                                itemName = nameElement.textContent.trim();
                            } else {
                                itemName = nameContainer.textContent.trim();
                            }
                        }
                    }
                    
                    let mrkt = 'N/A';
                    if (nameContainer) {
                        const mrktElements = nameContainer.querySelectorAll('.font-semibold');
                        if (mrktElements.length >= 2) {
                            mrkt = mrktElements[1].textContent.trim();
                        } else if (mrktElements.length === 1) {
                            mrkt = mrktElements[0].textContent.trim();
                        }
                    }
                    if (mrkt === 'N/A') {
                        const mrktElement = element.querySelector('[data-mrkt]');
                        if (mrktElement) {
                            mrkt = mrktElement.textContent.trim();
                        } else {
                            const textContent = element.textContent;
                            const mrktMatch = textContent.match(/Mrkt[:：]?\s*([^\n\r]+)/i);
                            if (mrktMatch) {
                                mrkt = mrktMatch[1].trim();
                            }
                        }
                    }
                    if (mrkt !== 'N/A' && mrkt.length > 0) {
                        if (!/^\d/.test(mrkt)) {
                            mrkt = mrkt.slice(1);
                        }
                    }
                    
                    let topPrice = 'N/A', top2Price = 'N/A', top3Price = 'N/A';
                    let top1Id = 'N/A', top1Quantity = 'N/A', top1PriceValue = 'N/A', top1Profit = 'N/A', top1Link = 'N/A';
                    let top2Id = 'N/A', top2Quantity = 'N/A', top2PriceValue = 'N/A', top2Profit = 'N/A', top2Link = 'N/A';
                    let top3Id = 'N/A', top3Quantity = 'N/A', top3PriceValue = 'N/A', top3Profit = 'N/A', top3Link = 'N/A';
                    
                    const spaceContainer = element.querySelector('.space-y-0\\.5');
                    if (spaceContainer) {
                        const priceElements = spaceContainer.querySelectorAll('.border.rounded.px-1\\.5.py-1');
                        
                        priceElements.forEach((priceEl, idx) => {
                            const children = priceEl.children;
                            if (children.length >= 2) {
                                const idEl = children[0];
                                const infoEl = children[1];
                                const idText = idEl.textContent.trim();
                                const infoText = infoEl.textContent.trim();
                                
                                // 获取ID的超链接
                                let idLink = 'N/A';
                                const idLinkElement = idEl.querySelector('a');
                                if (idLinkElement) {
                                    idLink = idLinkElement.href;
                                    // 在超链接后面增加&itemId=linkid&highlight=1#/
                                    if (idLink !== 'N/A' && idText && idText !== 'N/A') {
                                        //idLink = idLink + '&itemId=' + linkId + '&highlight=1#/';
                                    }
                                }
                                
                                const qMatch = infoText.match(/Q:\s*([\d,]+)/i);
                                const pMatch = infoText.match(/P:\s*\$?([\d,]+(?:\.\d+)?)/i);
                                const pftMatch = infoText.match(/Pft:\s*([+-]\$?[\d,]+(?:\.\d+)?)/i);
                                
                                if (idx === 0) {
                                    top1Id = idText;
                                    top1Link = idLink;
                                    top1Quantity = qMatch ? qMatch[1] : 'N/A';
                                    top1PriceValue = pMatch ? pMatch[1] : 'N/A';
                                    top1Profit = pftMatch ? pftMatch[1] : 'N/A';
                                } else if (idx === 1) {
                                    top2Id = idText;
                                    top2Link = idLink;
                                    top2Quantity = qMatch ? qMatch[1] : 'N/A';
                                    top2PriceValue = pMatch ? pMatch[1] : 'N/A';
                                    top2Profit = pftMatch ? pftMatch[1] : 'N/A';
                                } else if (idx === 2) {
                                    top3Id = idText;
                                    top3Link = idLink;
                                    top3Quantity = qMatch ? qMatch[1] : 'N/A';
                                    top3PriceValue = pMatch ? pMatch[1] : 'N/A';
                                    top3Profit = pftMatch ? pftMatch[1] : 'N/A';
                                }
                            }
                        });
                    }
                    
                    // 计算价差
                    let priceDiff = 'N/A';
                    let totalProfit = 'N/A';
                    if (mrkt !== 'N/A' && top1PriceValue !== 'N/A') {
                        const m = parseFloat(mrkt.replace(/,/g, ''));
                        const p = parseFloat(top1PriceValue.replace(/,/g, ''));
                        if (!isNaN(m) && !isNaN(p)) {
                            const diff = m - p;
                            priceDiff = diff.toLocaleString();
                            
                            // 计算总收益 = 价差 * 数量
                            if (top1Quantity !== 'N/A') {
                                const q = parseFloat(top1Quantity.replace(/,/g, ''));
                                if (!isNaN(q)) {
                                    totalProfit = (diff * q).toLocaleString();
                                }
                            }
                        }
                    }
                    
                    const profitRate = calculateProfitRate(mrkt, top1PriceValue);
                    const highlightResult = shouldHighlight(top1PriceValue, totalProfit, profitRate, itemName, top1Id, top1Quantity);
                    
                    extractedData.push({
                        index: index + 1,
                        itemName,
                        mrkt,
                        topPrice,
                        top2Price,
                        top3Price,
                        topriceId: top1Id,
                        topriceLink: top1Link,
                        quantity: top1Quantity,
                        price: top1PriceValue,
                        profit: totalProfit,
                        profitRate,
                        priceDiff,
                        highlight: highlightResult.highlight,
                        highlightReason: highlightResult.reasons ? highlightResult.reasons.join(', ') : '',
                        isBlacklisted: highlightResult.isBlacklisted || false,
                        linkId, // 新增：添加链接ID
                        top1Id,
                        top1Link,
                        top1Quantity,
                        top1PriceValue,
                        top1Profit,
                        top2Id,
                        top2Link,
                        top2Quantity,
                        top2PriceValue,
                        top2Profit,
                        top3Id,
                        top3Link,
                        top3Quantity,
                        top3PriceValue,
                        top3Profit
                    });
                    

                    
                    // 高亮符合条件的商品卡片
                    if (highlightResult.highlight) {
                        // 如果是黑名单中的商品，使用橙红色高亮
                        if (highlightResult.isBlacklisted) {
                            element.style.backgroundColor = '#ff5722'; // 橙红色
                            element.style.transition = 'background-color 0.3s ease';
                            
                            // 设置30秒后清除高亮的定时器
                            setTimeout(() => {
                                element.style.backgroundColor = '';
                                console.log('已清除黑名单商品高亮:', itemName);
                            }, 30000);
                        } else {
                            element.style.backgroundColor = CONFIG.highlightColor;
                            element.style.transition = 'background-color 0.3s ease';
                            
                            // 设置30秒后清除高亮的定时器
                            setTimeout(() => {
                                element.style.backgroundColor = '';
                                console.log('已清除商品高亮:', itemName);
                            }, 30000);
                        }
                    }
                    
                } catch (error) {
                    console.error(`处理元素 ${index + 1} 时出错:`, error);
                }
            });
            
            // 检查数据是否重复
            const isDuplicate = isDataDuplicate(extractedData, previousDataState);
            
            // 如果不是重复数据，发送通知并更新状态
            if (!isDuplicate) {
                const newHighlightedItems = extractedData.filter(item => item.highlight);
                
                // 如果有高亮项目，只通知最优的非黑名单商品
                if (newHighlightedItems.length > 0) {
                    // 过滤掉黑名单中的商品
                    const nonBlacklistedItems = newHighlightedItems.filter(item => !item.isBlacklisted);
                    
                    // 如果有非黑名单的高亮项目，找出最优的那个
                    if (nonBlacklistedItems.length > 0) {
                        let bestItem;
                        if (CONFIG.sortByOption === 1) {
                            // 按利润率排序
                            bestItem = nonBlacklistedItems.reduce((best, current) => {
                                const rateCurrent = parseFloat(current.profitRate) || 0;
                                const rateBest = parseFloat(best.profitRate) || 0;
                                return rateCurrent > rateBest ? current : best;
                            });
                        } else {
                            // 按利润排序（默认）
                            bestItem = nonBlacklistedItems.reduce((best, current) => {
                                const profitCurrent = parseFloat(current.profit.replace(/,/g, '')) || 0;
                                const profitBest = parseFloat(best.profit.replace(/,/g, '')) || 0;
                                return profitCurrent > profitBest ? current : best;
                            });
                        }
                        
                        // 发送最优非黑名单商品的通知
                        sendHighestProfitNotification(bestItem);
                    }
                }
                
                // 更新数据状态
                previousDataState = generateDataState(extractedData);
            }
            
            // 根据配置的排序方式排序数据
            if (CONFIG.sortByOption === 1) {
                // 按利润率从高到低排序
                extractedData.sort((a, b) => {
                    const rateA = parseFloat(a.profitRate) || 0;
                    const rateB = parseFloat(b.profitRate) || 0;
                    return rateB - rateA; // 从高到低排序
                });
            } else {
                // 按利润从高到低排序（默认）
                extractedData.sort((a, b) => {
                    const profitA = parseFloat(a.profit.replace(/,/g, '')) || 0;
                    const profitB = parseFloat(b.profit.replace(/,/g, '')) || 0;
                    return profitB - profitA; // 从高到低排序
                });
            }
            
            displayExtractedData(extractedData, isDuplicate);
        }
        
        // 显示提取数据的函数（优化版）
        function displayExtractedData(data, isDuplicate = false) {
            // 防止重复创建表格导致抖动
            if (window.isDisplaying) {
                console.log('数据展示正在进行中，跳过重复调用');
                return;
            }
            
            window.isDisplaying = true;
            
            // 创建一个美观的数据展示面板，以表格形式显示提取的商品数据
            const existingDisplay = document.getElementById('item-data-display');
            if (existingDisplay) {
                existingDisplay.remove();
            }
            
            // 查找目标容器元素
            const targetContainer = document.querySelector('.max-w-7xl.mx-auto.py-6.px-3.sm\\:px-5');
            
            const displayContainer = document.createElement('div');
            displayContainer.id = 'item-data-display';
            displayContainer.style.cssText = `
                width: 100%;
                margin-top: 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border: 1px solid #ddd;
                border-radius: 12px;
                padding: 20px;
                font-family: 'Arial', sans-serif;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                backdrop-filter: blur(10px);
            `;
            
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e0e0e0;
            `;
            
            const title = document.createElement('h2');
            title.textContent = `商品数据分析 (${data.length} 项)`;
            title.style.cssText = 'margin: 0; color: #333; font-size: 20px; font-weight: bold;';
            header.appendChild(title);
            
            const controls = document.createElement('div');
            controls.style.cssText = 'display: flex; gap: 10px; align-items: center;';
            
            const stats = document.createElement('span');
            const highlighted = data.filter(item => item.highlight).length;
            stats.textContent = `高亮: ${highlighted}/${data.length}`;
            stats.style.cssText = 'color: #666; font-size: 14px;';
            controls.appendChild(stats);
            
            const closeButton = document.createElement('button');
            closeButton.innerHTML = '×';
            closeButton.style.cssText = `
                background: #ff4757;
                color: white;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            closeButton.onclick = () => displayContainer.remove();
            
            const minimizeButton = document.createElement('button');
            minimizeButton.innerHTML = '−';
            minimizeButton.style.cssText = `
                background: #3742fa;
                color: white;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            minimizeButton.onclick = () => {
                const content = displayContainer.querySelector('.table-content');
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    minimizeButton.innerHTML = '−';
                } else {
                    content.style.display = 'none';
                    minimizeButton.innerHTML = '+';
                }
            };
            
            controls.appendChild(minimizeButton);
            controls.appendChild(closeButton);
            header.appendChild(controls);
            displayContainer.appendChild(header);
            
            if (data.length > 0) {
                const content = document.createElement('div');
                content.className = 'table-content';
                content.style.cssText = 'max-height: 120vh; overflow-y: auto; position: relative;';
                
                const table = document.createElement('table');
                table.style.cssText = `
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    position: relative;
                    table-layout: fixed;
                `;
                
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <th style="padding: 12px 8px; text-align: left; font-weight: 600;">物品</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Mrkt</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">ID</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">数量</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">价格</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">价差</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">收益</th>
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600;">利润率</th>
                    </tr>
                `;
                table.appendChild(thead);
                
                const tbody = document.createElement('tbody');
                data.forEach((item, index) => {
                    const row = document.createElement('tr');
                    
                    // 根据是否重复数据选择高亮颜色
                    let highlightColor = '';
                    if (item.highlight) {
                        if (item.isBlacklisted) {
                            highlightColor = '#ffccbc'; // 橙红色浅色版本
                        } else {
                            highlightColor = isDuplicate ? CONFIG.lightHighlightColor : '#fff3cd';
                        }
                    }
                    
                    row.style.cssText = `
                        border-bottom: 1px solid #eee;
                        ${highlightColor ? `background-color: ${highlightColor};` : ''}
                    `;
                    row.classList.add('data-row');
                    
                    // 检查行是否有点击事件监听器可能干扰链接点击
                    row.addEventListener('click', function(e) {
                        console.log('表格行点击事件触发，目标:', e.target, '目标标签名:', e.target.tagName);
                    });
                    
                    // 检查是否有其他事件干扰
                    row.addEventListener('mousedown', function(e) {
                        console.log('表格行mousedown事件触发，目标:', e.target, '目标标签名:', e.target.tagName);
                    });
                    
                    const profitColor = getProfitColor(item.profit);
                    const profitRate = item.profitRate ? `${item.profitRate}%` : 'N/A';
                    
                    // 创建单元格
                    const nameCell = document.createElement('td');
                    nameCell.style.cssText = 'padding: 10px 8px; font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
                    nameCell.textContent = item.itemName;
                    
                    const mrktCell = document.createElement('td');
                    mrktCell.style.cssText = 'padding: 10px 8px; text-align: right; color: #666;';
                    mrktCell.textContent = formatNumber(item.mrkt);
                    
                    const idCell = document.createElement('td');
                    idCell.style.cssText = 'padding: 10px 8px; text-align: right; font-family: monospace; font-size: 12px;';
                    
                    // 创建ID单元格，如果是链接则显示为可点击的链接
                    if (item.topriceLink && item.topriceLink !== 'N/A') {
                        const link = document.createElement('a');
                        link.href = item.topriceLink;
                        link.target = '_blank';
                        link.style.cssText = 'color: #007bff; text-decoration: underline; cursor: pointer; font-family: monospace; font-size: 12px; display: inline-block; position: relative; z-index: 10; pointer-events: auto; user-select: none; min-width: 50px; min-height: 20px;';
                        link.textContent = item.topriceId;
                        
                        // 添加点击事件处理，确保链接能够正常打开
                        link.addEventListener('click', function(e) {
                            console.log('链接点击事件触发:', item.topriceLink);
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // 保存物品名称到GM存储，设置15秒过期时间
                            if (typeof GM_setValue !== 'undefined' && item.itemName && item.itemName !== 'N/A') {
                                const expireTime = Date.now() + 15000; // 15秒后过期
                                GM_setValue('highlightItem', {
                                    itemName: item.itemName,
                                    expireTime: expireTime
                                });
                                console.log('已保存物品名称到GM存储:', item.itemName, '过期时间:', new Date(expireTime));
                            }
                            
                            window.open(item.topriceLink, '_blank');
                        });
                        
                        // 添加多种事件监听器以确保点击被捕获
                        link.addEventListener('mousedown', function(e) {
                            console.log('链接mousedown事件触发:', item.topriceLink, '按钮:', e.button);
                        });
                        
                        link.addEventListener('mouseup', function(e) {
                            console.log('链接mouseup事件触发:', item.topriceLink, '按钮:', e.button);
                        });
                        
                        // 检查链接是否被其他元素覆盖
                        link.addEventListener('mouseover', function(e) {
                            console.log('链接mouseover事件触发，元素可见性:',
                                window.getComputedStyle(this).visibility,
                                'display:', window.getComputedStyle(this).display,
                                'z-index:', window.getComputedStyle(this).zIndex);
                        });
                        
                        // 添加更全面的事件监听
                        link.addEventListener('dblclick', function(e) {
                            console.log('链接dblclick事件触发:', item.topriceLink);
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // 保存物品名称到GM存储，设置15秒过期时间
                            if (typeof GM_setValue !== 'undefined' && item.itemName && item.itemName !== 'N/A') {
                                const expireTime = Date.now() + 15000; // 15秒后过期
                                GM_setValue('highlightItem', {
                                    itemName: item.itemName,
                                    expireTime: expireTime
                                });
                                console.log('已保存物品名称到GM存储:', item.itemName, '过期时间:', new Date(expireTime));
                            }
                            
                            window.open(item.topriceLink, '_blank');
                        });
                        
                        link.addEventListener('contextmenu', function(e) {
                            console.log('链接contextmenu事件触发:', item.topriceLink);
                        });
                        
                        // 添加全局点击事件监听来检查点击位置
                        document.addEventListener('click', function globalClickHandler(e) {
                            const rect = link.getBoundingClientRect();
                            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                                console.log('全局点击事件在链接区域内触发:', item.topriceLink, '目标:', e.target);
                                // 直接在这里处理链接点击
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // 保存物品名称到GM存储，设置15秒过期时间
                                if (typeof GM_setValue !== 'undefined' && item.itemName && item.itemName !== 'N/A') {
                                    const expireTime = Date.now() + 15000; // 15秒后过期
                                    GM_setValue('highlightItem', {
                                        itemName: item.itemName,
                                        expireTime: expireTime
                                    });
                                    console.log('已保存物品名称到GM存储:', item.itemName, '过期时间:', new Date(expireTime));
                                }
                                
                                window.open(item.topriceLink, '_blank');
                                // 移除这个全局监听器避免重复触发
                                document.removeEventListener('click', globalClickHandler, true);
                            }
                        }, true); // 使用捕获阶段
                        
                        // 添加悬停效果
                        link.addEventListener('mouseenter', function() {
                            this.style.color = '#0056b3';
                            this.style.textDecoration = 'underline';
                        });
                        
                        link.addEventListener('mouseleave', function() {
                            this.style.color = '#007bff';
                            this.style.textDecoration = 'underline';
                        });
                        
                        idCell.appendChild(link);
                    } else {
                        idCell.textContent = item.topriceId;
                    }
                    
                    const quantityCell = document.createElement('td');
                    quantityCell.style.cssText = 'padding: 10px 8px; text-align: right;';
                    quantityCell.textContent = formatNumber(item.quantity);
                    
                    const priceCell = document.createElement('td');
                    priceCell.style.cssText = 'padding: 10px 8px; text-align: right; font-weight: 600;';
                    priceCell.textContent = formatNumber(item.price);
                    
                    const priceDiffCell = document.createElement('td');
                    priceDiffCell.style.cssText = 'padding: 10px 8px; text-align: right; font-weight: 600; color: #2196f3;';
                    priceDiffCell.textContent = item.priceDiff;
                    
                    const profitCell = document.createElement('td');
                    profitCell.style.cssText = `padding: 10px 8px; text-align: right; font-weight: 600; color: ${profitColor};`;
                    profitCell.textContent = item.profit;
                    
                    const profitRateCell = document.createElement('td');
                    profitRateCell.style.cssText = `padding: 10px 8px; text-align: right; font-weight: 600; color: ${profitColor};`;
                    profitRateCell.textContent = profitRate;
                    
                    // 添加所有单元格到行
                    row.appendChild(nameCell);
                    row.appendChild(mrktCell);
                    row.appendChild(idCell);
                    row.appendChild(quantityCell);
                    row.appendChild(priceCell);
                    row.appendChild(priceDiffCell);
                    row.appendChild(profitCell);
                    row.appendChild(profitRateCell);
                    
                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
                
                content.appendChild(table);
                displayContainer.appendChild(content);
                
                const footer = document.createElement('div');
                footer.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 15px;
                    padding-top: 10px;
                    border-top: 1px solid #e0e0e0;
                `;
                
                const refreshButton = document.createElement('button');
                refreshButton.textContent = '📊 逻辑和计算说明';
                refreshButton.style.cssText = `
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: transform 0.2s ease;
                `;
                refreshButton.onmouseover = () => refreshButton.style.transform = 'scale(1.05)';
                refreshButton.onmouseout = () => refreshButton.style.transform = 'scale(1)';
                refreshButton.onclick = () => {
                    showCalculationLogic();
                };
                
                footer.appendChild(refreshButton);
                displayContainer.appendChild(footer);
                
            } else {
                const noData = document.createElement('p');
                noData.textContent = '未找到商品数据，请确保页面已完全加载。';
                noData.style.cssText = 'text-align: center; color: #666; font-size: 16px; padding: 40px;';
                displayContainer.appendChild(noData);
            }
            
            // 如果找到目标容器，则插入到其中；否则添加到body
            if (targetContainer) {
                targetContainer.appendChild(displayContainer);
            } else {
                // 回退到原来的固定位置显示
                displayContainer.style.cssText = `
                    position: fixed;
                    bottom: 10px;
                    left: 10px;
                    width: 1100px;
                    max-height: 85vh;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border: 1px solid #ddd;
                    border-radius: 12px;
                    padding: 20px;
                    z-index: 10000;
                    font-family: 'Arial', sans-serif;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                    backdrop-filter: blur(10px);
                `;
                document.body.appendChild(displayContainer);
            }
            
            // 重置展示标志
            setTimeout(() => {
                window.isDisplaying = false;
            }, 500);
        }
        
        // 显示计算逻辑说明的函数
        function showCalculationLogic() {
            // 检查是否已存在说明面板
            const existingPanel = document.getElementById('calculation-logic-panel');
            if (existingPanel) {
                existingPanel.remove();
                return;
            }

            const panel = document.createElement('div');
            panel.id = 'calculation-logic-panel';
            panel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border: 2px solid #333;
                border-radius: 12px;
                padding: 25px;
                z-index: 10002;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                font-family: Arial, sans-serif;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
            `;

            panel.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #333; text-align: center; font-size: 24px;">📊 商品数据分析计算逻辑说明</h2>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #667eea; margin-bottom: 10px;">🎯 脚本功能概述</h3>
                    <p style="line-height: 1.6; color: #555;">
                        本脚本用于自动分析 w3b 网站上的商品数据，识别低于设定价格且利润达到指定阈值的商品，
                        并通过高亮显示和数据表格的形式展示分析结果。
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #667eea; margin-bottom: 10px;">⚙️ 当前配置参数</h3>
                    <ul style="line-height: 1.8; color: #555; padding-left: 20px;">
                        <li><strong>最小利润阈值：</strong> $${CONFIG.minProfit.toLocaleString()}
                            (${CONFIG.minProfitOption === 0 ? '关闭' : CONFIG.minProfitOption === 1 ? '必须满足' : '只要满足就提醒'})</li>
                        <li><strong>最小利润率阈值：</strong> ${CONFIG.minProfitRate}%
                            (${CONFIG.minProfitRateOption === 0 ? '关闭' : CONFIG.minProfitRateOption === 1 ? '必须满足' : '只要满足就提醒'})</li>
                        <li><strong>特定品种提醒：</strong> ${CONFIG.specificItems || '未设置'}
                            (${CONFIG.specificItemsOption === 0 ? '关闭' : CONFIG.specificItemsOption === 1 ? '启用' : '关闭'})</li>
                        <li><strong>提示音：</strong> ${CONFIG.enableSound ? '已启用' : '已关闭'}</li>
                        <li><strong>高亮颜色：</strong> ${CONFIG.highlightColor}</li>
                    </ul>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #667eea; margin-bottom: 10px;">📈 核心计算逻辑</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="color: #333; margin-bottom: 8px;">1. 价差计算</h4>
                        <p style="margin: 0; font-family: monospace; color: #2196f3;">
                            价差 = 市场价格 (Mrkt) - 商品价格 (Price)
                        </p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="color: #333; margin-bottom: 8px;">2. 总收益计算</h4>
                        <p style="margin: 0; font-family: monospace; color: #4caf50;">
                            总收益 = 价差 × 商品数量 (Quantity)
                        </p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="color: #333; margin-bottom: 8px;">3. 利润率计算</h4>
                        <p style="margin: 0; font-family: monospace; color: #ff9800;">
                            利润率 = (市场价格 - 商品价格) / 市场价格 × 100%
                        </p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                        <h4 style="color: #333; margin-bottom: 8px;">4. 高亮条件判断</h4>
                        <p style="margin: 0; font-family: monospace; color: #9c27b0;">
                            基本逻辑 = 满足所有"必须满足"的条件 AND 至少满足一个"只要满足就提醒"的条件
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #ff6b6b;">
                            <strong>特殊规则</strong>：如果启用了特定品种条件，则特定品种中的商品需先满足特定品种条件，其他商品直接判断其他条件
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                            最小利润/利润率条件可以设置为：关闭、必须满足、只要满足就提醒<br>
                            特定品种条件可以设置为：关闭、启用（格式：物品1,数量,价格;物品2,数量,价格）<br>
                            特定品种条件判断：商品名称匹配 AND 商品数量≥设定数量 AND 商品价格≤设定价格（三个条件同时满足）<br>
                            黑名单功能：如果商品ID在黑名单中，该商品将被忽略并以橙红色高亮显示
                        </p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #667eea; margin-bottom: 10px;">🔍 数据提取流程</h3>
                    <ol style="line-height: 1.8; color: #555; padding-left: 20px;">
                        <li>扫描页面中所有符合 <code>.border.rounded-lg.p-2.overflow-auto</code> CSS 类的商品卡片</li>
                        <li>从每个商品卡片中提取：
                            <ul style="margin-top: 5px; padding-left: 20px;">
                                <li>商品名称 (从 title 属性或文本内容中获取)</li>
                                <li>市场价格 (Mrkt)</li>
                                <li>卖家ID、商品数量、价格和利润信息</li>
                            </ul>
                        </li>
                        <li>计算价差、总收益和利润率</li>
                        <li>根据配置参数判断是否需要高亮显示</li>
                        <li>将所有数据整理成表格形式展示</li>
                    </ol>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #667eea; margin-bottom: 10px;">🎨 颜色标识说明</h3>
                    <ul style="line-height: 1.8; color: #555; padding-left: 20px;">
                        <li><span style="display: inline-block; width: 15px; height: 15px; background: ${CONFIG.profitColor}; margin-right: 8px; border-radius: 3px;"></span>绿色：表示盈利（利润为正数）</li>
                        <li><span style="display: inline-block; width: 15px; height: 15px; background: ${CONFIG.lossColor}; margin-right: 8px; border-radius: 3px;"></span>红色：表示亏损（利润为负数）</li>
                        <li><span style="display: inline-block; width: 15px; height: 15px; background: ${CONFIG.highlightColor}; margin-right: 8px; border-radius: 3px;"></span>黄色：表示符合高亮条件的商品</li>
                    </ul>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #667eea; margin-bottom: 10px;">💡 使用提示</h3>
                    <ul style="line-height: 1.8; color: #555; padding-left: 20px;">
                        <li>1.点击页面右上角的 ⚙️ 按钮可以调整最小利润、利润率和特定品种参数</li>
                        <li>每个条件可以单独设置为"关闭"、"必须满足"或"只要满足就提醒"</li>
                        <li>如果设置了"必须满足"的条件，则必须同时满足所有这些条件才会高亮</li>
                        <li>如果没有任何"必须满足"的条件，则满足任意一个"只要满足就提醒"的条件即可高亮</li>
                        <li><strong>重要</strong>：如果启用了特定品种条件，则特定品种中的商品需先满足特定品种条件，其他商品直接判断其他条件</li>
                        <li>特定品种条件已简化为只有"关闭"和"启用"两个选项，启用时具有最高优先级</li>
                        <li>符合高亮条件的商品会在原页面中以黄色背景显示</li>
                        <li>特定品种支持模糊匹配，输入物品名称的部分关键词即可</li>
                        <li>数据表格会实时显示所有商品的详细分析结果</li>
                        <li>2.设置好后保持网页不关闭就行，可以最小化。数据会自动刷新，有符合条件的会提醒。</li>
                        <li>3.有提醒的时候右下角会弹窗，单击后进入对应bazarr扫货</li>
                        <li>4.可以在设置中开启或关闭提示音功能，当发现符合条件的商品时会播放三声提示音</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin-top: 25px;">
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        padding: 10px 25px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 16px;
                    ">关闭说明</button>
                </div>
            `;

            document.body.appendChild(panel);
        }
        
        // 页面加载完成后立即执行一次
        window.addEventListener('load', extractItemData);
        
        // DOM内容加载完成后也执行一次
        if (document.readyState === 'loading') {
            // 确保在DOM加载完成后立即开始数据提取
            document.addEventListener('DOMContentLoaded', extractItemData);
        } else {
            // 如果DOM已经加载完成，直接执行数据提取
            extractItemData();
        }
    }
    
    
    // 根据当前URL执行对应的主函数
    if (window.location.href.includes('weav3r.dev/favorites')) {
        mainFunctionA();
    }
})();
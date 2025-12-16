// ==UserScript==
// @name         自动高亮低价商品
// @namespace    https://github.com/pakeh2866
// @version      0.2
// @description  w3b中低于某个价格，利润在x%以上的高亮显示
// @author       pakeh
// @match        https://weav3r.dev/favorites
// @icon         https://www.google.com/s2/favicons?sz=64&domain=centurygames.cn
// @grant        none
// @lincense     MIT
// ==/UserScript==

(function() {
    'use strict';

    // 全局样式配置
    const CONFIG = {
        minProfit: 1000,
        highlightColor: '#ffeb3b',
        profitColor: '#4caf50',
        lossColor: '#f44336'
    };

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
            min-width: 300px;
        `;

        panel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">设置参数</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">最小利润: $</label>
                <input type="number" id="minProfit" value="${CONFIG.minProfit}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">取消</button>
                <button onclick="saveSettings()" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">保存</button>
            </div>
        `;

        document.body.appendChild(panel);

        window.saveSettings = function() {
            CONFIG.minProfit = parseFloat(document.getElementById('minProfit').value);
            panel.remove();
            extractItemData(); // 重新提取并高亮数据
        };
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
                setTimeout(extractItemData, 200);
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

    // 判断是否应该高亮显示
    function shouldHighlight(price, profit) {
        // 根据配置的最小利润判断商品是否符合高亮条件
        if (!price || !profit || price === 'N/A' || profit === 'N/A') return false;
        const pr = parseFloat(profit.replace(/,/g, ''));
        return pr >= CONFIG.minProfit;
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
    }

    function processElements(elements) {
        // 处理找到的商品元素，提取详细信息并计算相关指标
        const extractedData = [];
        
        elements.forEach((element, index) => {
            try {
                let itemName = 'N/A';
                const nameContainer = element.querySelector('.flex-1.min-w-0');
                if (nameContainer) {
                    const titleElement = nameContainer.querySelector('[title]');
                    if (titleElement && titleElement.getAttribute('title')) {
                        itemName = titleElement.getAttribute('title').trim();
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
                    const mrktElement = nameContainer.querySelector('.font-semibold');
                    if (mrktElement) {
                        mrkt = mrktElement.textContent.trim();
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
                let top1Id = 'N/A', top1Quantity = 'N/A', top1PriceValue = 'N/A', top1Profit = 'N/A';
                let top2Id = 'N/A', top2Quantity = 'N/A', top2PriceValue = 'N/A', top2Profit = 'N/A';
                let top3Id = 'N/A', top3Quantity = 'N/A', top3PriceValue = 'N/A', top3Profit = 'N/A';
                
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
                            
                            const qMatch = infoText.match(/Q:\s*([\d,]+)/i);
                            const pMatch = infoText.match(/P:\s*\$?([\d,]+(?:\.\d+)?)/i);
                            const pftMatch = infoText.match(/Pft:\s*([+-]\$?[\d,]+(?:\.\d+)?)/i);
                            
                            if (idx === 0) {
                                top1Id = idText;
                                top1Quantity = qMatch ? qMatch[1] : 'N/A';
                                top1PriceValue = pMatch ? pMatch[1] : 'N/A';
                                top1Profit = pftMatch ? pftMatch[1] : 'N/A';
                            } else if (idx === 1) {
                                top2Id = idText;
                                top2Quantity = qMatch ? qMatch[1] : 'N/A';
                                top2PriceValue = pMatch ? pMatch[1] : 'N/A';
                                top2Profit = pftMatch ? pftMatch[1] : 'N/A';
                            } else if (idx === 2) {
                                top3Id = idText;
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
                const highlight = shouldHighlight(top1PriceValue, totalProfit);
                
                extractedData.push({
                    index: index + 1,
                    itemName,
                    mrkt,
                    topPrice,
                    top2Price,
                    top3Price,
                    topriceId: top1Id,
                    quantity: top1Quantity,
                    price: top1PriceValue,
                    profit: totalProfit,
                    profitRate,
                    priceDiff,
                    highlight,
                    top1Id,
                    top1Quantity,
                    top1PriceValue,
                    top1Profit,
                    top2Id,
                    top2Quantity,
                    top2PriceValue,
                    top2Profit,
                    top3Id,
                    top3Quantity,
                    top3PriceValue,
                    top3Profit
                });
                
                // 高亮符合条件的商品卡片
                if (highlight) {
                    element.style.backgroundColor = CONFIG.highlightColor;
                    element.style.transition = 'background-color 0.3s ease';
                }
                
            } catch (error) {
                console.error(`处理元素 ${index + 1} 时出错:`, error);
            }
        });
        
        displayExtractedData(extractedData);
    }
    
    // 显示提取数据的函数（优化版）
    function displayExtractedData(data) {
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
            content.style.cssText = 'max-height: 70vh; overflow-y: auto;';
            
            const table = document.createElement('table');
            table.style.cssText = `
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
                row.style.cssText = `
                    border-bottom: 1px solid #eee;
                    ${item.highlight ? 'background-color: #fff3cd;' : ''}
                `;
                row.classList.add('data-row');
                
                const profitColor = getProfitColor(item.profit);
                const profitRate = item.profitRate ? `${item.profitRate}%` : 'N/A';
                
                row.innerHTML = `
                    <td style="padding: 10px 8px; font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.itemName}</td>
                    <td style="padding: 10px 8px; text-align: right; color: #666;">${formatNumber(item.mrkt)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-family: monospace; font-size: 12px;">${item.topriceId}</td>
                    <td style="padding: 10px 8px; text-align: right;">${formatNumber(item.quantity)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${formatNumber(item.price)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: #2196f3;">${item.priceDiff}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: ${profitColor};">${item.profit}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: ${profitColor};">${profitRate}</td>
                `;
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
            refreshButton.textContent = '📊 计算逻辑说明';
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
        
        // 添加CSS样式来处理表格行的悬停效果
        const style = document.createElement('style');
        style.textContent = `
            .data-row:hover {
                background-color: #f8f9fa !important;
            }
        `;
        document.head.appendChild(style);
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
                    <li><strong>最小利润阈值：</strong> $${CONFIG.minProfit.toLocaleString()}</li>
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
                        高亮显示 = (总收益 ≥ 最小利润阈值)
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
                    <li>点击页面右上角的 ⚙️ 按钮可以调整最小利润参数</li>
                    <li>符合高亮条件的商品会在原页面中以黄色背景显示</li>
                    <li>数据表格会实时显示所有商品的详细分析结果</li>
                    <li>点击表格中的 − 按钮可以折叠/展开数据表格</li>
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
})();
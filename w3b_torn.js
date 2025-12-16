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
        maxPrice: 50000,
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
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">最大价格: $</label>
                <input type="number" id="maxPrice" value="${CONFIG.maxPrice}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.parentElement.parentElement.remove()" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">取消</button>
                <button onclick="saveSettings()" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">保存</button>
            </div>
        `;

        document.body.appendChild(panel);

        window.saveSettings = function() {
            CONFIG.minProfit = parseFloat(document.getElementById('minProfit').value);
            CONFIG.maxPrice = parseFloat(document.getElementById('maxPrice').value);
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
    function calculateProfitRate(price, profit) {
        // 根据价格和利润计算利润率百分比
        if (!price || !profit || price === 'N/A' || profit === 'N/A') return 0;
        const p = parseFloat(price.replace(/,/g, ''));
        const pr = parseFloat(profit.replace(/[,$+]/g, ''));
        return (pr / p * 100).toFixed(1);
    }

    // 判断是否应该高亮显示
    function shouldHighlight(price, profit) {
        // 根据配置的最小利润和最大价格判断商品是否符合高亮条件
        if (!price || !profit || price === 'N/A' || profit === 'N/A') return false;
        const p = parseFloat(price.replace(/,/g, ''));
        const pr = parseFloat(profit.replace(/[,$+]/g, ''));
        return pr >= CONFIG.minProfit && p <= CONFIG.maxPrice;
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
                
                const profitRate = calculateProfitRate(top1PriceValue, top1Profit);
                const highlight = shouldHighlight(top1PriceValue, top1Profit);
                
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
                    profit: top1Profit,
                    profitRate,
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
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Top1价格</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">ID</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">数量</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">价格</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">收益</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">利润率</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Top2价格</th>
                    <th style="padding: 12px 8px; text-align: right; font-weight: 600;">Top3价格</th>
                </tr>
            `;
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            data.forEach((item, index) => {
                const row = document.createElement('tr');
                row.style.cssText = `
                    border-bottom: 1px solid #eee;
                    transition: background-color 0.2s ease;
                    ${item.highlight ? 'background-color: #fff3cd;' : ''}
                `;
                row.onmouseover = () => row.style.backgroundColor = '#f8f9fa';
                row.onmouseout = () => row.style.backgroundColor = item.highlight ? '#fff3cd' : 'transparent';
                
                const profitColor = getProfitColor(item.profit);
                const profitRate = item.profitRate ? `${item.profitRate}%` : 'N/A';
                
                row.innerHTML = `
                    <td style="padding: 10px 8px; font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.itemName}</td>
                    <td style="padding: 10px 8px; text-align: right; color: #666;">${formatNumber(item.mrkt)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${formatNumber(item.price)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-family: monospace; font-size: 12px;">${item.topriceId}</td>
                    <td style="padding: 10px 8px; text-align: right;">${formatNumber(item.quantity)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${formatNumber(item.price)}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: ${profitColor};">${item.profit}</td>
                    <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: ${profitColor};">${profitRate}</td>
                    <td style="padding: 10px 8px; text-align: right; color: #666;">${item.top2Price}</td>
                    <td style="padding: 10px 8px; text-align: right; color: #666;">${item.top3Price}</td>
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
            refreshButton.textContent = '🔄 刷新数据';
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
                displayContainer.remove();
                extractItemData();
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
            // 使面板可拖动
            makeDraggable(displayContainer);
            document.body.appendChild(displayContainer);
        }
    }
    
    
    // 使元素可拖动
    function makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        element.style.cursor = 'move';
        
        element.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === element || e.target.parentElement === element) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
                element.style.left = '10px';
                element.style.top = '10px';
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
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
// ==UserScript==
// @name         自动高亮低价商品
// @namespace    https://github.com/pakeh2866
// @version      0.1
// @description  w3b中低于某个价格，利润在x%以上的高亮显示
// @author       pakeh
// @match        https://weav3r.dev/favorites
// @icon         https://www.google.com/s2/favicons?sz=64&domain=centurygames.cn
// @grant        none
// @lincense     MIT
// ==/UserScript==

(function() {
    'use strict';

    // 创建设置按钮元素
    function createSettingButton() {
        const settingButton = document.createElement('button');
        settingButton.innerHTML = '设置';
        
        // 设置按钮样式，使用与目标按钮相似的class
        settingButton.className = 'p-2 rounded-md transition-colors relative';
        
        // 添加额外的样式
        settingButton.style.marginRight = '5px'; // 与右侧按钮保持间距
        settingButton.style.cursor = 'pointer'; // 确保有鼠标指针效果
        settingButton.style.minWidth = '40px'; // 确保按钮有足够的宽度
        
        // 设置按钮的点击事件
        settingButton.addEventListener('click', function() {
            // 这里可以添加设置功能的逻辑
            alert('设置按钮被点击了！');
            // 后续可以替换为实际的设置面板或功能
        });
        
        return settingButton;
    }
    
    // 插入设置按钮到目标位置
    function insertSettingButton() {
        // 查找具有指定class的按钮
        const targetButtons = document.querySelectorAll('.p-2.rounded-md.transition-colors.relative');
        console.log('找到目标按钮数量:', targetButtons.length);
        
        // 如果找到了目标按钮，则在第一个按钮的左侧添加设置按钮
        if (targetButtons.length > 0) {
            const targetButton = targetButtons[0];
            console.log('目标按钮:', targetButton);
            
            // 检查是否已经存在设置按钮
            const existingSettingButton = targetButton.parentNode.querySelector('[data-setting-button]');
            if (existingSettingButton) {
                console.log('设置按钮已存在，无需重复添加');
                return;
            }
            
            const settingButton = createSettingButton();
            settingButton.setAttribute('data-setting-button', 'true'); // 标记这是我们的设置按钮
            
            targetButton.parentNode.insertBefore(settingButton, targetButton);
            console.log('设置按钮已插入');
        } else {
            // 如果没有找到目标按钮，则将设置按钮添加到页面的固定位置
            const existingFixedButton = document.querySelector('[data-setting-button-fixed]');
            if (existingFixedButton) {
                console.log('固定位置的设置按钮已存在，无需重复添加');
                return;
            }
            
            const settingButton = createSettingButton();
            settingButton.setAttribute('data-setting-button-fixed', 'true'); // 标记这是固定位置的设置按钮
            settingButton.style.position = 'fixed';
            settingButton.style.top = '10px';
            settingButton.style.right = '10px';
            settingButton.style.zIndex = '9999';
            
            document.body.appendChild(settingButton);
            console.log('固定位置的设置按钮已添加');
        }
    }
    
    // 页面加载完成后执行
    window.addEventListener('load', function() {
        console.log('页面加载完成，准备插入设置按钮');
        insertSettingButton();
    });
    
    // 使用MutationObserver监听DOM变化，确保按钮不会因为页面重绘而丢失
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // 检查是否有节点添加，如果有则重新尝试插入按钮
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // 延迟执行以确保DOM完全更新
                setTimeout(insertSettingButton, 100);
            }
        });
    });
    
    // 开始观察document.body的变化
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 页面加载后也立即执行一次
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertSettingButton);
    } else {
        // DOM已经加载完成
        insertSettingButton();
    }
    
    // 新增功能：查找具有指定CSS类的元素并提取信息
    function extractItemData() {
        // 查找所有具有指定class的元素
        const elements = document.querySelectorAll('.border.rounded-lg.p-2.overflow-auto');
        console.log('找到具有指定class的元素数量:', elements.length);
        
        // 存储提取的数据
        const extractedData = [];
        
        // 遍历每个元素
        elements.forEach((element, index) => {
            try {
                // 提取物品名称（在具有flex-1 min-w-0类的元素中）
                let itemName = 'N/A';
                const nameElement = element.querySelector('.flex-1.min-w-0');
                if (nameElement) {
                    itemName = nameElement.textContent.trim();
                }
                
                // 提取Mrkt值（假设在带有"data-mrkt"属性的元素中或特定格式的文本中）
                let mrkt = 'N/A';
                const mrktElement = element.querySelector('[data-mrkt]');
                if (mrktElement) {
                    mrkt = mrktElement.textContent.trim();
                } else {
                    // 尝试从文本中查找Mrkt值
                    const textContent = element.textContent;
                    const mrktMatch = textContent.match(/Mrkt[:：]?\s*([^\n\r]+)/i);
                    if (mrktMatch) {
                        mrkt = mrktMatch[1].trim();
                    }
                }
                
                // 提取Top 3中的Q P值
                const qpValues = [];
                // 假设Q P值在带有特定类名的元素中
                const qpElements = element.querySelectorAll('[class*="qp"], [data-qp]');
                qpElements.forEach((qpElem, i) => {
                    if (i < 3) { // 只取前3个
                        qpValues.push(qpElem.textContent.trim());
                    }
                });
                
                // 如果没找到特定元素，尝试从文本中提取
                if (qpValues.length === 0) {
                    const textContent = element.textContent;
                    // 匹配类似 "Q1: 123, P1: 456" 或 "QP1: 789" 的模式
                    const qpMatches = textContent.matchAll(/(?:Q|P|QP)\d*[:：]?\s*([\d,]+\.?\d*)/gi);
                    for (const match of qpMatches) {
                        if (qpValues.length < 3) {
                            qpValues.push(match[1]);
                        }
                    }
                }
                
                // 补充缺失的值
                while (qpValues.length < 3) {
                    qpValues.push('N/A');
                }
                
                // 存储提取的数据
                extractedData.push({
                    index: index + 1,
                    itemName: itemName,
                    mrkt: mrkt,
                    qp1: qpValues[0],
                    qp2: qpValues[1],
                    qp3: qpValues[2]
                });
                
                console.log(`元素 ${index + 1}:`, { itemName, mrkt, qpValues });
            } catch (error) {
                console.error(`处理元素 ${index + 1} 时出错:`, error);
            }
        });
        
        // 输出提取的数据到控制台
        console.log('提取的所有数据:', extractedData);
        
        // 可选：在页面上显示结果
        displayExtractedData(extractedData);
        
        return extractedData;
    }
    
    // 显示提取数据的函数
    function displayExtractedData(data) {
        // 移除之前的结果显示（如果有的话）
        const existingDisplay = document.getElementById('item-data-display');
        if (existingDisplay) {
            existingDisplay.remove();
        }
        
        // 创建显示容器
        const displayContainer = document.createElement('div');
        displayContainer.id = 'item-data-display';
        displayContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 400px;
            max-height: 80vh;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 15px;
            z-index: 10000;
            font-size: 14px;
            overflow-y: auto;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        
        // 添加标题
        const header = document.createElement('h2');
        header.textContent = '提取的物品数据';
        header.style.cssText = 'margin: 0 0 10px 0; color: #333;';
        displayContainer.appendChild(header);
        
        // 添加关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #999;
        `;
        closeButton.onclick = () => displayContainer.remove();
        displayContainer.appendChild(closeButton);
        
        // 如果有数据，创建表格显示
        if (data.length > 0) {
            const table = document.createElement('table');
            table.style.cssText = 'width: 100%; border-collapse: collapse;';
            
            // 表头
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">物品</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Mrkt</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Q P 1</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Q P 2</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Q P 3</th>
                </tr>
            `;
            table.appendChild(thead);
            
            // 表体
            const tbody = document.createElement('tbody');
            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.itemName}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.mrkt}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.qp1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.qp2}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.qp3}</td>
                `;
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            
            displayContainer.appendChild(table);
        } else {
            const noData = document.createElement('p');
            noData.textContent = '未找到具有指定class的元素。';
            noData.style.color = '#666';
            displayContainer.appendChild(noData);
        }
        
        // 添加刷新按钮
        const refreshButton = document.createElement('button');
        refreshButton.textContent = '刷新数据';
        refreshButton.style.cssText = `
            margin-top: 10px;
            padding: 8px 15px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        refreshButton.onclick = () => {
            displayContainer.remove();
            extractItemData();
        };
        displayContainer.appendChild(refreshButton);
        
        // 添加到页面
        document.body.appendChild(displayContainer);
    }
    
    // 定期执行提取数据的函数
    setInterval(extractItemData, 5000); // 每5秒执行一次
    
    // 页面加载完成后立即执行一次
    window.addEventListener('load', extractItemData);
    
    // DOM内容加载完成后也执行一次
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', extractItemData);
    } else {
        // DOM已经加载完成
        extractItemData();
    }
})();
// ==UserScript==
// @name         bazaar页面内容高亮显示(配合w3b脚本)
// @namespace    https://github.com/pakeh2866
// @version      1.0
// @description  读取GM存储中的物品名称数据，并在页面中高亮显示匹配的字眼
// @author       pakeh[3973672]
// @match        https://www.torn.com/bazaar.php?userId=*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 高亮样式配置
    const HIGHLIGHT_CONFIG = {
        backgroundColor: '#ffeb3b',  // 黄色背景
        color: '#000',               // 黑色文字
        fontWeight: 'bold',          // 粗体
        padding: '2px 4px',          // 内边距
        borderRadius: '3px',         // 圆角
        transition: 'all 0.3s ease'  // 过渡效果
    };

    // 添加高亮样式到页面
    function addHighlightStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .gm-highlight {
                background-color: ${HIGHLIGHT_CONFIG.backgroundColor} !important;
                color: ${HIGHLIGHT_CONFIG.color} !important;
                font-weight: ${HIGHLIGHT_CONFIG.fontWeight} !important;
                padding: ${HIGHLIGHT_CONFIG.padding} !important;
                border-radius: ${HIGHLIGHT_CONFIG.borderRadius} !important;
                transition: ${HIGHLIGHT_CONFIG.transition} !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
                position: relative !important;
                z-index: 1000 !important;
            }
            
            .gm-highlight:hover {
                background-color: #ffc107 !important;
                transform: scale(1.05) !important;
            }
            
            /* 防止嵌套高亮 */
            .gm-highlight .gm-highlight {
                background-color: transparent !important;
                color: inherit !important;
                font-weight: inherit !important;
                padding: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
            }
            
            /* 高亮状态显示面板 */
            .highlight-status-panel {
                position: fixed;
                top: 50%;
                right: 10px;
                transform: translateY(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 10000;
                min-width: 200px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                backdrop-filter: blur(5px);
            }
            
            .highlight-status-panel .status-title {
                font-weight: bold;
                margin-bottom: 8px;
                color: #ffeb3b;
            }
            
            .highlight-status-panel .status-text {
                word-break: break-all;
                line-height: 1.4;
            }
            
            .highlight-status-panel .status-time {
                font-size: 12px;
                color: #ccc;
                margin-top: 8px;
            }
            
            .highlight-status-panel .no-highlight {
                color: #999;
                font-style: italic;
            }
        `;
        document.head.appendChild(style);
    }

    // 清除之前的高亮
    function clearPreviousHighlights() {
        const highlightedElements = document.querySelectorAll('.gm-highlight');
        highlightedElements.forEach(element => {
            const parent = element.parentNode;
            if (parent) {
                // 将高亮元素的内容替换回原始文本
                parent.replaceChild(document.createTextNode(element.textContent), element);
                // 合并相邻的文本节点
                parent.normalize();
            }
        });
    }

    // 高亮文本节点中的匹配内容
    function highlightTextNodes(node, searchText) {
        if (!node || !searchText || searchText.trim() === '') return;
        
        // 跳过脚本、样式等特殊元素
        if (node.nodeType === 1) {
            const tagName = node.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'iframe', 'object', 'embed'].includes(tagName)) {
                return;
            }
            
            // 跳过已经高亮的元素
            if (node.classList && node.classList.contains('gm-highlight')) {
                return;
            }
        }
        
        // 处理文本节点
        if (node.nodeType === 3) {
            const text = node.textContent;
            if (text.toLowerCase().includes(searchText.toLowerCase())) {
                console.log('找到匹配的文本节点:', text.substring(0, 50) + '...');
                const regex = new RegExp(`(${searchText})`, 'gi');
                const matches = text.match(regex);
                
                if (matches) {
                    console.log('匹配到的内容:', matches);
                    const fragment = document.createDocumentFragment();
                    let lastIndex = 0;
                    
                    text.replace(regex, (match, p1, offset) => {
                        // 添加匹配前的文本
                        if (offset > lastIndex) {
                            fragment.appendChild(document.createTextNode(text.substring(lastIndex, offset)));
                        }
                        
                        // 创建高亮元素
                        const highlightSpan = document.createElement('span');
                        highlightSpan.className = 'gm-highlight';
                        highlightSpan.textContent = match;
                        fragment.appendChild(highlightSpan);
                        
                        lastIndex = offset + match.length;
                    });
                    
                    // 添加剩余的文本
                    if (lastIndex < text.length) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                    }
                    
                    // 替换原始文本节点
                    if (fragment.childNodes.length > 0) {
                        node.parentNode.replaceChild(fragment, node);
                        console.log('已高亮文本节点');
                    }
                }
            }
        } else if (node.nodeType === 1 && node.childNodes) {
            // 递归处理子节点
            const childNodes = Array.from(node.childNodes);
            childNodes.forEach(child => {
                highlightTextNodes(child, searchText);
            });
        }
    }

    // 高亮页面中匹配的文本
    function highlightPageContent(itemName) {
        if (!itemName || itemName.trim() === '') return;
        
        console.log('开始高亮页面内容:', itemName);
        console.log('当前页面URL:', window.location.href);
        
        // 清除之前的高亮
        clearPreviousHighlights();
        
        // 从body开始递归高亮文本
        if (document.body) {
            console.log('开始遍历DOM树进行高亮...');
            highlightTextNodes(document.body, itemName);
            
            // 检查高亮结果
            setTimeout(() => {
                const highlightedElements = document.querySelectorAll('.gm-highlight');
                console.log('高亮完成，找到的高亮元素数量:', highlightedElements.length);
                if (highlightedElements.length > 0) {
                    console.log('高亮元素示例:', highlightedElements[0]);
                }
            }, 100);
        } else {
            console.log('页面body不存在，无法进行高亮');
        }
        
        console.log('高亮处理完成:', itemName);
    }

    // 创建或更新高亮状态显示面板
    function updateStatusPanel(itemName, expireTime) {
        // 查找现有的状态面板
        let statusPanel = document.getElementById('highlight-status-panel');
        
        // 如果不存在，创建一个新的
        if (!statusPanel) {
            statusPanel = document.createElement('div');
            statusPanel.id = 'highlight-status-panel';
            statusPanel.className = 'highlight-status-panel';
            document.body.appendChild(statusPanel);
        }
        
        // 更新面板内容
        if (itemName && itemName.trim() !== '') {
            const remainingTime = expireTime ? Math.max(0, Math.round((expireTime - Date.now()) / 1000)) : 0;
            statusPanel.innerHTML = `
                <div class="status-title">当前高亮文本：</div>
                <div class="status-text">${itemName}</div>
                <div class="status-time">剩余时间：${remainingTime}秒</div>
            `;
        } else {
            statusPanel.innerHTML = `
                <div class="status-title">当前高亮文本：</div>
                <div class="no-highlight">无高亮内容</div>
            `;
        }
    }

    // 检查GM存储中的高亮数据
    function checkHighlightData() {
        try {
            console.log('开始检查GM存储中的高亮数据...');
            const highlightData = GM_getValue('highlightItem', null);
            console.log('读取到的GM存储数据:', highlightData);
            
            if (highlightData) {
                const currentTime = Date.now();
                console.log('当前时间:', currentTime, '数据过期时间:', highlightData.expireTime);
                
                // 检查数据是否过期
                if (highlightData.expireTime && currentTime < highlightData.expireTime) {
                    // 数据未过期，执行高亮
                    if (highlightData.itemName && highlightData.itemName.trim() !== '') {
                        console.log('数据未过期，开始高亮物品:', highlightData.itemName);
                        highlightPageContent(highlightData.itemName);
                        // 更新状态面板
                        updateStatusPanel(highlightData.itemName, highlightData.expireTime);
                    } else {
                        console.log('物品名称为空，跳过高亮');
                        updateStatusPanel('', null);
                    }
                } else {
                    // 数据已过期，清除高亮并删除存储
                    console.log('数据已过期，清除高亮并删除存储');
                    clearPreviousHighlights();
                    if (typeof GM_deleteValue !== 'undefined') {
                        GM_deleteValue('highlightItem');
                        console.log('已删除过期的GM存储数据');
                    }
                    // 更新状态面板
                    updateStatusPanel('', null);
                }
            } else {
                // 没有高亮数据，清除之前的高亮
                console.log('没有找到高亮数据，清除之前的高亮');
                clearPreviousHighlights();
                // 更新状态面板
                updateStatusPanel('', null);
            }
        } catch (error) {
            console.error('检查高亮数据时出错:', error);
        }
    }

    // 初始化脚本
    function init() {
        console.log('页面内容高亮显示脚本已启动');
        
        // 添加高亮样式
        addHighlightStyles();
        
        // 创建初始状态面板
        updateStatusPanel('', null);
        
        // 立即检查一次高亮数据
        checkHighlightData();
        
        // 每5秒检查一次高亮数据
        setInterval(checkHighlightData, 5000);
        
        // 每秒更新一次状态面板的剩余时间
        setInterval(() => {
            const highlightData = GM_getValue('highlightItem', null);
            if (highlightData && highlightData.expireTime && highlightData.itemName) {
                const currentTime = Date.now();
                if (currentTime < highlightData.expireTime) {
                    updateStatusPanel(highlightData.itemName, highlightData.expireTime);
                }
            }
        }, 1000);
        
        // 监听页面变化，确保动态加载的内容也能被高亮
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 页面内容发生变化时，重新检查高亮数据
                    setTimeout(checkHighlightData, 100);
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 添加控制台命令，方便调试
    window.clearHighlights = function() {
        clearPreviousHighlights();
        console.log('已清除所有高亮');
    };

    window.checkHighlightData = checkHighlightData;
    
    // 添加测试函数，用于手动测试高亮功能
    window.testHighlight = function(itemName) {
        if (!itemName) {
            itemName = 'Xanax'; // 默认测试物品名称
        }
        
        console.log('手动测试高亮功能，物品名称:', itemName);
        
        // 创建测试数据
        const testData = {
            itemName: itemName,
            expireTime: Date.now() + 15000 // 15秒后过期
        };
        
        // 保存到GM存储
        if (typeof GM_setValue !== 'undefined') {
            GM_setValue('highlightItem', testData);
            console.log('已保存测试数据到GM存储:', testData);
            
            // 立即检查高亮数据
            checkHighlightData();
        } else {
            console.error('GM_setValue 不可用，无法保存测试数据');
        }
    };
    
    // 添加查看GM存储数据的函数
    window.showGMData = function() {
        try {
            const data = GM_getValue('highlightItem', null);
            console.log('当前GM存储中的highlightItem数据:', data);
            
            if (data) {
                const currentTime = Date.now();
                const remainingTime = data.expireTime ? data.expireTime - currentTime : 0;
                console.log('剩余有效时间(毫秒):', remainingTime);
                console.log('剩余有效时间(秒):', Math.round(remainingTime / 1000));
            }
        } catch (error) {
            console.error('读取GM存储数据时出错:', error);
        }
    };
})();
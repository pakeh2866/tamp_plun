// ==UserScript==
// @name         Torn物品高亮显示
// @namespace    https://github.com/pakeh2866
// @version      0.1
// @description  读取GM存储中的物品名称并高亮显示匹配的字段
// @author       pakeh[3973672]
// @match        https://www.torn.com/*
// @grant        GM_getValue
// @grant        GM_deleteValue
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 高亮样式配置
    const HIGHLIGHT_CONFIG = {
        backgroundColor: '#ffff00', // 黄色背景
        color: '#000000',           // 黑色文字
        fontWeight: 'bold',         // 加粗
        padding: '2px 4px',         // 内边距
        borderRadius: '3px',        // 圆角
        transition: 'all 0.3s ease' // 过渡效果
    };

    // 检查并清理过期的存储数据
    function cleanExpiredData() {
        try {
            const highlightData = GM_getValue('highlightItem', null);
            if (highlightData && highlightData.expireTime) {
                if (Date.now() > highlightData.expireTime) {
                    // 数据已过期，删除它
                    GM_deleteValue('highlightItem');
                    console.log('已清理过期的物品高亮数据');
                    return null;
                }
                return highlightData;
            }
        } catch (error) {
            console.error('检查过期数据时出错:', error);
        }
        return null;
    }

    // 高亮显示匹配的文本
    function highlightMatchingText(itemName) {
        if (!itemName) return;

        // 移除之前的高亮效果
        removePreviousHighlights();

        // 查找所有文本节点
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            // 跳过脚本和样式标签内的文本
            const parentTag = node.parentElement.tagName.toLowerCase();
            if (parentTag !== 'script' && parentTag !== 'style') {
                textNodes.push(node);
            }
        }

        // 检查每个文本节点是否包含物品名称
        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            if (text.toLowerCase().includes(itemName.toLowerCase())) {
                // 创建高亮元素
                const span = document.createElement('span');
                span.style.cssText = `
                    background-color: ${HIGHLIGHT_CONFIG.backgroundColor};
                    color: ${HIGHLIGHT_CONFIG.color};
                    font-weight: ${HIGHLIGHT_CONFIG.fontWeight};
                    padding: ${HIGHLIGHT_CONFIG.padding};
                    border-radius: ${HIGHLIGHT_CONFIG.borderRadius};
                    transition: ${HIGHLIGHT_CONFIG.transition};
                `;
                span.className = 'torn-item-highlight';
                
                // 替换匹配的文本
                const regex = new RegExp(`(${itemName})`, 'gi');
                const newHTML = text.replace(regex, '<span class="torn-item-highlight-temp">$1</span>');
                
                // 创建临时容器来处理HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = newHTML;
                
                // 替换原始文本节点
                const parent = textNode.parentNode;
                const newNodes = Array.from(tempDiv.childNodes);
                
                newNodes.forEach(newNode => {
                    if (newNode.nodeType === Node.ELEMENT_NODE && newNode.className === 'torn-item-highlight-temp') {
                        // 应用高亮样式
                        newNode.style.cssText = span.style.cssText;
                        newNode.className = 'torn-item-highlight';
                    }
                    parent.insertBefore(newNode, textNode);
                });
                
                parent.removeChild(textNode);
            }
        });

        console.log(`已高亮显示物品: ${itemName}`);
    }

    // 移除之前的高亮效果
    function removePreviousHighlights() {
        const highlightedElements = document.querySelectorAll('.torn-item-highlight');
        highlightedElements.forEach(element => {
            const parent = element.parentNode;
            const textNode = document.createTextNode(element.textContent);
            parent.replaceChild(textNode, element);
        });
    }

    // 主循环函数
    function checkAndHighlight() {
        try {
            const highlightData = cleanExpiredData();
            if (highlightData && highlightData.itemName) {
                highlightMatchingText(highlightData.itemName);
            } else {
                // 没有有效数据，移除所有高亮
                removePreviousHighlights();
            }
        } catch (error) {
            console.error('检查和高亮过程中出错:', error);
        }
    }

    // 初始化
    console.log('物品高亮脚本已启动');
    
    // 立即执行一次
    checkAndHighlight();
    
    // 每0.5秒检查一次
    setInterval(checkAndHighlight, 500);

    // 页面可见性变化时也检查一次（从其他标签页切换回来时）
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkAndHighlight();
        }
    });

})();
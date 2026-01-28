// ==UserScript==
// @name         Tornw3b复制目标ID
// @namespace    https://github.com/pakeh2866
// @version      0.1
// @description  w3b中页面中的目标ID，一键复制
// @author       pakeh[3973672]  如果对你有那么一点点帮助，可以send我一个Xan
// @match        https://weav3r.dev/item/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @lincense     MIT
// @grant        GM_setClipboard
// ==/UserScript==




(function() {
    'use strict';

    // 等待页面加载完成
    window.addEventListener('load', function() {
        // 创建复制按钮
        function createCopyButton() {
            const button = document.createElement('button');
            button.textContent = '复制ID';
            button.style.position = 'fixed';
            button.style.top = '10px';
            button.style.right = '10px';
            button.style.zIndex = '9999';
            button.style.padding = '8px 12px';
            button.style.backgroundColor = '#4CAF50';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '14px';
            button.style.fontWeight = 'bold';
            
            // 添加悬停效果
            button.addEventListener('mouseover', function() {
                button.style.backgroundColor = '#45a049';
            });
            
            button.addEventListener('mouseout', function() {
                button.style.backgroundColor = '#4CAF50';
            });
            
            // 点击事件
            button.addEventListener('click', copyUserIds);
            
            document.body.appendChild(button);
            return button;
        }

        // 获取用户ID并复制到剪贴板
        function copyUserIds() {
            try {
                // 查找所有包含用户ID的链接
                const links = document.querySelectorAll('.flex.items-center a[href*="userId"]');
                const userIds = [];
                
                // 提取用户ID
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    const match = href.match(/userId=(\d+)/);
                    if (match) {
                        userIds.push(match[1]);
                    }
                });
                
                // 获取前30个ID
                const limitedIds = userIds.slice(0, 30);
                
                if (limitedIds.length === 0) {
                    showNotification('未找到任何用户ID');
                    return;
                }
                
                // 将ID用换行符连接
                const idsText = limitedIds.join('\n');
                
                // 复制到剪贴板
                GM_setClipboard(idsText);
                
                // 显示成功通知
                showNotification(`已复制 ${limitedIds.length} 个用户ID到剪贴板`);
                
            } catch (error) {
                console.error('复制用户ID时出错:', error);
                showNotification('复制失败，请查看控制台');
            }
        }

        // 显示通知
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.position = 'fixed';
            notification.style.top = '50px';
            notification.style.right = '10px';
            notification.style.zIndex = '10000';
            notification.style.padding = '10px 15px';
            notification.style.backgroundColor = '#333';
            notification.style.color = 'white';
            notification.style.borderRadius = '4px';
            notification.style.fontSize = '14px';
            notification.style.maxWidth = '300px';
            notification.style.wordWrap = 'break-word';
            
            document.body.appendChild(notification);
            
            // 3秒后自动移除通知
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }

        // 创建并添加按钮
        createCopyButton();
    });

})();
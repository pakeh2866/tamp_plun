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
})();
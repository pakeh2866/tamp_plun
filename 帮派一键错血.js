// ==UserScript==
// @name         帮派存款助手（保留10万，无API）
// @version      1.15
// @description  在帮派军械库页面添加一个按钮，通过3次点击计算、设置文本输入并提交存款（手动启动）
// @author       AeC3
// @match        https://www.torn.com/factions.php?step=your*
// @license      MIT
// @namespace AeC3
// @downloadURL https://update.greasyfork.org/scripts/550392/Faction%20Deposit%20Helper%20%28Keep%20100k%2C%20No%20API%29.user.js
// @updateURL https://update.greasyfork.org/scripts/550392/Faction%20Deposit%20Helper%20%28Keep%20100k%2C%20No%20API%29.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // 配置
    const KEEP_ON_HAND = 350000; // 保留手头金额
    const MAX_CLICKS = 3; // 每次存款周期的最大点击次数
    let clickCount = 0;
    let depositAmount = 0;

    // 从文本输入的data-money属性中提取现金余额的函数
    function getCashBalance() {
        const textInput = document.querySelector('input.amount.input-money[type="text"]');
        if (!textInput || !textInput.dataset.money) {
            return 0;
        }
        // 提取数字（例如："118,300" -> 118300）
        const cashText = textInput.dataset.money.replace(/[^0-9]/g, '');
        return parseInt(cashText, 10) || 0;
    }

    // 创建按钮（在军械库页面）
    if (window.location.pathname.includes('factions.php') && window.location.search.includes('step=your')) {
        const button = document.createElement('button');
        button.id = 'depositHelperBtn';
        button.innerHTML = `存款 (0/${MAX_CLICKS})`;
        button.style.cssText = `
            position: fixed; top: 50px; right: 10px; z-index: 9999;
            background: #007BFF; color: white; padding: 10px 15px; border: none;
            border-radius: 5px; cursor: pointer; font-size: 14px;
        `;
        button.onclick = handleClick;
        document.body.appendChild(button);

        function handleClick() {
            clickCount++;
            button.innerHTML = `存款 (${clickCount}/${MAX_CLICKS})`;

            if (clickCount === 1) {
                // 第一次点击：计算并设置文本输入
                const cash = getCashBalance();
                depositAmount = Math.max(0, cash - KEEP_ON_HAND);
                if (depositAmount <= 0) {
                    clickCount = 0; // 重置
                    button.innerHTML = `存款 (0/${MAX_CLICKS})`;
                    return;
                }

                // 查找文本输入框
                const textInput = document.querySelector('input.amount.input-money[type="text"]');
                if (!textInput) {
                    clickCount = 0; // 重置
                    button.innerHTML = `存款 (0/${MAX_CLICKS})`;
                    return;
                }
                // 设置文本输入值并触发输入事件
                textInput.value = depositAmount;
                textInput.focus();
                const inputEvent = new Event('input', { bubbles: true });
                textInput.dispatchEvent(inputEvent);

            } else if (clickCount === 2) {
                // 第二次点击：点击精确文本的存款按钮
                const buttons = document.querySelectorAll('button.torn-btn');
                let depositButton = null;
                buttons.forEach(btn => {
                    if (btn.textContent.trim() === 'DEPOSIT MONEY') {
                        depositButton = btn;
                    }
                });
                if (!depositButton || depositButton.disabled) {
                    clickCount = 0; // 重置
                    button.innerHTML = `存款 (0/${MAX_CLICKS})`;
                    return;
                }
                depositButton.click();

            } else if (clickCount === 3) {
                // 第三次点击：点击确认是
                const confirmButton = document.querySelector('a.yes.bold.t-blue.h.c-pointer');
                if (!confirmButton) {
                    clickCount = 0; // 重置
                    button.innerHTML = `存款 (0/${MAX_CLICKS})`;
                    return;
                }
                confirmButton.click();
                clickCount = 0; // 为下一个周期重置
                button.innerHTML = `存款 (0/${MAX_CLICKS})`;
            }
        }
    }
})();
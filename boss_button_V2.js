// ==UserScript==
// @name         boss Button V1
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Automatically click a button on the page
// @author       pakeh
// @match        https*://www.zhipin.com/*
// @include      https*:/www.zhipin.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 创建一个按钮元素
    const button = document.createElement('button');
    button.innerHTML = '一键邀约';

    // 设置按钮样式
    button.style.color = 'black';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.padding = '10px 20px';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.position = 'fixed';
    button.style.top = '250px';
    button.style.left = '290px';
    button.style.zIndex = '9999';

    // 将按钮添加到页面上
    const body = document.getElementsByTagName('body')[0];
    body.appendChild(button);

    // 添加按钮的点击事件
    button.addEventListener('click', () => {
        const listConversationOperate = document.getElementsByClassName('conversation-operate')
        if (!listConversationOperate.length) {
            return;
        }
        const btnListChangYongYu = listConversationOperate[0].getElementsByClassName('changyongyu');
        if (!btnListChangYongYu.length) {
            return;
        }
        const otherButton = btnListChangYongYu[0]

        setTimeout(() => {
            console.log(otherButton.textContent);
            otherButton.click()
        }, 400)
        //第二步点击
        setTimeout(() => {
            const phraseContent_find = document.getElementsByClassName('phrase-content')
            console.log('phraseContent_find:', phraseContent_find)
            console.log('phraseContent_find:', phraseContent_find.length)
            if (!phraseContent_find.length) {
                return;
            }
            const btn_send = phraseContent_find[0].getElementsByClassName('phrase-send');
            console.log('btn_send:', btn_send)
            const secondButton = btn_send[0]
            setTimeout(() => {
                console.log(secondButton.textContent);
                secondButton.click()
            }, 400)
        }, 400)
    });
})();

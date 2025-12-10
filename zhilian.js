// ==UserScript==
// @name         智联一键list勾选
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  暂时省略
// @author       Pakeh
// @match        https://rd6.zhaopin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=545c.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    //构建触发按键
    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { // 以回车键为例
            console.log('按下ArrowRight')
            button_list();
        } else if (e.key === 'ArrowLeft') {
            console.log('按下ArrowLeft')
        }
    });
    //检查list元素
    function button_list() {
        const list_search = document.getElementsByClassName('group-mismatch__list')
        console.log('第一阶段的值', list_search)
        if (!list_search) {
            return;
        };
        const check_box = list_search[0].getElementsByClassName('km-icon sati sati-check')
        console.log('第二阶段的值', check_box);
        const j = check_box.length
        if (!check_box) {
            return;
        };
        for (let i = 1; i <= j; i++) {
            check_box[i].click();
        }
        console.log('新的checkbox', check_box);
    }

    //代码结尾
})();


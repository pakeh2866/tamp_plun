// ==UserScript==
// @name         OA一键登录
// @namespace    http://tampermonkey.net/
// @version      2024-01-09
// @description  try to take over the world!
// @author       You
// @match        http://oa.stip.ac.cn:8080/login.jsp
// @icon         https://www.google.com/s2/favicons?sz=64&domain=stip.ac.cn
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    if (document.getElementsByClassName('lui_login_input_div') == null) {
        //没有找到表示登录了,不再执行后续代码
     return;
    }
    //未登录,执行登录代码
    console.log('找到了，开始执行后续代码')
    const login_name = document.getElementsByClassName("lui_login_input_username");
    console.log(login_name)
    login_name[0].value = 'lushan'
    const login_pass = document.getElementsByClassName("lui_login_input_password");
    console.log(login_pass);
    login_pass[0].value = '123456'
    setTimeout(() => {
        console.log('开始点击')
        document.getElementsByName('btn_submit')[0].click();
    }, 50)

})();
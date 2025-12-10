// ==UserScript==
// @name         Boss直聘自动投递简历
// @namespace    your-namespace
// @version      1.5.0
// @description  自动投递简历的油猴脚本，包括统计投递数量、配置参数和输出日志功能。
// @match        https://www.zhipin.com/web/geek/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==
// 创建UI元素的函数
function createUIElement(elementType, attributes, parent) {
    const element = document.createElement(elementType);
    for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
    if (parent) {
        parent.appendChild(element);
    }
    return element;
}

// 创建悬浮UI容器
const container = createUIElement('div', {
    id: 'resume-delivery-ui',
    style: 'position: fixed; top: 50px; right: 10px; width: 310px; background-color: rgba(255, 255, 255, 0.8); padding: 10px; border: 1px solid #ccc; z-index: 9999;'
});


// 添加事件处理程序
let isDragging = false;
let initialX, initialY;

container.addEventListener('mousedown', (event) => {
    isDragging = true;
    initialX = event.clientX;
    initialY = event.clientY;
});

container.addEventListener('mousemove', (event) => {
    if (isDragging) {
        const deltaX = event.clientX - initialX;
        const deltaY = event.clientY - initialY;
        const rect = container.getBoundingClientRect();
        container.style.top = `${rect.top + deltaY}px`;
        container.style.left = `${rect.left + deltaX}px`;
        initialX = event.clientX;
        initialY = event.clientY;
    }
});

container.addEventListener('mouseup', () => {
    isDragging = false;
});



document.body.appendChild(container);

// 第一个部分：投递统计和开/关按钮
const statsContainer = createUIElement('div', { style: 'margin-bottom: 10px;' }, container);
const statsLabel = createUIElement('span', { style: 'margin-right: 5px;' }, statsContainer);
statsLabel.textContent = '当次投递数量：';

const statsCount = createUIElement('span', {}, statsContainer);
statsCount.textContent = '0';

const toggleButton = createUIElement('button', { style: 'margin-right: 5px;' }, container);
toggleButton.textContent = '开启投递';

// 创建保存配置按钮
const saveButton = createUIElement('button', {}, container);
saveButton.textContent = '保存配置';



// 启用/黑名单/白名单输入框
// 启用/黑名单/白名单按钮状态
const BUTTON_STATES = {
    DISABLED: '关闭',
    BLACKLIST: '黑名单',
    WHITELIST: '白名单'
};

// 创建启用/黑名单/白名单按钮
function createToggleButton(parent) {
    const button = createUIElement('button', { style: 'margin-right: 5px;' }, parent);
    button.textContent = BUTTON_STATES.DISABLED;
    return button;
}

// 创建关键词过滤部分容器
const keywordsContainer = createUIElement('div', { style: 'margin-top: 10px;' }, container);

// 第一组：公司名称关键词
const companyNameContainer = createUIElement('div', { style: 'display: flex; align-items: center; margin-bottom: 5px;' }, keywordsContainer);

const companyNameToggle = createToggleButton(companyNameContainer);
const companyNameInput = createUIElement('input', { type: 'text', placeholder: '公司名称关键词' }, companyNameContainer);

// 第二组：职位名称关键词
const jobTitleContainer = createUIElement('div', { style: 'display: flex; align-items: center; margin-bottom: 5px;' }, keywordsContainer);

const jobTitleToggle = createToggleButton(jobTitleContainer);
const jobTitleInput = createUIElement('input', { type: 'text', placeholder: '职位名称关键词' }, jobTitleContainer);

// 第三组：工作内容关键词
const jobDescriptionContainer = createUIElement('div', { style: 'display: flex; align-items: center; margin-bottom: 5px;' }, keywordsContainer);
const jobDescriptionToggle = createToggleButton(jobDescriptionContainer);
const jobDescriptionInput = createUIElement('input', { type: 'text', placeholder: '工作内容关键词' }, jobDescriptionContainer);

// 第四组：工作地点关键词
const jobLocationContainer = createUIElement('div', { style: 'display: flex; align-items: center; margin-bottom: 5px;' }, keywordsContainer);

const jobLocationToggle = createToggleButton(jobLocationContainer);
const jobLocationInput = createUIElement('input', { type: 'text', placeholder: '工作地点关键词' }, jobLocationContainer);

// 第五组：薪资阈值
const salaryThresholdContainer = createUIElement('div', { style: 'display: flex; align-items: center; margin-bottom: 5px;' }, keywordsContainer);

const salaryThresholdToggle = createToggleButton(salaryThresholdContainer);
const salaryThresholdInput = createUIElement('input', { type: 'text', placeholder: '薪资阈值' }, salaryThresholdContainer);





// 示例事件监听
companyNameToggle.addEventListener('click', () => {
    toggleButtonState(companyNameToggle);
});

jobTitleToggle.addEventListener('click', () => {
    toggleButtonState(jobTitleToggle);
});

jobDescriptionToggle.addEventListener('click', () => {
    toggleButtonState(jobDescriptionToggle);
});

jobLocationToggle.addEventListener('click', () => {
    toggleButtonState(jobLocationToggle);
});

salaryThresholdToggle.addEventListener('click', () => {
    toggleButtonState(salaryThresholdToggle);
});

// 示例按钮状态切换函数
function toggleButtonState(button) {
    const currentState = button.textContent;
    switch (currentState) {
        case BUTTON_STATES.DISABLED:
            button.textContent = BUTTON_STATES.BLACKLIST;
            break;
        case BUTTON_STATES.BLACKLIST:
            button.textContent = BUTTON_STATES.WHITELIST;
            break;
        case BUTTON_STATES.WHITELIST:
            button.textContent = BUTTON_STATES.DISABLED;
            break;
        default:
            break;
    }
}

const MAX_LOG_ENTRIES = 50; // 设定最大日志条数
// 第三个部分：日志输出
const logContainer = createUIElement('div', { style: 'max-height: 200px; overflow-y: scroll;' }, container);
//日志函数封装
function logMessage(message) {
    const logEntry = createUIElement('div', {}, logContainer);
    logEntry.textContent = message;
    // 滚动到最底部
    logContainer.scrollTop = logContainer.scrollHeight;

    //   // 控制日志数量，删除多余的日志
    //   const logEntries = logContainer.children;
    //   if (logEntries.length > MAX_LOG_ENTRIES) {
    // for (let i = logEntries.length - 1; i >= 0; i--) {
    //   logContainer.removeChild(logEntries[i]);
    // }
    //  }
}


// 保存配置
function saveConfig() {
    const config = {

        companyNameToggleState: companyNameToggle.textContent,
        companyNameKeywords: companyNameInput.value,
        jobTitleToggleState: jobTitleToggle.textContent,
        jobTitleKeywords: jobTitleInput.value,
        jobDescriptionToggleState: jobDescriptionToggle.textContent,
        jobDescriptionKeywords: jobDescriptionInput.value,
        jobLocationToggleState: jobLocationToggle.textContent,
        jobLocationKeywords: jobLocationInput.value,
        salaryThresholdToggleState: salaryThresholdToggle.textContent,
        salaryThresholdValue: salaryThresholdInput.value
    };
    GM_setValue('config', JSON.stringify(config));
    const logEntry = createUIElement('div', {}, logContainer);
    logEntry.textContent = '保存成功'

}
// 加载配置
function loadConfig() {
    const savedConfig = GM_getValue('config');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        companyNameToggle.textContent = config.companyNameToggleState;
        companyNameInput.value = config.companyNameKeywords;
        jobTitleToggle.textContent = config.jobTitleToggleState;
        jobTitleInput.value = config.jobTitleKeywords;
        jobDescriptionToggle.textContent = config.jobDescriptionToggleState;
        jobDescriptionInput.value = config.jobDescriptionKeywords;
        jobLocationToggle.textContent = config.jobLocationToggleState;
        jobLocationInput.value = config.jobLocationKeywords;
        salaryThresholdToggle.textContent = config.salaryThresholdToggleState;
        salaryThresholdInput.value = config.salaryThresholdValue;
    } else {
        logMessage('首次启动，参数填写可参照github示例~');
    }
}
loadConfig();

// 保存配置按钮事件监听
saveButton.addEventListener('click', () => {
    saveConfig();
});


let isDeliveryRunning = false; // 标志变量，用于表示投递状态

// 辅助函数，用于判断字符串是否包含列表中的任何一个关键词
function hasKeyword(text, keywords) {
    //不区分大小写
    const lowerText = text.toLowerCase(); // 将输入文本转换为小写
    const lowerKeywords = keywords.map(keyword => keyword.toLowerCase()); // 将关键字数组中的所有元素转换为小写

    for (var i = 0; i < lowerKeywords.length; i++) {
        if (lowerText.includes(lowerKeywords[i])) {
            return true;
        }
    }
    return false;
}


// 辅助函数，用于检查薪资要求
function checkSalaryWithRequirement(salaryStr, requirement, STATES) {
    const regex = /^(\d+)-(\d+)K(?:·(\d+)薪)?$/;
    const match = salaryStr.match(regex);
    if (STATES === BUTTON_STATES.DISABLED) return true;
    if (match) {
        const minSalary = parseInt(match[1]);
        const maxSalary = parseInt(match[2]);
        const withBonus = match[3] ? parseInt(match[3]) : 12; // 默认为12薪

        const salaryToCompare = STATES === BUTTON_STATES.WHITELIST ? maxSalary * (withBonus / 12) : minSalary * (withBonus / 12);
        return salaryToCompare >= requirement;
    }

}



// 自动点击下一页按钮
function nextPage() {
    var nextButton = document.querySelector(".ui-icon-arrow-right");
    if (nextButton.parentElement.classList.contains("disabled")) {
        toggleButton.textContent = '开启投递';
        isDeliveryRunning = false; // 将投递状态设置为停止
        logMessage("到达最后一页")
        return;
    } else nextButton.click();
}



// 定义关键词列表
var companyNameKeywords;
var jobTitleKeywords;
var jobDescriptionKeywords;
var jobLocationKeywords;
var salaryThreshold;
var activeTimeDescKeywords;
// 初始化关键词列表
function initKeywordsList() {
    companyNameKeywords = companyNameInput.value.split(',').map(keyword => keyword.trim());
    jobTitleKeywords = jobTitleInput.value.split(',').map(keyword => keyword.trim());
    jobDescriptionKeywords = jobDescriptionInput.value.split(',').map(keyword => keyword.trim());
    jobLocationKeywords = jobLocationInput.value.split(',').map(keyword => keyword.trim());
    salaryThreshold = salaryThresholdInput.value.split(',').map(keyword => keyword.trim());
    activeTimeDescKeywords = ["年", "月"]
}



function selectNeed() {
    var localPassedCount = 0;
    // 获取所有工作根元素
    var elements = document.getElementsByClassName('job-card-wrapper');

    function loopWithDelay(i) {

        if (i >= elements.length) { return; }
        var element = elements[i];

        // 从 <a> 标签中提取参数
        const aTag = element.querySelector("div.job-card-body.clearfix > a");
        const href = aTag.getAttribute("href");
        const urlParams = new URLSearchParams(href);

        // 提取参数值
        const lid = urlParams.get("lid");
        const securityId = urlParams.get("securityId");
        const sessionId = urlParams.get("sessionId");

        // 构建请求 URL
        const apiUrl = `https://www.zhipin.com/wapi/zpgeek/job/card.json?lid=${lid}&securityId=${securityId}&sessionId=${sessionId}`;

        // 发起 fetch 请求
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                // 从响应中提取所需的信息
                const jobCard = data.zpData.jobCard;
                const companyName = jobCard.brandName;
                const jobTitle = jobCard.jobName;
                const jobDescription = jobCard.postDescription;
                const salary = jobCard.salaryDesc;
                const jobLocation = jobCard.address;
                const activeTimeDesc = jobCard.activeTimeDesc;

                // 根据要求检查条件
                if (

                    !(companyNameToggle.textContent === BUTTON_STATES.BLACKLIST && hasKeyword(companyName, companyNameKeywords)) &&
                    !(companyNameToggle.textContent === BUTTON_STATES.WHITELIST && !hasKeyword(companyName, companyNameKeywords)) &&
                    !(jobTitleToggle.textContent === BUTTON_STATES.BLACKLIST && hasKeyword(jobTitle, jobTitleKeywords)) &&
                    !(jobTitleToggle.textContent === BUTTON_STATES.WHITELIST && !hasKeyword(jobTitle, jobTitleKeywords)) &&
                    !(jobDescriptionToggle.textContent === BUTTON_STATES.BLACKLIST && hasKeyword(jobDescription, jobDescriptionKeywords)) &&
                    !(jobDescriptionToggle.textContent === BUTTON_STATES.WHITELIST && !hasKeyword(jobDescription, jobDescriptionKeywords)) &&
                    !(jobLocationToggle.textContent === BUTTON_STATES.BLACKLIST && hasKeyword(jobLocation, jobLocationKeywords)) &&
                    !(jobLocationToggle.textContent === BUTTON_STATES.WHITELIST && !hasKeyword(jobLocation, jobLocationKeywords)) &&
                    checkSalaryWithRequirement(salary, parseInt(salaryThresholdInput.value), salaryThresholdToggle.textContent) &&
                    !hasKeyword(activeTimeDesc, activeTimeDescKeywords) &&
                    element.querySelector("div.job-card-body.clearfix > a > div.job-info.clearfix > a").textContent === "立即沟通" &&
                    isDeliveryRunning
                ) {
                    const friendAddUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?lid=${lid}&securityId=${securityId}&sessionId=${sessionId}`;
                    // 获取 cookie 中的 "geek_zp_token"
                    const zpToken = cookie.get("geek_zp_token");
                    // 发起 fetch 请求
                    fetch(friendAddUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "zp_token": zpToken
                        }
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.code == 1) {
                                logMessage("今日沟通人数已达上限，请明天再试");
                                toggleButton.textContent = '开启投递';
                                liveryRunning = false; // 将投递状态设置为停止
                                return;
                            }
                            logMessage('已投递：' + jobTitle)
                            statsCount.textContent = parseInt(statsCount.textContent) + 1;
                            localPassedCount++;
                        })
                        .catch(error => {
                            console.error("请求时出错:", error);
                        });
                }
            })
            .catch(error => {
                console.error("请求工作详情出错:", error);
            });
        //这里调投递延时 1000=1秒
        setTimeout(() => { loopWithDelay(i + 1) }, 2000);
    }
    loopWithDelay(0);
}


function submitResume() {

    selectNeed()
    setTimeout(function () {
        nextPage();
        if (!isDeliveryRunning) return;
        submitResume();
        //这里调翻页延时 1000=1秒
    }, 4000);
}


// 示例事件监听
toggleButton.addEventListener('click', () => {
    if (toggleButton.textContent === '开启投递') {
        isDeliveryRunning = true; // 将投递状态设置为运行中
        // applyFilter();
        initKeywordsList();
        submitResume();
        toggleButton.textContent = '关闭投递';
    } else {
        toggleButton.textContent = '开启投递';
        isDeliveryRunning = false; // 将投递状态设置为停止
    }
});
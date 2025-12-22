// ==UserScript==
// @name         PokerHistory
// @namespace    http://www.torn.com/
// @version      1.4
// @description  Records all Poker history and allows clearing it. Remembers panel size.
// @author       bot_7420 [2937420]
// @match        https://www.torn.com/page.php?sid=holdem*
// @run-at       document-body
// @grant        GM_addStyle
// @downloadURL https://update.greasyfork.org/scripts/473563/PokerHistory.user.js
// @updateURL https://update.greasyfork.org/scripts/473563/PokerHistory.meta.js
// ==/UserScript==

(function () {
    "use strict";

    let db = null;
    let messageBoxObserver = null;

    initIndexDB();

    window.onload = function () {
        initCSS();
        initControlPanel();
        initPokerObserver();
    };

    function initIndexDB() {
        const openRequest = indexedDB.open("scriptPokerHistoryDB", 1);
        openRequest.onupgradeneeded = function (e) {
            console.log("PokerHistory: initIndexDB open onupgradeneeded");
            db = e.target.result;
            if (!db.objectStoreNames.contains("messageStore")) {
                console.log("PokerHistory: initIndexDB open onupgradeneeded create store");
                const objectStore = db.createObjectStore("messageStore", { keyPath: "autoId", autoIncrement: true });
            }
        };
        openRequest.onsuccess = function (e) {
            console.log("PokerHistory: initIndexDB open onsuccess");
            db = e.target.result;
        };
        openRequest.onerror = function (e) {
            console.error("PokerHistory: initIndexDB open onerror");
            console.dir(e);
        };
    }

    function dbWrite(message) {
        if (!db || !message) {
            return;
        }

        const transaction = db.transaction(["messageStore"], "readwrite");
        transaction.oncomplete = (event) => {};
        transaction.onerror = (event) => {
            console.error("PokerHistory: dbWrite transaction onerror [" + message.text + "]");
        };

        const store = transaction.objectStore("messageStore");
        const request = store.put(message);
        request.onsuccess = (event) => {};
    }

    function dbReadAll() {
        if (!db) {
            console.error("PokerHistory: dbReadAll db is null");
            return Promise.resolve([]);
        }

        const transaction = db.transaction(["messageStore"], "readonly");
        transaction.oncomplete = (event) => {
            console.log("PokerHistory: dbReadAll transaction oncomplete");
        };
        transaction.onerror = (event) => {
            console.error("PokerHistory: dbReadAll transaction onerror");
        };

        const store = transaction.objectStore("messageStore");
        return new Promise((resolve, reject) => {
            const resultList = [];
            const request = store.openCursor();

            request.onerror = (event) => {
                console.error("PokerHistory: dbReadAll cursor onerror", event);
                reject(event);
            };

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    resultList.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(resultList);
                }
            };
        });
    }

    function dbClearAll() {
        if (!db) {
            console.error("PokerHistory: dbClearAll db is null");
            return Promise.reject("DB not initialized");
        }

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(["messageStore"], "readwrite");
            transaction.oncomplete = (event) => {
                console.log("PokerHistory: dbClearAll transaction oncomplete");
                resolve();
            };
            transaction.onerror = (event) => {
                console.error("PokerHistory: dbClearAll transaction onerror", event);
                reject(event);
            };

            const store = transaction.objectStore("messageStore");
            const request = store.clear();

            request.onsuccess = (event) => {
                console.log("PokerHistory: All records cleared from messageStore.");
            };
            request.onerror = (event) => {
                console.error("PokerHistory: Error clearing records:", event);
            };
        });
    }

    function initPokerObserver() {
        const $poker = $("div.holdemWrapper___D71Gy");
        const observerConfig = { attributes: false, childList: true, subtree: false };
        const observer = new MutationObserver(() => {
            reObserveMessageBox();
        });
        if ($poker.length === 1) {
            console.log("PokerHistory: observe poker page");
            observer.observe($poker[0], observerConfig);
            reObserveMessageBox();
        }
    }

    function reObserveMessageBox() {
        console.log("PokerHistory: reObserveMessageBox");
        if (!messageBoxObserver) {
            messageBoxObserver = new MutationObserver((mutated) => {
                handleMessageBoxChange(mutated);
            });
        }
        messageBoxObserver.disconnect();
        const $messageWrap = $("div.holdemWrapper___D71Gy div.messagesWrap___tBx9u");
        if ($messageWrap.length === 0) {
            console.warn("PokerHistory: messageWrap not found, cannot observe messages.");
            return;
        }
        const observerConfig = { attributes: true, childList: true, subtree: false };
        messageBoxObserver.observe($messageWrap[0], observerConfig);
    }

    function handleMessageBoxChange(mutated) {
        if (mutated.length >= 40) {
            console.log("PokerHistory: handlePokerBoxChange disregarded " + mutated.length + " mutations (too many)");
            return;
        }

        for (const mutation of mutated) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.classList.contains("message___RlFXd")) {
                    let message = {
                        timestamp: new Date().getTime() / 1000,
                        text: node.innerText,
                    };
                    dbWrite(message);
                }
            }
        }
    }

    function initCSS() {
        const isDarkmode = $("body").hasClass("dark-mode");
        GM_addStyle(`
        .poker-control-panel-popup {
          position: fixed;
          top: 10%;
          left: 5%;
          width: 85%;
          height: 45%;
          min-width: 300px;
          min-height: 200px;
          max-width: 90vw;
          max-height: 90vh;
          border-radius: 10px;
          padding: 15px;
          background: ${isDarkmode ? "#282828" : "#F0F0F0"};
          z-index: 1000;
          display: none;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          resize: both;
          overflow: auto;
        }

        .poker-control-panel-popup h3 {
          margin-top: 0;
          color: ${isDarkmode ? "#FFF" : "#333"};
        }

        .poker-control-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          flex-shrink: 0;
        }

        #poker-results {
          width: 100%;
          height: calc(100% - 50px);
          box-sizing: border-box;
          border: 1px solid ${isDarkmode ? "#555" : "#CCC"};
          border-radius: 5px;
          padding: 10px;
          background-color: ${isDarkmode ? "#222" : "#FFF"};
          color: ${isDarkmode ? "#EEE" : "#333"};
          resize: none;
          overflow: auto;
          margin-top: 5px;
        }

        .poker-control-panel-overlay {
          position: fixed;
          top: 0;
          left: 0;
          background: ${isDarkmode ? "#404040" : "#B0B0B0"};
          width: 100%;
          height: 100%;
          opacity: 0.7;
          z-index: 900;
          display: none;
        }

        .poker-control-panel-item {
          display: inline-block;
          margin: 2px;
          padding: 5px 10px;
          border: 1px solid ${isDarkmode ? "#555" : "#CCC"};
          border-radius: 5px;
          background-color: ${isDarkmode ? "#333" : "#E0E0E0"};
          color: ${isDarkmode ? "#FFF" : "#333"};
          cursor: pointer;
          font-size: 0.9em;
          transition: background-color 0.2s;
        }

        .poker-control-panel-item:hover {
          background-color: ${isDarkmode ? "#444" : "#D0D0D0"};
        }
      `);
    }

    function savePanelSize() {
        const panel = document.getElementById("pokerControlPanel");
        if (panel && panel.style.display !== "none") {
            const rect = panel.getBoundingClientRect();
            const size = {
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
            try {
                localStorage.setItem("pokerControlPanelSize", JSON.stringify(size));
            } catch (e) {
                console.warn("PokerHistory: Could not save panel size to localStorage", e);
            }
        }
    }

    function initControlPanel() {
        const $title = $("div#top-page-links-list");
        if ($title.length === 0) {
            console.log("PokerHistory: nowhere to put control panel button");
            return;
        }

        const $controlBtn = $(`<a id="pokerHistoryControl" class="t-clear h c-pointer right last">
                                  <span class="icon-wrap svg-icon-wrap">
                                    <span class="link-icon-svg">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10.33"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Слой_2" data-name="Слой 2"><g id="icons"><g class="cls-1"><path class="cls-2" d="M10,5.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,3.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,5.67ZM8,1C3,1,0,5.37,0,5.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,1,8,1ZM8,9a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,9Z"></path></g><path class="cls-3" d="M10,4.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,2.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,4.67ZM8,0C3,0,0,4.37,0,4.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,0,8,0ZM8,8a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,8Z"></path></g></g></svg>
                                    </span>
                                  </span>
                                  <span>PokerHistory</span>
                                </a>`);
        $title.append($controlBtn);

        const $controlPanelDiv = $(`<div id="pokerControlPanel" class="poker-control-panel-popup">
            <div class="poker-control-panel-header">
                <h3>Poker History Records</h3>
                <button id="pokerClearHistoryBtn" class="poker-control-panel-item">Clear History</button>
            </div>
            <textarea readonly id="poker-results" cols="120" rows="30"></textarea>
        </div>`);
        const $controlPanelOverlayDiv = $(`<div id="pokerControlOverlayPanel" class="poker-control-panel-overlay"></div>`);

        $("body").append($controlPanelDiv);
        $("body").append($controlPanelOverlayDiv);

        // Load saved size from localStorage
        try {
            const savedSize = localStorage.getItem("pokerControlPanelSize");
            if (savedSize) {
                const size = JSON.parse(savedSize);
                if (size.width && size.height) {
                    $controlPanelDiv.css({
                        width: Math.max(300, size.width) + "px",
                        height: Math.max(200, size.height) + "px"
                    });
                }
            }
        } catch (e) {
            console.warn("PokerHistory: Failed to load saved panel size", e);
        }

        // Save size when user resizes
        const panelElement = $controlPanelDiv[0];
        let resizeTimeout;
        new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(savePanelSize, 300); // debounce
        }).observe(panelElement);

        $controlBtn.click(function () {
            dbReadAll().then((result) => {
                let text = "";
                if (result.length === 0) {
                    text = "No poker history records found.\n";
                } else {
                    for (const message of result) {
                        const timeStr = formatDateString(new Date(message.timestamp * 1000));
                        text += timeStr + " " + message.text + "\n";
                    }
                }
                text += "Found " + result.length + " records\n";
                const $textarea = $("textarea#poker-results");
                $textarea.val(text);
                $textarea.scrollTop($textarea[0].scrollHeight);
            }).catch(error => {
                console.error("PokerHistory: Error reading history for display:", error);
                $("textarea#poker-results").val("Error loading history: " + error.message);
            });

            $controlPanelDiv.fadeToggle(200);
            $controlPanelOverlayDiv.fadeToggle(200);
        });

        $controlPanelOverlayDiv.click(function () {
            $controlPanelDiv.fadeOut(200);
            $controlPanelOverlayDiv.fadeOut(200);
        });

        $("#pokerClearHistoryBtn").click(function () {
            if (confirm("Are you sure you want to clear ALL poker history? This action cannot be undone.")) {
                dbClearAll().then(() => {
                    const $textarea = $("textarea#poker-results");
                    $textarea.val("History cleared.\nFound 0 records");
                    console.log("PokerHistory: History cleared and display updated.");
                }).catch(error => {
                    console.error("PokerHistory: Failed to clear history:", error);
                    alert("Failed to clear history. Check console for details.");
                });
            }
        });
    }

    function formatDateString(date) {
        const pad = (v) => {
            return v < 10 ? "0" + v : v;
        };
        let year = date.getFullYear();
        let month = pad(date.getMonth() + 1);
        let day = pad(date.getDate());
        let hour = pad(date.getHours());
        let min = pad(date.getMinutes());
        let sec = pad(date.getSeconds());
        return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;
    }
})();
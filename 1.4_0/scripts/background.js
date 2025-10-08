let processStatus = [];
let isPaused = false;

function extractTweetData(url) {
    try {
        let match = url.match(/x\.com\/([^\/]+)\/status\/(\d+)/);
        if (match) {
            return `${match[1]}/status/${match[2]}`;
        } else {
            throw new Error("Invalid URL format");
        }
    } catch (error) {
        console.error("Error extracting tweet data:", error.message);
        return null;
    }
}

function normalizeHandle(value) {
    if (!value) {
        return null;
    }
    let cleaned = value.trim();
    cleaned = cleaned.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "");
    cleaned = cleaned.replace(/^@/, "");
    cleaned = cleaned.split(/[/?\s]/)[0];
    return cleaned ? cleaned : null;
}

function parsePeopleHandles(raw, fallback = []) {
    const initial = Array.isArray(fallback) ? fallback : [];
    if (!raw && initial.length === 0) {
        return [];
    }
    const fragments = (raw || "")
        .split(/[,\n]+/)
        .map(fragment => normalizeHandle(fragment))
        .filter(Boolean);
    const seen = new Set();
    const handles = [];
    for (const handle of [...fragments, ...initial]) {
        const key = handle.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            handles.push(handle);
        }
    }
    return handles;
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📩 Message received in background.js:", message);
    if (message.action === "searchTwitter") {
        let keywordRaw = message.keyword;
        let primaryKeyword = message.primaryKeyword || keywordRaw;
        let keywordList = Array.isArray(message.keywordList) ? message.keywordList : [];
        let options = message.options || { Likecheckbox: false, repostcheckbox: false, commentcheckbox: false };
        let numberofpost = message.numberofpost || "1";
        let intevalofpost = message.intevalofpost || "1";
        let commentText = message.commentText;
        let searchType = message.searchType;
        let mediaFilePath = message.mediaFilePath;
        let mediaType = message.mediaType

        if (!keywordRaw) {
            sendResponse({ status: "error", message: "No keyword provided" });
            console.log("No keyword provided");
            return;
        }
        console.log(" Searching Twitter for:", keywordRaw);
        console.log(" Options:", options);
        console.log(" Number of posts:", numberofpost);
        console.log(" Interval of posts:", intevalofpost);
        console.log(" Comment text:", commentText);
        console.log(" Search Type:", searchType);
        console.log("mediaFilePath:", mediaFilePath);
        console.log("mediaType:", mediaType);
        const normalizedHandles = parsePeopleHandles(keywordRaw, keywordList);
        keywordList = normalizedHandles;
        if (searchType === "people" && keywordList.length > 0) {
            const normalizedPrimary = normalizeHandle(primaryKeyword) || keywordList[0];
            primaryKeyword = normalizedPrimary;
        } else {
            primaryKeyword = keywordRaw;
        }
        const numberOfPostInt = Math.max(1, parseInt(numberofpost, 10) || 1);
        const totalTaskCount = searchType === "people" && keywordList.length > 0
            ? numberOfPostInt * keywordList.length
            : numberOfPostInt;
        chrome.storage.local.set({
            keyword: keywordRaw,
            primaryKeyword,
            keywordList,
            options,
            numberofpost: numberOfPostInt,
            commentText,
            searchType,
            intevalofpost,
            mediaFilePath,
            mediaType,
            totalTaskCount
        }, () => {
            console.log("✅ Data stored in chrome.storage.local");
        });


        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error(" No active tab found!");
                return;
            }
            let queryTarget = searchType === "people" && keywordList.length > 0 ? keywordList[0] : primaryKeyword;
            let searchURL = `https://x.com/search?q=${encodeURIComponent(queryTarget)}&src=typed_query`;
            console.log("🔗 Navigating to:", searchURL);
            chrome.tabs.update(tabs[0].id, { url: searchURL }, () => {
                console.log("⏳ Waiting for Twitter page to load...");
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ["scripts/content/homeContent.js"]

                    }).then(() => {
                        console.log("injected successfully!");
                    }).catch((err) => {
                        console.error("Error injecting content:", err);
                    });
                }, 3000);
            });
        });
        sendResponse({ status: "success", message: "Search request received" });
        return true;
    }

    if (message.action == "startRecycle") {
        console.log("HELLO");
        let recyclekeyword = extractTweetData(message.tweetText);
        console.log("keyword", recyclekeyword);

        chrome.storage.local.set({ recyclekeyword }, () => {
            console.log("✅ Data stored in chrome.storage.local");
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error(" No active tab found!");
                return;
            }
            let searchURL = `https://x.com/search?q=${encodeURIComponent(recyclekeyword)}&src=typed_query`;
            console.log("🔗 Navigating to:", searchURL);
            chrome.tabs.update(tabs[0].id, { url: searchURL }, () => {
                console.log("⏳ Waiting for Twitter page to load...");
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ["scripts/content/recyclePost.js"]

                    }).then(() => {
                        console.log("injected successfully!");
                    }).catch((err) => {
                        console.error("Error injecting content:", err);
                    });
                }, 3000);
            });
        });
        sendResponse({ status: "success", message: "Search request received" });
        return true;
    }
    console.log("📩 Message received in background.js:", message);
    if (message.action === "resumeProcess") {
        console.log("▶️ Process Resumed. Injecting `content.js`...");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ["scripts/content/homeContent.js"]
                }).then(() => {
                    console.log("✅ `content.js` successfully injected!");
                }).catch((err) => {
                    console.log(" Error injecting content script:", err);
                });
            } else {
                console.log(" No active tab found!");
            }
        });
    }
    if (message.action === "postcommentresumeProcess") {
        console.log("▶️ Process Resumed. Injecting `content.js`...");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ["scripts/content/postnewcommentContent.js"]
                }).then(() => {
                    console.log("✅ `content.js` successfully injected!");
                }).catch((err) => {
                    console.log(" Error injecting content script:", err);
                });
            } else {
                console.log(" No active tab found!");
            }
        });
    }
    if (message.action === "updateProcessStatus") {
        processStatus.push({
            status: message.status,
            message: message.message,
            likeStatus: message.likeStatus ?? null,
            commentStatus: message.commentStatus ?? null,
            repostStatus: message.repostStatus ?? null,
            postResult: message.postResult ?? []
        });

        console.log("🔄 Process Status Updated:", message);
        chrome.storage.local.set({ postResult: message.postResult }, () => {
            console.log("✅ postResult stored persistently.");
        });
        chrome.storage.local.set({
            progressData: message.progressData,
            progressPercentage: message.progressData.progressPercentage
        }, () => {
            console.log("✅ Progress stored persistently.");
        });
        chrome.runtime.sendMessage({
            action: "postResultUpdated",
            postResult: message.postResult,
            progressData: message.progressData
        }).catch((err) => {
    console.warn("postResultUpdated error:", err.message || err);
});
    }

    if (message.action === "getLocalFile") {
        let localImagePath = message.path;

        fetch(localImagePath)
            .then(response => response.blob())
            .then(blob => {
                let reader = new FileReader();
                reader.onloadend = () => sendResponse({ success: true, dataUrl: reader.result });
                reader.readAsDataURL(blob);
            })
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true;
    }

    if (message.action === "sendStatus") {
        const status = message.data.status;
        const msgText = message.data.message;
        chrome.storage.local.get(["likeSuccess", "likeFailed"], (data) => {
            let successCount = data.likeSuccess || 0;
            let failedCount = data.likeFailed || 0;
            if (status === "success") {
                successCount++;
                chrome.storage.local.set({
                    likeSuccess: successCount,
                    lastError: "false",
                    RecyclepostStatusMessage: ""
                });
            } else if (status === "error") {
                failedCount++;
                chrome.storage.local.set({
                    likeFailed: failedCount,
                    lastError: "true",
                    RecyclepostStatusMessage: msgText
                });
            }
        });
    }
    if (message.action === "searchUserName") {


        console.log("message=====>",message);
        
        let postCommentkeyword = message.postCommentkeywords;
        let postCommentoptions  = message.postCommentoptions || { postCommentLikecheckbox: false, postCommentrepostcheckbox: false, postCommentcheckbox: false };
        let intevalofpost = message.intevalofpost || "1";
        let postcommentText = message.postcommentText;
        let postCommentsearchType = message.postCommentsearchType;
        let postmediaFilePath = message.postCommentmediaFilePath;
        let postCommentmediaType = message.postCommentmediaType

        if (!postCommentkeyword) {
            sendResponse({ status: "error", message: "No keyword provided" });
            console.log("No keyword provided");
            return;
        }
        console.log(" Searching Twitter for:", postCommentkeyword);
        console.log(" Options:", postCommentoptions);
        console.log(" Interval of posts:", intevalofpost);
        console.log(" Comment text:", postcommentText);
        console.log(" Search Type:", postCommentsearchType);
        console.log("postmediaFilePath:", postmediaFilePath);
        console.log("postCommentmediaType:", postCommentmediaType);
        
        chrome.storage.local.set({ postCommentkeyword, postCommentoptions, postcommentText, postCommentsearchType, intevalofpost, postmediaFilePath, postCommentmediaType }, () => {
            console.log("✅ Data stored in chrome.storage.local");
        });


        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                console.error(" No active tab found!");
                return;
            }
            let searchURL = `https://x.com/home`;

            console.log("🔗 Navigating to:", searchURL);
            chrome.tabs.update(tabs[0].id, { url: searchURL }, () => {
                console.log("⏳ Waiting for Twitter page to load...");
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        files: ["scripts/content/postnewcommentContent.js"]

                    }).then(() => {
                        console.log("injected successfully!");
                    }).catch((err) => {
                        console.error("Error injecting content:", err);
                    });
                }, 3000);
            });
        });
        sendResponse({ status: "success", message: "Search request received" });
        return true;
    }

});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.postResult || changes.progressData) {
        console.log("🔄 postResult or progressData changed. Sending update to popup...");

        chrome.runtime.sendMessage({
            action: "postResultUpdated",
            postResult: changes.postResult ? changes.postResult.newValue : null,
            progressData: changes.progressData ? changes.progressData.newValue : null
        }).catch((err) => {
    console.warn("postResultUpdated error:", err.message || err);
});
    }

    if (changes.postcommentResult || changes.postcommentprogressData) {
        console.log("🔄 postcommentResult or postcommentprogressData changed. Sending update to popup...");

        chrome.runtime.sendMessage({
            action: "postcommentResultUpdated",
            postcommentResult: changes.postcommentResult ? changes.postcommentResult.newValue : null,
            postcommentprogressData: changes.postcommentprogressData ? changes.postcommentprogressData.newValue : null
        }).catch((err) => {
    console.warn("postcommentResultUpdated error:", err.message || err);
});
    }
});

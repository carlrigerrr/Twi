let processRunning = false;
let postCommentmediaFilePath = "";
let postCommentmediaType = ""
let totalpost;
let postcommentisPaused
let progressTask;
document.addEventListener("DOMContentLoaded", function () {
    const mainContent = document.getElementById('main-content');
    const loginMessage = document.getElementById('login-message');
    const openTwitterBtn = document.getElementById('openTwitterBtn');

    let twitterTabId = null;
    let loginCheckInterval = null;
    if (openTwitterBtn) {
        openTwitterBtn.addEventListener("click", () => {
            chrome.tabs.query({}, function (tabs) {
                const existingTwitterTab = tabs.find(tab =>
                    tab.url &&
                    (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
                );

                if (existingTwitterTab) {
                    chrome.tabs.update(existingTwitterTab.id, {
                        active: true,
                        url: "https://x.com"
                    });
                    console.log("🔁 Redirected to Twitter in existing tab.");
                } else {
                    chrome.tabs.create({ url: "https://x.com" }, function (newTab) {
                        console.log("🆕 Opened new Twitter tab:", newTab.url);
                    });
                }
            });
        });
    }

    chrome.tabs.query({}, function (tabs) {
        const twitterTab = tabs.find(tab =>
            tab.url &&
            (tab.url.includes("twitter.com") || tab.url.includes("x.com"))
        );

        if (twitterTab) {
            twitterTabId = twitterTab.id;
            checkTwitterLoginStatus(twitterTabId);
        } else {
            chrome.tabs.create({ url: "https://x.com" }, function (newTab) {
                twitterTabId = newTab.id;
                console.log("🆕 Opened new Twitter tab");
                setTimeout(() => {
                    checkTwitterLoginStatus(twitterTabId);
                }, 5000);
            });
        }
    });

    function checkTwitterLoginStatus(tabId) {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                func: () => {
                    try {
                        return !!document.querySelector('[aria-label="Account menu"], [data-testid="AppTabBar_Home_Link"]');
                    } catch (e) {
                        return false;
                    }
                },
            },
            (results) => {
                if (chrome.runtime.lastError || !results || !results[0]) {
                    console.warn("⚠️ Login check failed:", chrome.runtime.lastError?.message);
                    showLoginUI("Could not verify login. Please try again.");
                    return;
                }

                const isLoggedIn = results[0].result;
                if (isLoggedIn) {
                    showExtensionUI();
                } else {
                    showLoginUI("You are not logged into Twitter. Please log in first.");
                    if (!loginCheckInterval) {
                        loginCheckInterval = setInterval(() => {
                            checkTwitterLoginStatus(tabId);
                        }, 5000);
                    }
                }
            }
        );
    }

    function showExtensionUI() {
        if (loginCheckInterval) {
            clearInterval(loginCheckInterval);
            loginCheckInterval = null;
        }
        mainContent.style.display = 'block';
        loginMessage.style.display = 'none';
        console.log("✅ User is logged in — Extension UI enabled.");
    }

    function showLoginUI(message) {
        mainContent.style.display = 'none';
        loginMessage.style.display = 'flex';
        loginMessage.querySelector("h2").innerText = "🔒 Login Required";
        loginMessage.querySelector(".login-text").innerHTML = message;
        console.log(" User not logged in — waiting...");
    }




    chrome.storage.local.get(["minVal", "maxVal"], (data) => {
        if (data.minVal !== undefined) {
            document.getElementById("minVal").innerText = data.minVal;
        }
        if (data.maxVal !== undefined) {
            document.getElementById("maxVal").innerText = data.maxVal;
        }
    });
    document.querySelectorAll(".btn-change").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            const delta = parseInt(btn.dataset.delta, 10);
            const span = document.getElementById(targetId);
            let value = parseInt(span.innerText, 10);
            const limits = {
                minVal: { min: 0, max: 59 },
                maxVal: { min: 1, max: 59 }
            };
            const { min, max } = limits[targetId];
            value = Math.min(max, Math.max(min, value + delta));
            span.innerText = value;
            chrome.storage.local.set({ [targetId]: value }, function () {
                console.log(`${targetId} saved to local storage: ${value}`);
            });
        });
    });


    chrome.storage.onChanged.addListener((changes) => {
        if (changes.postcommentprogressData || changes.postcommentResult) {

            chrome.storage.local.get(["postcommentprogressData", "postcommentResult"], (data) => {

                if (data.postcommentprogressData) restoreProgress(data.postcommentprogressData)
                if (data.postcommentResult) updateUI(data.postcommentResult);
            });
        }
    });
    chrome.storage.local.get(["postcommentprogressData", "postcommentResult"], (data) => {
        if (data.postcommentprogressData) restoreProgress(data.postcommentprogressData);
        if (data.postcommentResult) updateUI(data.postcommentResult);
    });
    function restoreProgress(postcommentprogressData) {
        if (!postcommentprogressData) return;
        const elements = {
            postCommentlikeSent: document.getElementById("postCommentlikeSent"),
            postCommentlikeFailed: document.getElementById("postCommentlikeFailed"),
            postCommentrepostSent: document.getElementById("postCommentrepostSent"),
            postCommentrepostFailed: document.getElementById("postCommentrepostFailed"),
            postCommentSent: document.getElementById("postCommentSent"),
            postCommentFailed: document.getElementById("postCommentFailed"),
            postCommentprogressPercentage: document.getElementById("postCommentprogressPercentage"),
            postCommentprogressFill: document.getElementById("postCommentprogressFill")
        };
        console.log("elements----->", elements);

        for (let key in elements) {
            if (!elements[key]) {
                console.log(` Missing UI element: ${key}, skipping update.`);
                return;
            }
        }
        elements.postCommentlikeSent.textContent = postcommentprogressData.postCommentlikeSent || "0";
        elements.postCommentlikeFailed.textContent = postcommentprogressData.postCommentlikeFailed || "0";
        elements.postCommentrepostSent.textContent = postcommentprogressData.postCommentrepostSent || "0";
        elements.postCommentrepostFailed.textContent = postcommentprogressData.postCommentrepostFailed || "0";
        elements.postCommentSent.textContent = postcommentprogressData.postCommentSent || "0";
        elements.postCommentFailed.textContent = postcommentprogressData.postCommentFailed || "0";
        elements.postCommentprogressPercentage.textContent = postcommentprogressData.postCommentprogressPercentage || "0%";
        elements.postCommentprogressFill.style.width = postcommentprogressData.postCommentprogressPercentage || "0%";
    }

    chrome.storage.local.get(["postCommentprogressPercentage"], (data) => {
        if (data.postCommentprogressPercentage !== undefined) {
            document.getElementById("postCommentprogressPercentage").textContent = `${data.postCommentprogressPercentage}%`;
            document.getElementById("postCommentprogressFill").style.width = `${data.postCommentprogressPercentage}%`;
            console.log("🔄 Progress restored on popup open:", data.postCommentprogressPercentage);
        }
    });
    const postCommentsearchType = document.getElementById("postCommentsearchType");
    const postCommentLikecheckbox = document.getElementById("postCommentLikecheckbox");
    const postCommentrepostCheckbox = document.getElementById("postCommentrepostcheckbox");
    const postcommentText = document.getElementById("postcommentText");
    const postCommentCheckbox = document.getElementById("postCommentcheckbox");
    const commentInputGroup = document.getElementById("postcommentText").parentElement;
    const fileInputGroup = document.getElementById("mediaFile").parentElement;
    const fileInput = document.getElementById("mediaFile");
    const searchBtn = document.getElementById("searchBtn");

    const postCommentpauseBtn = document.querySelector(".postCommentpause-btn");
    function updatePauseButtonState() {
        chrome.storage.local.get("postcommentisPaused", (data) => {
            let postcommentisPaused = data.postcommentisPaused !== undefined ? data.postcommentisPaused : false;
            postCommentpauseBtn.textContent = postcommentisPaused ? "Pause" : "Resume";
        });
    }
    postCommentpauseBtn.addEventListener("click", function () {
        chrome.storage.local.get(["postcommentisPaused", "postCommentprogressPercentage"], (data) => {
            const progress = Number(data.postCommentprogressPercentage || 0);
            if (progress === 100) {
                postCommentpauseBtn.disabled = true;
                postCommentpauseBtn.textContent = "Completed";
                console.log("Process complete; pause button disabled.");
                return;
            }
            let postcommentisPaused = data.postcommentisPaused !== undefined ? data.postcommentisPaused : false;
            postcommentisPaused = !postcommentisPaused;
            chrome.storage.local.set({ postcommentisPaused }, () => {
                postCommentpauseBtn.textContent = postcommentisPaused ? "Pause" : "Resume";
                console.log("Updated postcommentisPaused value:", postcommentisPaused);
                chrome.runtime.sendMessage({ action: postcommentisPaused ? "postcommentresumeProcess" : "pauseProcess" });
                if (!postcommentisPaused) {
                    console.log("▶️ Resuming process, injecting content script...");
                    chrome.runtime.sendMessage({ action: "loadContentScript" });
                }
            });
        });
    });

    updatePauseButtonState();
    function loadSettings() {
        chrome.storage.local.get([
            "postCommentKeywordInput", "postCommentsearchType", "numberofpost",
            "postCommentlike", "postCommentrepost", "postComment", "postcommentText"
        ], (result) => {
            if (result.postCommentKeywordInput) postCommentKeywordInput.value = result.postCommentKeywordInput;
            if (result.postCommentsearchType) postCommentsearchType.value = result.postCommentsearchType;
            if (typeof result.postCommentlike === "boolean") postCommentLikecheckbox.checked = result.postCommentlike;
            if (typeof result.postCommentrepost === "boolean") postCommentrepostCheckbox.checked = result.postCommentrepost;
            if (typeof result.postComment === "boolean") postCommentCheckbox.checked = result.postComment;
            if (result.postcommentText) postcommentText.value = result.postcommentText;
        });
    }
    function saveSettings() {
        const settings = {
            postCommentKeywordInput: postCommentKeywordInput.value,
            postCommentsearchType: postCommentsearchType.value,
            postCommentlike: postCommentLikecheckbox.checked,
            postCommentrepost: postCommentrepostCheckbox.checked,
            postComment: postCommentCheckbox.checked,
            postcommentText: postcommentText.value
        };
        chrome.storage.local.set(settings);
    }
    postCommentKeywordInput.addEventListener("input", saveSettings);
    postCommentsearchType.addEventListener("change", saveSettings);
    postCommentLikecheckbox.addEventListener("change", saveSettings);
    postCommentrepostCheckbox.addEventListener("change", saveSettings);
    postCommentCheckbox.addEventListener("change", saveSettings);
    postcommentText.addEventListener("input", saveSettings);
    loadSettings();
    commentInputGroup.style.display = "none";
    fileInputGroup.style.display = "none";
    function toggleInputGroups() {
        const displayStyle = postCommentCheckbox.checked ? "block" : "none";
        commentInputGroup.style.display = displayStyle;
        fileInputGroup.style.display = displayStyle;
        localStorage.setItem("postCommentCheckboxState", postCommentCheckbox.checked);
    }

    window.addEventListener("DOMContentLoaded", () => {
        const savedState = localStorage.getItem("postCommentCheckboxState") === "true";
        postCommentCheckbox.checked = savedState;
        toggleInputGroups();
    });

    postCommentCheckbox.addEventListener("change", toggleInputGroups);
    function validateInput(input) {
        if (input.value < 1 || isNaN(input.value)) {
        }
    }
    const statisticsBtn = document.getElementById("statisticsBtn");
    const hideBtn = document.getElementById("hideBtn");
    const allPostsTab = document.getElementById("allPosts");
    const progressContainer = document.querySelector(".progress-container");
    progressContainer.style.display = "none";
    chrome.storage.local.get(["postcommentprogressData", "postCommentprogressPercentage"], (result) => {
        if (result.postcommentprogressData) {
            restoreProgress(result.postcommentprogressData);
        }
        if (result.postCommentprogressPercentage) {
            document.getElementById("postCommentprogressFill").style.width = `${result.postCommentprogressPercentage}%`;
            document.getElementById("postCommentprogressPercentage").textContent = `${result.postCommentprogressPercentage}%`;
        }
    });
    statisticsBtn.addEventListener("click", function () {
        allPostsTab.style.display = "none";
        progressContainer.style.display = "block";
        const progressTitle = document.getElementById("progressTitle");
        chrome.storage.local.get(["progressTitlekeyword"], (data) => {
            if (progressTitle) {
                console.log("data.progressTitlekeyword", data.progressTitlekeyword);

                if (data.progressTitlekeyword == undefined) {
                    console.log("data ");
                    progressTitle.textContent = `Task Progress : no progress`;

                } else {

                    progressTitle.textContent = `Task Progress : ${data.progressTitlekeyword}`;
                }

            }
        });
    });
    hideBtn.addEventListener("click", function () {
        progressContainer.style.display = "none";
        allPostsTab.style.display = "block";
    });

    searchBtn.addEventListener("click", function () {
        resetProgress();
    });

    chrome.runtime.getManifest && chrome.runtime.getManifest().version
        ? document.getElementById("extensionVersion").textContent = chrome.runtime.getManifest().version
        : document.getElementById("extensionVersion").textContent = "Unknown";
    const exportBtn = document.querySelector(".export-btn");
    const exportModal = document.getElementById("exportModal");
    const closeExportModal = document.getElementById("closeExportModal");
    const exportDataContainer = document.getElementById("exportDataContainer");

    exportBtn.addEventListener("click", function () {
        exportBtn.disabled = true;

        chrome.storage.local.get(["postCommentprogressPercentage"], (result) => {
            const progress = Number(result.postCommentprogressPercentage);
            if (progress > 0) {
                exportModal.style.display = "flex";
            } else {
                showToast("plz wait for progress", "error");
            }
            exportBtn.disabled = false;
        });
    });


    closeExportModal.addEventListener("click", function () {
        exportModal.style.display = "none";
    });
    window.addEventListener("click", function (event) {
        if (event.target === exportModal) {
            exportModal.style.display = "none";
        }
    });
});
document.getElementById("searchBtn").addEventListener("click", async () => {
    let keywordInputRaw = document.getElementById("postCommentKeywordInput").value.trim();
    let postCommentLikecheckbox = document.getElementById("postCommentLikecheckbox").checked;
    let postCommentrepostcheckbox = document.getElementById("postCommentrepostcheckbox").checked;
    let postCommentcheckbox = document.getElementById("postCommentcheckbox").checked;
    let intevalofpost = document.getElementById("intevalofpost").value;
    let postcommentText = document.getElementById("postcommentText").value;
    let postCommentsearchType = document.getElementById("postCommentsearchType").value;
    let fileInput = document.getElementById("mediaFile");
    let postCommentpauseBtn = document.querySelector(".postCommentpause-btn");
    let statisticsBtn = document.getElementById("statisticsBtn");

    let keywordsArray = keywordInputRaw
        .split(",")
        .map(k => k.trim())
        .filter(k => k.length > 0);

    if (keywordsArray.length === 0) {
        showToast("Please Enter Search Keyword.", "error");
        document.getElementById("postCommentKeywordInput").focus();
        return;
    }
    if (!postCommentLikecheckbox && !postCommentrepostcheckbox && !postCommentcheckbox) {
        showToast("Please select at least one action (Like, Repost, or Comment).", "error");
        return;
    }
    if (postCommentcheckbox && postcommentText === "") {
        showToast("Please enter a comment before proceeding.", "error");
        document.getElementById("postcommentText").focus();
        return;
    }
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];


        if (file) {
            const sizeInBytes = file.size;

            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

            console.log(`File size: ${sizeInMB} MB`);
            if (sizeInMB > 6) {
                showToast("Please upload a file (6 MB or less).", "error");
                fileInput.value = "";
                return;
            }
        }


        postCommentmediaFilePath = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                resolve(event.target.result.split(",")[1]);
            };
            reader.readAsDataURL(file);
        });
        if (file) {
            console.log("📂 Selected File:", file.name);
            console.log("📌 MIME Type:", file.type);
            if (file.type.startsWith("image/")) {
                postCommentmediaType = "image";
            } else if (file.type.startsWith("video/")) {
                postCommentmediaType = "video";
            } else {
                postCommentmediaType = "unknown";
                console.log("Unsupported File Type!");
            }
        }
    }
    else {
        postCommentmediaFilePath = null
    }
    postCommentpauseBtn.textContent = "Pause";
    chrome.storage.local.set({ postcommentisPaused: true, postcommentpostIndex: 0 }, () => {
        console.log("🟢 postcommentisPaused set to TRUE and index set to 0 when search starts.");
    });
    if (statisticsBtn) {
        console.log("📊 Auto-clicking 'Statistics' button...");
        statisticsBtn.click();
    } else {
        console.log("'Statistics' button not found!");
    }
    document.getElementById("searchBtn").disabled = true;



    chrome.runtime.sendMessage(
        {
            action: "searchUserName",
            postCommentkeywords: keywordsArray,
            postCommentoptions: { postCommentLikecheckbox, postCommentrepostcheckbox, postCommentcheckbox },
            postcommentText,
            postCommentsearchType,
            intevalofpost,
            postCommentmediaFilePath,
            postCommentmediaType
        },
        (response) => {
            console.log("🔄 Response from background:", response);
            if (response.status === "success") {
                showToast("✅ Search initiated successfully!", "success");
            } else {
                showToast(`Error: ${response.message}`, "error");
            }
        }
    );
});
function showToast(message, type) {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
    }
    let toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
function resetProgress() {
    const progressDefaults = {
        postCommentlikeSent: "0",
        postCommentlikeFailed: "0",
        postCommentrepostSent: "0",
        postCommentrepostFailed: "0",
        postCommentSent: "0",
        postCommentFailed: "0",
        postCommentprogressPercentage: "0%"
    };
    restoreProgress(progressDefaults);
    chrome.storage.local.set({
        postcommentprogressData: progressDefaults,
        postCommentprogressPercentage: "0"
    });
    chrome.storage.local.set({ postcommentprogressData: progressDefaults });
}
function restoreProgress(postcommentprogressData) {
    if (!postcommentprogressData) return;

    const elements = {
        postCommentlikeSent: document.getElementById("postCommentlikeSent"),
        postCommentlikeFailed: document.getElementById("postCommentlikeFailed"),
        postCommentrepostSent: document.getElementById("postCommentrepostSent"),
        postCommentrepostFailed: document.getElementById("postCommentrepostFailed"),
        postCommentSent: document.getElementById("postCommentSent"),
        postCommentFailed: document.getElementById("postCommentFailed"),
        postCommentprogressPercentage: document.getElementById("postCommentprogressPercentage"),
        postCommentprogressFill: document.getElementById("postCommentprogressFill")
    };
    for (let key in elements) {
        if (!elements[key]) {
            console.log(`Missing UI element: ${key}, skipping restoreProgress.`);
            return;
        }
    }
    elements.postCommentlikeSent.textContent = postcommentprogressData.postCommentlikeSent || "0";
    elements.postCommentlikeFailed.textContent = postcommentprogressData.postCommentlikeFailed || "0";
    elements.postCommentrepostSent.textContent = postcommentprogressData.postCommentrepostSent || "0";
    elements.postCommentrepostFailed.textContent = postcommentprogressData.postCommentrepostFailed || "0";
    elements.postCommentSent.textContent = postcommentprogressData.postCommentSent || "0";
    elements.postCommentFailed.textContent = postcommentprogressData.postCommentFailed || "0";
    elements.postCommentprogressPercentage.textContent = postcommentprogressData.postCommentprogressPercentage || "0%";
    elements.postCommentprogressFill.style.width = postcommentprogressData.postCommentprogressPercentage || "0%";
}

function saveProgress() {
    chrome.storage.local.set({
        postcommentprogressData: {
            postCommentlikeSent: document.getElementById("postCommentlikeSent").textContent,
            postCommentlikeFailed: document.getElementById("postCommentlikeFailed").textContent,
            postCommentrepostSent: document.getElementById("postCommentrepostSent").textContent,
            postCommentrepostFailed: document.getElementById("postCommentrepostFailed").textContent,
            postCommentSent: document.getElementById("postCommentSent").textContent,
            postCommentFailed: document.getElementById("postCommentFailed").textContent,
            postCommentprogressPercentage: document.getElementById("postCommentprogressPercentage").textContent
        }
    });
}
async function processPercentage() {
    await chrome.storage.local.get(["postCommentkeyword", "postcommentpostIndex"], async (result) => {
        if (result.postCommentkeyword) {
            let total = result.postCommentkeyword.length;
            let successTotal = result.postcommentpostIndex;
            let progressPercent = total === 0 ? 0 : Math.round((successTotal / total) * 100);
            document.getElementById("postCommentprogressFill").style.width = `${progressPercent}%`;
            document.getElementById("postCommentprogressPercentage").textContent = `${progressPercent}%`;
            chrome.storage.local.set({ postCommentprogressPercentage: progressPercent });
        }
    });
}
function updateUI(postcommentResult) {
    let exportDataContainer = document.getElementById("exportDataContainer");

    if (postcommentResult.length === 0) {
        exportDataContainer.innerHTML = "<p class='no-data'>No data available.</p>";
        return;
    }

    let exportHTML = `
        <table class="export-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Tweet ID</th>
                    <th>Liked</th>
                    <th>Reposted</th>
                    <th>Commented</th>
                </tr>
            </thead>
            <tbody>
    `;
    postcommentResult.forEach((item, index) => {
        exportHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.username}</td>
                <td><a href="https://x.com/${item.username}/status/${item.tweetId}" target="_blank">${item.tweetId}</a></td>
                <td>${item.likeStatus ? '✅' : '❌'}</td>
                <td>${item.repostStatus ? '✅' : '❌'}</td>
                <td>${item.commentStatus ? '✅' : '❌'}</td>
            </tr>
        `;
    });
    exportHTML += `
            </tbody>
        </table>
    `;
    exportDataContainer.innerHTML = exportHTML;
}

let processRunning = false;
let mediaFilePath = "";
let mediaType = ""
let totalpost;
let isPaused
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
        console.log("❌ User not logged in — waiting...");
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
        if (changes.progressData || changes.postResult) {
            console.log("🔄 Storage updated. Refreshing UI...");

            chrome.storage.local.get(["progressData", "postResult"], (data) => {
                if (data.progressData) restoreProgress(data.progressData)
                if (data.postResult) updateUI(data.postResult);
            });
        }
    });
    chrome.storage.local.get(["progressData", "postResult"], (data) => {
        if (data.progressData) restoreProgress(data.progressData);
        if (data.postResult) updateUI(data.postResult);
    });
    function restoreProgress(progressData) {
        if (!progressData) return;
        const elements = {
            likeSent: document.getElementById("likeSent"),
            likeFailed: document.getElementById("likeFailed"),
            repostSent: document.getElementById("repostSent"),
            repostFailed: document.getElementById("repostFailed"),
            commentSent: document.getElementById("commentSent"),
            commentFailed: document.getElementById("commentFailed"),
            progressPercentage: document.getElementById("progressPercentage"),
            progressFill: document.getElementById("progressFill")
        };

        for (let key in elements) {
            if (!elements[key]) {
                console.log(` Missing UI element: ${key}, skipping update.`);
                return;
            }
        }
        elements.likeSent.textContent = progressData.likeSent || "0";
        elements.likeFailed.textContent = progressData.likeFailed || "0";
        elements.repostSent.textContent = progressData.repostSent || "0";
        elements.repostFailed.textContent = progressData.repostFailed || "0";
        elements.commentSent.textContent = progressData.commentSent || "0";
        elements.commentFailed.textContent = progressData.commentFailed || "0";
        elements.progressPercentage.textContent = progressData.progressPercentage || "0%";
        elements.progressFill.style.width = progressData.progressPercentage || "0%";
    }

    chrome.storage.local.get(["progressPercentage"], (data) => {
        if (data.progressPercentage !== undefined) {
            document.getElementById("progressPercentage").textContent = `${data.progressPercentage}%`;
            document.getElementById("progressFill").style.width = `${data.progressPercentage}%`;
            console.log("🔄 Progress restored on popup open:", data.progressPercentage);
        }
    });
    const searchType = document.getElementById("searchType");
    const numberofpost = document.getElementById("numberofpost");
    const likeCheckbox = document.getElementById("Likecheckbox");
    const repostCheckbox = document.getElementById("repostcheckbox");
    const commentText = document.getElementById("commentText");
    const commentCheckbox = document.getElementById("commentcheckbox");
    const commentInputGroup = document.getElementById("commentText").parentElement;
    const fileInputGroup = document.getElementById("mediaFile").parentElement;
    const fileInput = document.getElementById("mediaFile");
    const searchBtn = document.getElementById("searchBtn");

    const pauseBtn = document.querySelector(".pause-btn");
    function updatePauseButtonState() {
        chrome.storage.local.get("isPaused", (data) => {
            let isPaused = data.isPaused !== undefined ? data.isPaused : false;
            pauseBtn.textContent = isPaused ? "Pause" : "Resume";
        });
    }
    pauseBtn.addEventListener("click", function () {
        chrome.storage.local.get(["isPaused", "progressPercentage"], (data) => {
            const progress = Number(data.progressPercentage || 0);
            if (progress === 100) {
                pauseBtn.disabled = true;
                pauseBtn.textContent = "Completed";
                console.log("Process complete; pause button disabled.");
                return;
            }
            let isPaused = data.isPaused !== undefined ? data.isPaused : false;
            isPaused = !isPaused;
            chrome.storage.local.set({ isPaused }, () => {
                pauseBtn.textContent = isPaused ? "Pause" : "Resume";
                console.log("Updated isPaused value:", isPaused);
                chrome.runtime.sendMessage({ action: isPaused ? "resumeProcess" : "pauseProcess" });
                if (!isPaused) {
                    console.log("▶️ Resuming process, injecting content script...");
                    chrome.runtime.sendMessage({ action: "loadContentScript" });
                }
            });
        });
    });

    updatePauseButtonState();
    function loadSettings() {
        chrome.storage.local.get([
            "keyword", "searchType", "numberofpost",
            "like", "repost", "comment", "commentText"
        ], (result) => {
            if (result.keyword) keywordInput.value = result.keyword;
            if (result.searchType) searchType.value = result.searchType;
            if (result.numberofpost) numberofpost.value = result.numberofpost;
            if (typeof result.like === "boolean") likeCheckbox.checked = result.like;
            if (typeof result.repost === "boolean") repostCheckbox.checked = result.repost;
            if (typeof result.comment === "boolean") commentCheckbox.checked = result.comment;
            if (result.commentText) commentText.value = result.commentText;
        });
    }
    function saveSettings() {
        const settings = {
            keyword: keywordInput.value,
            searchType: searchType.value,
            numberofpost: numberofpost.value,
            like: likeCheckbox.checked,
            repost: repostCheckbox.checked,
            comment: commentCheckbox.checked,
            commentText: commentText.value
        };
        chrome.storage.local.set(settings);
    }
    keywordInput.addEventListener("input", saveSettings);
    searchType.addEventListener("change", saveSettings);
    numberofpost.addEventListener("input", saveSettings);
    likeCheckbox.addEventListener("change", saveSettings);
    repostCheckbox.addEventListener("change", saveSettings);
    commentCheckbox.addEventListener("change", saveSettings);
    commentText.addEventListener("input", saveSettings);
    loadSettings();
    commentInputGroup.style.display = "none";
    fileInputGroup.style.display = "none";
    function toggleInputGroups() {
        const displayStyle = commentCheckbox.checked ? "block" : "none";
        commentInputGroup.style.display = displayStyle;
        fileInputGroup.style.display = displayStyle;
        localStorage.setItem("commentCheckboxState", commentCheckbox.checked);
    }

    window.addEventListener("DOMContentLoaded", () => {
        const savedState = localStorage.getItem("commentCheckboxState") === "true";
        commentCheckbox.checked = savedState;
        toggleInputGroups();
    });

    commentCheckbox.addEventListener("change", toggleInputGroups);
    function validateInput(input) {
        if (input.value < 1 || isNaN(input.value)) {
        }
    }
    numberofpost.addEventListener("input", function () {
        validateInput(numberofpost);
    });
    document.getElementById("searchBtn").addEventListener("click", function () {
        validateInput(numberofpost);
    });

    const statisticsBtn = document.getElementById("statisticsBtn");
    const hideBtn = document.getElementById("hideBtn");
    const allPostsTab = document.getElementById("allPosts");
    const progressContainer = document.querySelector(".progress-container");
    progressContainer.style.display = "none";
    chrome.storage.local.get(["progressData", "progressPercentage"], (result) => {
        if (result.progressData) {
            restoreProgress(result.progressData);
        }
        if (result.progressPercentage) {
            document.getElementById("progressFill").style.width = `${result.progressPercentage}%`;
            document.getElementById("progressPercentage").textContent = `${result.progressPercentage}%`;
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

        chrome.storage.local.get(["progressPercentage"], (result) => {
            const progress = Number(result.progressPercentage);
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
function normalizeHandleInput(value) {
    if (!value) {
        return null;
    }
    let cleaned = value.trim();
    cleaned = cleaned.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, "");
    cleaned = cleaned.replace(/^@/, "");
    cleaned = cleaned.split(/[/?\s]/)[0];
    return cleaned ? cleaned : null;
}

function parsePeopleHandlesInput(raw) {
    if (!raw) {
        return [];
    }
    const fragments = raw
        .split(/[,\n]+/)
        .map(fragment => normalizeHandleInput(fragment))
        .filter(Boolean);
    const seen = new Set();
    const handles = [];
    for (const handle of fragments) {
        const key = handle.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            handles.push(handle);
        }
    }
    return handles;
}

document.getElementById("searchBtn").addEventListener("click", async () => {
    let keyword = document.getElementById("keywordInput").value.trim();
    let Likecheckbox = document.getElementById("Likecheckbox").checked;
    let repostcheckbox = document.getElementById("repostcheckbox").checked;
    let commentcheckbox = document.getElementById("commentcheckbox").checked;
    let numberofpost = document.getElementById("numberofpost").value;
    let intevalofpost = document.getElementById("intevalofpost").value;
    let commentText = document.getElementById("commentText").value;
    let searchType = document.getElementById("searchType").value;
    let fileInput = document.getElementById("mediaFile");
    let pauseBtn = document.querySelector(".pause-btn");
    let statisticsBtn = document.getElementById("statisticsBtn");

    if (keyword === "") {
        showToast("Please Enter Search Keyword.", "error");
        document.getElementById("keywordInput").focus();
        return;
    }
    if (!Likecheckbox && !repostcheckbox && !commentcheckbox) {
        showToast("Please select at least one action (Like, Repost, or Comment).", "error");
        return;
    }
    if (commentcheckbox && commentText === "") {
        showToast("Please enter a comment before proceeding.", "error");
        document.getElementById("commentText").focus();
        return;
    }
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        mediaFilePath = await new Promise((resolve) => {
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
                mediaType = "image";
            } else if (file.type.startsWith("video/")) {
                mediaType = "video";
            } else {
                mediaType = "unknown";
                console.log("Unsupported File Type!");
            }
        }
    }
    else {
        mediaFilePath = null
    }

    const progressTitle = document.getElementById("progressTitle");
    if (progressTitle) {
        chrome.storage.local.set({ progressTitlekeyword: `${keyword}` });

    }
    pauseBtn.textContent = "Pause";
    chrome.storage.local.set({ isPaused: true, postIndex: 0 }, () => {
        console.log("🟢 isPaused set to TRUE and index set to 0 when search starts.");
    });
    if (statisticsBtn) {
        console.log("📊 Auto-clicking 'Statistics' button...");
        statisticsBtn.click();
    } else {
        console.log("'Statistics' button not found!");
    }
    document.getElementById("searchBtn").disabled = true;
    const parsedHandles = searchType === "people" ? parsePeopleHandlesInput(keyword) : [];
    const primaryKeyword = parsedHandles.length > 0 ? parsedHandles[0] : keyword;

    chrome.runtime.sendMessage(
        {
            action: "searchTwitter",
            keyword,
            primaryKeyword,
            keywordList: parsedHandles,
            options: { Likecheckbox, repostcheckbox, commentcheckbox },
            numberofpost,
            commentText,
            searchType,
            intevalofpost,
            mediaFilePath,
            mediaType
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
        likeSent: "0",
        likeFailed: "0",
        repostSent: "0",
        repostFailed: "0",
        commentSent: "0",
        commentFailed: "0",
        progressPercentage: "0%"
    };
    restoreProgress(progressDefaults);
    chrome.storage.local.set({
        progressData: progressDefaults,
        progressPercentage: "0"
    });
    chrome.storage.local.set({ progressData: progressDefaults });
}
function restoreProgress(progressData) {
    if (!progressData) return;

    const elements = {
        likeSent: document.getElementById("likeSent"),
        likeFailed: document.getElementById("likeFailed"),
        repostSent: document.getElementById("repostSent"),
        repostFailed: document.getElementById("repostFailed"),
        commentSent: document.getElementById("commentSent"),
        commentFailed: document.getElementById("commentFailed"),
        progressPercentage: document.getElementById("progressPercentage"),
        progressFill: document.getElementById("progressFill")
    };
    for (let key in elements) {
        if (!elements[key]) {
            console.log(`Missing UI element: ${key}, skipping restoreProgress.`);
            return;
        }
    }
    elements.likeSent.textContent = progressData.likeSent || "0";
    elements.likeFailed.textContent = progressData.likeFailed || "0";
    elements.repostSent.textContent = progressData.repostSent || "0";
    elements.repostFailed.textContent = progressData.repostFailed || "0";
    elements.commentSent.textContent = progressData.commentSent || "0";
    elements.commentFailed.textContent = progressData.commentFailed || "0";
    elements.progressPercentage.textContent = progressData.progressPercentage || "0%";
    elements.progressFill.style.width = progressData.progressPercentage || "0%";
}

function saveProgress() {
    chrome.storage.local.set({
        progressData: {
            likeSent: document.getElementById("likeSent").textContent,
            likeFailed: document.getElementById("likeFailed").textContent,
            repostSent: document.getElementById("repostSent").textContent,
            repostFailed: document.getElementById("repostFailed").textContent,
            commentSent: document.getElementById("commentSent").textContent,
            commentFailed: document.getElementById("commentFailed").textContent,
            progressPercentage: document.getElementById("progressPercentage").textContent
        }
    });
}
async function processPercentage() {
    await chrome.storage.local.get(["numberofpost", "postIndex"], async (result) => {
        if (result.numberofpost) {
            let total = result.numberofpost;
            let successTotal = result.postIndex;
            let progressPercent = total === 0 ? 0 : Math.round((successTotal / total) * 100);
            document.getElementById("progressFill").style.width = `${progressPercent}%`;
            document.getElementById("progressPercentage").textContent = `${progressPercent}%`;
            chrome.storage.local.set({ progressPercentage: progressPercent });
        }
    });
}
function updateUI(postResult) {
    let exportDataContainer = document.getElementById("exportDataContainer");

    if (postResult.length === 0) {
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
    postResult.forEach((item, index) => {
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

console.log(" started! ---- twitter - 1");
var total_comment
var comment
var action
var searchType
var attempt;
var minVal;
var maxVal;
var mediaFilePath;
var mediaType;
var keyword;
var keywordList = [];
var peopleHandles = [];
var postsPerHandle = 1;
var totalTaskCount = 0;
var lastHandleIndex = -1;
var normalizedProfileHandle = null;
var targetedProfileReady = false;
var likeStatus = null;
var commentStatus = null;
var repostStatus = null;
var postResult = []
var postDetails = ""
var isPaused;
var postIndex;  

chrome.storage.local.get(["postResult"], (result) => {
    postResult = result.postResult || [];
});
async function waitForResume() {
    console.log("isPaused befor while", isPaused);

    await chrome.storage.local.get(['isPaused'], async (result) => {
        console.log("Retrieved Data:", result);
        console.log("ispaused", result.isPaused);
        isPaused = result.isPaused
        
    })
    console.log("is paused ", isPaused);
    if (isPaused == false) {
        return false;
    } else {
        return true
    }
}

chrome.storage.local.get(["keyword", "primaryKeyword", "keywordList", "options", "numberofpost", "commentText", "searchType", 'maxVal','minVal', 'mediaFilePath', 'mediaType', 'isPaused', 'postIndex', 'postResult', 'totalTaskCount'], async (result) => {
    console.log("Retrieved Data:", result);
    console.log("ispaused", result.isPaused);
    isPaused = result.isPaused;
    postIndex = result.postIndex
    console.log("postIndex", postIndex);
    console.log("postResult", result.postResult);
    if (postIndex === 0) {
        console.log("postindex value is 0");

        postResult = [];
        chrome.storage.local.set({ postResult: [] }, () => {
            console.log("🔄 postResult has been reset because postIndex is 0");
        });
    } else {
        postResult = result.postResult;
        console.log("postindex value is not 0");

    }
    minVal = result.minVal;
    maxVal = result.maxVal;
    let storedPosts = parseInt(result.numberofpost, 10);
    postsPerHandle = !isNaN(storedPosts) && storedPosts > 0 ? storedPosts : 1;
    action = result.options;
    comment = result.commentText;
    searchType = result.searchType;
    mediaFilePath = result.mediaFilePath
    mediaType = result.mediaType
    keyword = result.primaryKeyword || result.keyword;
    keywordList = Array.isArray(result.keywordList) ? result.keywordList.map(handle => normalizeHandle(handle)).filter(Boolean) : [];
    peopleHandles = keywordList.length ? [...keywordList] : [];
    if (peopleHandles.length > 1) {
        const seenHandles = new Set();
        peopleHandles = peopleHandles.filter(handle => {
            const key = handle.toLowerCase();
            if (seenHandles.has(key)) {
                return false;
            }
            seenHandles.add(key);
            return true;
        });
    }
    if (searchType === "people" && peopleHandles.length === 0 && keyword) {
        const fallbackHandle = normalizeHandle(keyword);
        if (fallbackHandle) {
            peopleHandles = [fallbackHandle];
        }
    }
    const storedTotal = parseInt(result.totalTaskCount, 10);
    if (searchType === "people") {
        const computedTotal = postsPerHandle * (peopleHandles.length > 0 ? peopleHandles.length : 1);
        totalTaskCount = !isNaN(storedTotal) && storedTotal > 0 ? storedTotal : computedTotal;
        if (peopleHandles.length > 0) {
            normalizedProfileHandle = peopleHandles[0];
        } else {
            normalizedProfileHandle = normalizeHandle(keyword);
        }
        if (isNaN(storedTotal) || storedTotal !== totalTaskCount) {
            chrome.storage.local.set({ totalTaskCount });
        }
    } else {
        totalTaskCount = !isNaN(storedTotal) && storedTotal > 0 ? storedTotal : postsPerHandle;
        normalizedProfileHandle = normalizeHandle(keyword);
        if (isNaN(storedTotal) || storedTotal !== totalTaskCount) {
            chrome.storage.local.set({ totalTaskCount });
        }
        peopleHandles = [];
    }
    total_comment = totalTaskCount;
    targetedProfileReady = false;
    lastHandleIndex = -1;
    console.log("🔎 Search Type:", searchType);
    console.log("🔎 Search Type:", result.commentText);
    console.log("mediaFilePath:", result.mediaFilePath);
    console.log("mediaFilePath", mediaFilePath);
    console.log("mediaType", mediaType);
    if (!searchType) {
        console.log("No search type provided, exiting script.");
        return;
    }
    let pauseForNavigation = false;
    for (index = postIndex; index < total_comment; index++) {
        console.log("index--->", index);
        await sleep(5)
        let timeout = await waitForResume();
        console.log("timeout", timeout);
        if (timeout == false) {
            console.log("breck loop here ");
            break;
        }
        else {
            console.log(`Running task ${index + 1}...`);
            await sleep(1)
            console.log("not breck");
            console.log("index``````````````````", index);
            postDetails = "";
            likeStatus = null;
            commentStatus = null;
            repostStatus = null;
            if (searchType === "people") {
                if (peopleHandles.length > 0) {
                    const handleIndex = Math.floor(index / postsPerHandle);
                    const boundedIndex = Math.min(handleIndex, peopleHandles.length - 1);
                    const nextHandle = peopleHandles[boundedIndex];
                    if (boundedIndex !== lastHandleIndex || normalizedProfileHandle !== nextHandle) {
                        lastHandleIndex = boundedIndex;
                        normalizedProfileHandle = nextHandle;
                        targetedProfileReady = false;
                        console.log(`🎯 Switching to profile @${normalizedProfileHandle} (${boundedIndex + 1}/${peopleHandles.length})`);
                    }
                } else {
                    normalizedProfileHandle = normalizeHandle(keyword);
                }
            }
            if (searchType == "latest") {
                console.log("🔍 Executing Latest Search");
                await latest();
            } else if (searchType == "top") {
                console.log("🔍 Executing Top Search");
                await topclick();
            } else if (searchType == "media") {
                console.log("🔍 Executing Media Search");
                await media();
            } else if (searchType == "people") {
                console.log("🔍 Executing People Search");
                const handled = await people();
                if (handled === "navigating") {
                    pauseForNavigation = true;
                    console.log("⏸️ Navigation triggered for next profile; pausing loop until reload.");
                    break;
                }
                if (!handled) {
                    console.warn("⚠️ No tweet processed for this task, marking as skipped.");
                    await indexupdate(index + 1);
                    sendStatusToBackground(false, "No eligible tweet found", likeStatus, commentStatus, repostStatus, postResult);
                    continue;
                }
            } else {
                console.log("not provide valid input");
            }
            if (!postDetails) {
                console.warn("Post details missing after processing; skipping result recording.");
                await indexupdate(index + 1);
                sendStatusToBackground(false, "Post details missing", likeStatus, commentStatus, repostStatus, postResult);
                continue;
            }
            let parts = postDetails.split("/status/");
            postResult.push({ username: parts[0], tweetId: parts[1], likeStatus: likeStatus, commentStatus: commentStatus, repostStatus: repostStatus, });
            await indexupdate(index + 1);
            sendStatusToBackground(true, "Repost successful", likeStatus, commentStatus, repostStatus, postResult);
          let  staticInteval = await getRandomNumber(minVal, maxVal)
          console.log("staticInteval",staticInteval);
          await sleep(staticInteval)
            likeStatus = null;
            commentStatus = null;
            repostStatus = null;
        }
    }
    if (pauseForNavigation) {
        console.log("⏳ Awaiting navigation to finish before continuing run.");
        return;
    }
    console.log("all process completed");
});

async function getRandomNumber(min, max) {
    min = Math.ceil(min); 
    max = Math.floor(max); 
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


async function indexupdate(nextIndex) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ postIndex: nextIndex }, () => {
            console.log("🔄 Updated postIndex to:", nextIndex);
            resolve();
        });
    });
}
function sendStatusToBackground(status, message, likeStatus, commentStatus, repostStatus) {
    chrome.storage.local.get(["progressData", "postIndex", "numberofpost", "totalTaskCount"], (data) => {
        let progressData = data.progressData || {
            likeSent: "0",
            likeFailed: "0",
            repostSent: "0",
            repostFailed: "0",
            commentSent: "0",
            commentFailed: "0",
            progressPercentage: "0%"
        };

        let postIndex = data.postIndex || 0;
        let totalPosts = data.totalTaskCount ?? data.numberofpost ?? 0;
        totalPosts = parseInt(totalPosts, 10);
        if (isNaN(totalPosts) || totalPosts < 0) {
            totalPosts = 0;
        }

        if (likeStatus !== null) {
            progressData[likeStatus ? "likeSent" : "likeFailed"] = (parseInt(progressData[likeStatus ? "likeSent" : "likeFailed"]) + 1).toString();
        }
        if (repostStatus !== null) {
            progressData[repostStatus ? "repostSent" : "repostFailed"] = (parseInt(progressData[repostStatus ? "repostSent" : "repostFailed"]) + 1).toString();
        }
        if (commentStatus !== null) {
            progressData[commentStatus ? "commentSent" : "commentFailed"] = (parseInt(progressData[commentStatus ? "commentSent" : "commentFailed"]) + 1).toString();
        }
        let successTotal = data.postIndex;
        let progressPercent = totalPosts === 0 ? 0 : Math.round((successTotal / totalPosts) * 100);
        progressData.progressPercentage = `${progressPercent}%`;
        chrome.storage.local.set({ postResult, progressData, progressPercentage: progressPercent }, () => {
            console.log("✅ Updated postResult & progressData, percentage saved!");

            chrome.runtime.sendMessage({
                action: "postResultUpdated",
                postResult,
                progressData
            });
        });
    });
}

var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://fonts.googleapis.com/css2?family=Karla:wght@400;500&display=swap';
document.head.appendChild(link);

async function sleep(s) {
    await new Promise(resolve => setTimeout(resolve, 1000 * s))
}
async function topclick() {
    console.log("call top function");
    let result = false;

    while (!result) {
        await sleep(4);
        console.log("Click top button");
        await smoothScroll(600, 600);
        await sleep(1);
        console.log("Scrolled page 1000px");
        let anchor = await waitForElement("a", 5);
        if (anchor) {
            anchor.setAttribute("tabindex", "-1");
            console.log("Anchor element found!");
        } else {
            console.log("Anchor element not found!");
        }
        await sleep(2);
        let anchorElement = await waitForElement(".css-175oi2r.r-18u37iz.r-1q142lx > a", 5);
        if (anchorElement) {
            let hrefValue = anchorElement.getAttribute("href");
            console.log("Anchor href:", hrefValue);
            let url = `https://x.com${hrefValue}`;
            console.log("url", url);
            let currenturl = await checkAndStoreUrl(url);
            console.log("currenturl", currenturl);
            if (!currenturl) {
                console.log("Record already found, calling backButtonClick()...");
                await sleep(2);
                await smoothScroll(800, 500);
                await sleep(1);
            } else {
                await sleep(1);
                let timeElement = await waitForElement("a > time", 5);
                if (timeElement) {
                    timeElement.click();
                    console.log("Clicked on <time> inside <a>");
                } else {
                    console.log("<time> inside <a> not found!");
                }

                await sleep(2);
                await postclick();
                await sleep(1);

                try {
                    await backButtonClick();
                    await sleep(2);
                    console.log("Back button clicked successfully.");
                } catch (error) {
                    console.log("Error in backButtonClick:", error);
                }
                await sleep(1);
                console.log("Scrolled page 800px");
                console.log("Process completed");
                result = true;
            }
        } else {
            console.log("Anchor element not found!");
        }
    }
}
async function smoothScroll(distance, duration) {
    return new Promise((resolve) => {
        let start = window.pageYOffset;
        let startTime = performance.now();
        function scrollStep(currentTime) {
            let elapsed = currentTime - startTime;
            let progress = Math.min(elapsed / duration, 1);
            window.scrollTo(0, start + distance * progress);

            if (progress < 1) {
                requestAnimationFrame(scrollStep);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(scrollStep);
    });
}
async function waitForElement(selector, timeout = 5) {
    let elapsedTime = 0;
    while (elapsedTime < timeout * 1000) {
        let element = document.querySelector(selector);
        if (element) return element;
        await sleep(0.5);
        elapsedTime += 500;
    }
    return null;
}

async function latest() {
    console.log("call latest  function");
    let result = false;
    await new Promise(resolve => setTimeout(resolve, 4000));
    document.querySelectorAll("a").forEach(link => {
        if (link.textContent.includes("Latest")) {
            link.click();
        }
    });
    await sleep(2);
    while (!result) {
        let anchor = document.querySelector("a");
        if (anchor) {
            anchor.setAttribute("tabindex", "-1");
        } else {
            console.log("Anchor element not found!");
        }
        let timeElement = document.querySelector("a > time");
        if (timeElement) {
            timeElement.click();
            console.log("Clicked on <time> inside <a>");
        } else {
            console.log("<time> inside <a> not found!");
        }
        await sleep(2);
        let path = window.location.pathname;
        let url = `https://x.com${path}`;
        console.log("Page Path:", url);
        result = await checkAndStoreUrl(url);
        console.log("Exists:", result);
        if (!result) {
            console.log("🚨 Record alrady  found, calling backButtonClick()...");
            await backButtonClick();
            await sleep(2);
            window.scrollBy({
                top: 1000,
                left: 0,
                behavior: "smooth"
            });
        } else {

            await postclick()

            try {
                await backButtonClick();
                console.log("Back button clicked successfully.");
            } catch (error) {
                console.log("Error in backButtonClick:", error);
            }
            await sleep(1);
        }
    };
    document.querySelectorAll("a").forEach(link => {
        if (link.textContent.includes("Top")) {
            link.click();
        }
    });
    await sleep(1);
}
async function postclick() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
        await sleep(2);
        if (action.Likecheckbox) {
            try {
                await likeclick();
                console.log("LikeClick executed successfully.");
            } catch (error) {
                console.log("Error in likeclick:", error);
            }
        }
        if (action.repostcheckbox) {
            try {
                await repost();
                console.log("Repost executed successfully.");
                await sleep(1)
            } catch (error) {
                console.log("Error in repost:", error);
            }
        }
        if (action.commentcheckbox) {
            try {
                await addComment();
                console.log("addComment executed successfully.");
            } catch (error) {
                console.log("Error in addComment:", error);
            }
        }
    } catch (error) {
        console.log("Unexpected error in postclick function:", error);
    }
}

async function repost() {
    let retweetButtons = Array.from(document.querySelectorAll("button[data-testid='retweet']"));
    if (retweetButtons.length > 0) {

        if (searchType == "latest") {
            console.log("latest");
            retweetButtons[retweetButtons.length - 1].click();
            console.log("Clicked the last 'Repost' button.");
            await sleep(1)
            document.querySelector('[data-testid="retweetConfirm"]').click();
            console.log("Clicked the repost button!");
            await sleep(1)
        } else {
            await sleep(1)
            document.querySelector("button[data-testid='retweet']").click();
            console.log("Clicked the repost bbbbb");
            await sleep(2)
            document.querySelector('[data-testid="retweetConfirm"]').click();
            console.log("Clicked the repost button!");
            await sleep(2)
        }
        repostStatus = true;
        console.log("repostStatus status is true ");
    } else {
        console.log("No 'Repost' button found.");
        repostStatus = false;
    }
    await sleep(1);
}

async function likeclick() {
    let likeButtons = Array.from(document.querySelectorAll("button[data-testid='like']"));
    if (likeButtons.length > 0) {
        if (searchType == "latest") {
            console.log("latest");
            likeButtons[likeButtons.length - 1].click();
            console.log("Clicked the last Like button!");
        } else {
            document.querySelector("button[data-testid='like']").click();
            console.log("Clicked the first Like button!");
        }

        likeStatus = true;
    } else {
        console.log("No Like buttons found!");
        likeStatus = false;

    }
}
async function backButtonClick() {
    try {
        let backButton = document.querySelector('button[data-testid="app-bar-back"]');
        if (!backButton) {
            backButton = document.querySelector("div.css-175oi2r.r-1pz39u2.r-1777fci.r-15ysp7h.r-1habvwh.r-s8bhmr > button > div");
        }
        if (backButton) {
            backButton.click();
        } else {
            window.history.back();
        }
    } catch (error) {
        console.log("backButtonClick Error", error);
        window.history.back();
    }
}

function parseUrl(url) {
    const match = url.match(/https:\/\/x\.com\/([^/]+)\/status\/(\d+)/);
    if (match) {
        console.log("match", match);
        return { id: match[2], username: match[1] };
    }
    return null;
}

async function checkAndStoreUrl(url) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["storedUrls"], (result) => {
            let data = result.storedUrls || [];
            const parsedData = parseUrl(url);
            if (!parsedData) {
                console.log("Invalid URL format");
                resolve(false);
                return;
            }
            const exists = data.some(item => item.id === parsedData.id && item.username === parsedData.username);
            if (exists) {
                console.log(`Record exists:`, parsedData);
                resolve(false);
            } else {
                data.push(parsedData);
                chrome.storage.local.set({ storedUrls: data }, () => {
                    console.log(`Added new record:`, parsedData);
                    console.log("url=======>", url);
                    postDetails = url.replace("https://x.com/", "");
                    console.log("postDetails------------>", postDetails);
                    resolve(true);
                });
            }
        });
    });
}

async function getLastQueryParam() {
    let urlParams = new URLSearchParams(window.location.search);
    let lastParam = [...urlParams.entries()].pop();
    if (lastParam) {
        console.log("✅ Last URL Parameter:", lastParam[0], "=", lastParam[1]);
        return lastParam[1];
    } else {
        console.log("🚨 No query parameters found in the URL.");
        return null;
    }
}
async function legacyPeopleFlow() {
    let result = false;
    if (attempt == undefined) {
        attempt = 1;
    }
    await sleep(1);
    let path = window.location.pathname;
    console.log(path);

    let url = `https://x.com${path}`;
    console.log("Page Path:", url);
    let currentTab = await getLastQueryParam()
    console.log("currentTab", currentTab);
    if (currentTab !== "user") {
        console.log("click people ");
        await sleep(1)

        document.querySelectorAll("a").forEach(link => {
            if (link.textContent.includes("People")) {
                link.click();
            }
        });

        await sleep(2)
    }
    let safetyCounter = 0;
    while (!result && safetyCounter < 10) {
        safetyCounter++;
        await sleep(2)
        console.log("Click people button");
        let peopleclick = document.querySelector(`#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > div.css-175oi2r.r-kemksi.r-1kqtdi0.r-1ua6aaf.r-th6na.r-1phboty.r-16y2uox.r-184en5c.r-1abdc3e.r-1lg4w6u.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div > div:nth-child(3) > section > div > div > div:nth-child(${attempt}) > div > div > button > div > div.css-175oi2r.r-1iusvr4.r-16y2uox > div.css-175oi2r.r-1awozwy.r-18u37iz.r-1wtj0ep`)

        await sleep(1)
        if (!peopleclick) {
            console.warn("Unable to locate a profile entry in People search results.");
            break;
        }
        await peopleclick.click()
        await sleep(1)
        window.scrollBy({
            top: 300,
            left: 0,
            behavior: "smooth"
        });
        await sleep(1);
        let anchor = document.querySelector("a");
        if (anchor) {
            anchor.setAttribute("tabindex", "-1");
        } else {
            console.log("Anchor element not found!");
        }
        let anchorElement = document.querySelector(".css-175oi2r.r-18u37iz.r-1q142lx > a");
        if (anchorElement) {
            let hrefValue = anchorElement.getAttribute("href");
            console.log("Anchor href:", hrefValue);
            let url = `https://x.com${hrefValue}`;
            console.log("url", url);
            let currenturl = await checkAndStoreUrl(url);
            console.log("currenturl", currenturl);
            if (!currenturl) {
                await backButtonClick();
                await sleep(1);
                attempt++;
                console.log("attempt==>", attempt);
                window.scrollBy({
                    top: 100,
                    left: 0,
                    behavior: "smooth"
                });
            } else {
                let timeElement = document.querySelector("a > time");
                timeElement.click();
                console.log("Clicked on <time> inside <a>")
                attempt++;
                console.log("attempt--", attempt);
                window.scrollBy({
                    top: 100,
                    left: 0,
                    behavior: "smooth"
                });
                await postclick()
                await sleep(1);
                try {
                    await backButtonClick();
                    console.log("Back button clicked successfully.");
                } catch (error) {
                    console.log("Error in backButtonClick:", error);
                }
                await sleep(1);
                await backButtonClick();
                await sleep(2);
                result = true
                window.scrollBy({
                    top: 100,
                    left: 0,
                    behavior: "smooth"
                });
            }
        } else {
            console.log("<time> inside <a> not found!");
            console.log(" Record alrady  found, calling backButtonClick()...");
            await sleep(2);
            await backButtonClick();
            await sleep(2);
            attempt++;
            console.log("attempt", attempt);
            window.scrollBy({
                top: 150,
                left: 0,
                behavior: "smooth"
            });
        }
    }
    window.scrollBy({
        top: 150,
        left: 0,
        behavior: "smooth"
    });
    return result;
}

async function people() {
    if (normalizedProfileHandle) {
        const handled = await targetedPeopleFlow();
        if (handled === "navigating") {
            return "navigating";
        }
        if (handled) {
            return true;
        }
        if (window.location.pathname.startsWith('/search')) {
            console.warn("Targeted profile failed, falling back to legacy people search flow.");
            normalizedProfileHandle = null;
            targetedProfileReady = false;
        } else {
            console.warn("Targeted profile flow could not process a tweet and fallback is not applicable on this page.");
            return false;
        }
    }
    return await legacyPeopleFlow();
}

async function media() {
    console.log("🚀 CLICK ON MEDIA TAB");
    await sleep(1);
    let path = window.location.pathname;
    console.log(path);
    let url = `https://x.com${path}`;
    console.log("Page Path:", url);
    let currentTab = await getLastQueryParam()
    await sleep(1)
    console.log("currentTab>:", currentTab);
    if (currentTab !== "media") {
        console.log("click media ");

        document.querySelectorAll("a").forEach(link => {
            if (link.textContent.includes("Media")) {
                link.click();
            }
        });
    }
    await sleep(2);
    while (true) {
        let mediaItems = document.querySelectorAll('a[href*="/status/"] img');
        for (let image of mediaItems) {
            let anchorTag = image.closest("a");
            if (!anchorTag) continue;
            let hrefValue = anchorTag.getAttribute("href");
            if (!hrefValue) continue;
            let url = `https://x.com${hrefValue}`;
            console.log("🔍 Found Media URL:", url);
            let isStored = await checkAndStoreUrl(url);
            console.log("isStored:", isStored);
            if (isStored === true) {
                console.log(`✅ New URL added: ${url}. Stopping loop.`);
                anchorTag.click();
                await postclick()
                await sleep(1);
                await document.querySelector('#layers > div:nth-child(2) > div > div > div > div > div > div.css-175oi2r.r-1ny4l3l.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv.r-1awozwy > div.css-175oi2r.r-1wbh5a2.r-htvplk.r-1udh08x.r-17gur6a.r-1pi2tsx.r-13qz1uu > div > div.css-175oi2r.r-16y2uox.r-1wbh5a2 > div.css-175oi2r.r-1awozwy.r-1loqt21.r-1777fci.r-xyw6el.r-u8s1d.r-ipm5af.r-1d2f490.r-1ny4l3l').click()
                return;
            } else {
                console.log(`🚫 URL already exists: ${url}. Scrolling...`);
                window.scrollBy({
                    top: 50,
                    left: 0,
                    behavior: "smooth"
                });
                await sleep(1);
            }
        }
        await sleep(5);
    }
}

async function addComment() {
    let inputElement = document.querySelector("div.DraftEditor-editorContainer div div div div");
    if (inputElement) {
        console.log("✅ Comment box found. Clicking now...");
        inputElement.click();
        await sleep(1);
        console.log(`⌨ Typing "${comment}" in the comment box...`);
        inputElement.focus();
        inputElement.textContent = comment;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(2);
        let uploadSuccess = await uploadMediaFromLocalPath(mediaFilePath, mediaType);
        if (mediaType === "video") {
            console.log("⌛ Waiting for video processing completion...");
            await waitForVideoProcessingCompletion();
        }
        await sleep(2)
        // let replyButton = document.querySelector("div.css-175oi2r.r-kemksi.r-jumn1c.r-xd6kpl.r-gtdqiz.r-ipm5af.r-184en5c > div:nth-child(2) > div > div > div > button")

        // await sleep(2)

        // if (replyButton) {
        //     await replyButton.click();
        //     console.log("✅ Clicked the Reply button successfully!");
        //     commentStatus = true;

        // } else {
        //     console.log(" Reply button not found!");
        //     commentStatus = false;
        // }
         let replyButton = document.querySelector('button[data-testid="tweetButtonInline"]');

        if (replyButton && !replyButton.disabled && replyButton.offsetParent !== null) {
            replyButton.scrollIntoView({ behavior: 'smooth' });
            replyButton.focus();
            await sleep(0.5);
            replyButton.click();
            console.log("✅ Clicked the Reply button successfully!");
            commentStatus = true;
        } else {
            console.warn("❌ Reply button not found, disabled, or hidden.");
            commentStatus = false;
        }
    } else {
        console.log(" Comment input field not found!");
        commentStatus = false;
    }
}

async function waitForElement(selector, timeout = 20000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        function check() {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else if (Date.now() - startTime >= timeout) {
                reject(new Error(`Timeout: ${selector} not found`));
            } else {
                setTimeout(check, 500);
            }
        }
        check();
    });
}

async function waitForVideoProcessingCompletion(timeout = 180000, interval = 3000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        function checkProcessingStatus() {
            const videoPreview = document.querySelector('[data-testid="attachments"] video');
            const uploadProgress = document.querySelector('[aria-valuenow]');
            const processingText = [...document.querySelectorAll("span")].find(el => el.innerText.includes("Your video is being processed"));
            const uploaded100 = [...document.querySelectorAll("span")].find(el => el.innerText.includes("Uploaded (100%)"));
            if (videoPreview && (uploaded100 || (!uploadProgress && !processingText))) {
                console.log("Video fully uploaded and processed!");
                resolve();
                return;
            }
            if (Date.now() - startTime >= timeout) {
                reject(new Error("Upload timeout! Video was not fully processed."));
                return;
            }
            console.log("⌛ Waiting for video processing to complete...");
            setTimeout(checkProcessingStatus, interval);
        }
        checkProcessingStatus();
    });
}

async function uploadMediaFromLocalPath(base64String, mediaType) {
    try {
        if (!base64String) {
            console.log("No file select.....!");
            return;
        }
        console.log(`⌛ Waiting for Twitter file input to upload ${mediaType}...`);
        let fileInput = await waitForElement("input[type='file']", 15000);
        console.log(`✅ File input found! Uploading ${mediaType}...`);
        let blob = await (await fetch(`data:${mediaType === "image" ? "image/jpeg" : "video/mp4"};base64,${base64String}`)).blob();
        let fileName = mediaType === "image" ? "upload_image.jpg" : "upload_video.mp4";
        let fileType = mediaType === "image" ? "image/jpeg" : "video/mp4";
        let file = new File([blob], fileName, { type: fileType });

        let dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(`✅ ${mediaType} upload triggered. Waiting for completion...`);
        let mediaPreviewSelector = '[data-testid="attachments"] img, [data-testid="attachments"] video';
        await waitForElement(mediaPreviewSelector, 20000);
        if (mediaType === "video") {
            console.log("⌛ Waiting for video processing completion...");
            await waitForVideoProcessingCompletion();
            console.log("✅ Video fully processed!");
            window.scrollBy({ top: 600, left: 0, behavior: "smooth" });
            await sleep(2);
        }
        console.log(`✅ ${mediaType} is fully processed and ready!`);
    } catch (error) {
        console.log(` Error uploading ${mediaType}:`, error);
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

function isOnTargetProfilePage() {
    if (!normalizedProfileHandle) {
        return false;
    }
    const currentPath = window.location.pathname.toLowerCase();
    const handlePath = `/${normalizedProfileHandle.toLowerCase()}`;
    return currentPath === handlePath || currentPath.startsWith(`${handlePath}/`);
}

async function targetedPeopleFlow() {
    try {
        const ready = await ensureTargetProfileReady();
        if (ready === "navigating") {
            return "navigating";
        }
        if (!ready) {
            console.warn("Target profile could not be prepared.");
            return false;
        }
        const anchor = await findNextTweetOnProfile();
        if (!anchor) {
            console.warn("No new tweets found on target profile.");
            return false;
        }
        const timeElement = anchor.querySelector('time');
        if (timeElement) {
            timeElement.click();
        } else {
            anchor.click();
        }
        await sleep(2);
        await postclick();
        await safelyReturnToProfileTimeline();
        return true;
    } catch (error) {
        console.error("Error during targeted people flow:", error);
        return false;
    }
}

async function ensureTargetProfileReady() {
    if (!normalizedProfileHandle) {
        return false;
    }
    if (targetedProfileReady && isOnTargetProfilePage()) {
        return true;
    }
    if (isOnTargetProfilePage()) {
        targetedProfileReady = true;
        return true;
    }
    const path = window.location.pathname;
    if (path.startsWith(`/search`)) {
        await selectPeopleTab();
        const profileLink = await findProfileLinkForHandle(normalizedProfileHandle);
        if (!profileLink) {
            console.warn("Unable to locate target profile in People results.");
            return false;
        }
        profileLink.click();
        const navigated = await waitForCondition(() => isOnTargetProfilePage(), 12000, 300);
        targetedProfileReady = navigated;
        return navigated;
    }
    const navigationRequested = await requestProfileNavigation(normalizedProfileHandle);
    if (navigationRequested) {
        targetedProfileReady = false;
        return "navigating";
    }
    console.warn("Unable to trigger navigation to target profile.");
    return false;
}

async function selectPeopleTab() {
    const currentTab = await getLastQueryParam();
    if (currentTab === "user") {
        return;
    }
    const tabLinks = Array.from(document.querySelectorAll('a[role="tab"], div[role="tab"] > a'));
    const peopleTab = tabLinks.find(link => link.textContent.trim().toLowerCase() === "people");
    if (peopleTab) {
        peopleTab.click();
        await sleep(2);
    }
}

async function findProfileLinkForHandle(handle, maxScrollAttempts = 6) {
    const targetPath = `/${handle.toLowerCase()}`;
    for (let attemptIndex = 0; attemptIndex < maxScrollAttempts; attemptIndex++) {
        const links = Array.from(document.querySelectorAll('a[href^="/"]'));
        const match = links.find(link => {
            const href = (link.getAttribute('href') || '').toLowerCase().split('?')[0].replace(/\/+$/, '');
            if (href !== targetPath) {
                return false;
            }
            const text = (link.textContent || '').toLowerCase();
            return text.includes(`@${handle.toLowerCase()}`) || link.getAttribute('role') === 'link';
        });
        if (match) {
            return match;
        }
        window.scrollBy({ top: 600, left: 0, behavior: "smooth" });
        await sleep(1.5);
    }
    return null;
}

async function waitForCondition(conditionFn, timeoutMs = 10000, intervalMs = 250) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            if (conditionFn()) {
                return true;
            }
        } catch (error) {
            console.warn("waitForCondition check error:", error);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
}

async function findNextTweetOnProfile(maxScrollAttempts = 6) {
    for (let attemptIndex = 0; attemptIndex < maxScrollAttempts; attemptIndex++) {
        const anchors = Array.from(document.querySelectorAll('article a[href*="/status/"]')).filter(anchor => anchor.querySelector('time'));
        for (const anchor of anchors) {
            const href = anchor.getAttribute('href');
            if (!href) {
                continue;
            }
            const url = `https://x.com${href}`;
            const isNew = await checkAndStoreUrl(url);
            if (isNew) {
                return anchor;
            }
        }
        window.scrollBy({ top: 800, left: 0, behavior: "smooth" });
        await sleep(2);
    }
    return null;
}

async function safelyReturnToProfileTimeline() {
    await sleep(1);
    await backButtonClick();
    await sleep(2);
    if (normalizedProfileHandle && !isOnTargetProfilePage()) {
        await waitForCondition(() => isOnTargetProfilePage(), 8000, 300);
    }
}

function requestProfileNavigation(handle) {
    return new Promise((resolve) => {
        const normalized = normalizeHandle(handle);
        if (!normalized) {
            resolve(false);
            return;
        }
        try {
            chrome.runtime.sendMessage({ action: "navigateToProfile", handle: normalized }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Navigation message error:", chrome.runtime.lastError.message);
                    resolve(false);
                    return;
                }
                resolve(response && response.status === "ok");
            });
        } catch (error) {
            console.warn("Failed to request profile navigation:", error);
            resolve(false);
        }
    });
}




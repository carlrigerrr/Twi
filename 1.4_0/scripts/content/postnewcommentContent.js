console.log(" started! ---- twitter - 1");
var keyword;
var total_comment
var comment
var action
var searchType
var attempt;
var minVal;
var maxVal;
var mediaFilePath;
var mediaType;
var likeStatus = null;
var commentStatus = null;
var repostStatus = null;
var postcommentResult = []
var postDetails = ""
var postisPaused;
var postcommentpostIndex;

var searchkeyword;

chrome.storage.local.get(["postcommentResult"], (result) => {
    postcommentResult = result.postcommentResult || [];
});
async function waitForResume() {
    console.log("postcommentisPaused befor while", postisPaused);
    const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['postcommentisPaused'], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
    console.log("ispaused==>", result.postcommentisPaused);
    postisPaused = result.postcommentisPaused

    console.log("postisPaused===>", postisPaused);
    if (postisPaused == false) {
        return false;
    } else {
        return true
    }
}
chrome.storage.local.get(["postCommentkeyword", "postCommentoptions", "postcommentText", "postCommentsearchType", 'maxVal', 'minVal', 'postmediaFilePath', 'postCommentmediaType', 'postcommentisPaused', 'postcommentpostIndex', 'postcommentResult'], async (result) => {
    console.log("Retrieved Data:", result);
    console.log("ispaused", result.postcommentisPaused);
    postcommentpostIndex = result.postcommentpostIndex
    console.log("postcommentpostIndex", postcommentpostIndex);
    console.log("postcommentResult", result.postcommentResult);
    if (postcommentpostIndex === 0) {
        console.log("postindex value is 0");

        postcommentResult = [];
        chrome.storage.local.set({ postcommentResult: [] }, () => {
            console.log("🔄 postcommentResult has been reset because postcommentpostIndex is 0");
        });
    } else {
        postcommentResult = result.postcommentResult;
        console.log("postindex value is not 0");

    }
    minVal = result.minVal;
    maxVal = result.maxVal;
    keyword = result.postCommentkeyword
    total_comment = keyword.length;
    action = result.postCommentoptions;
    comment = result.postcommentText;
    searchType = result.postCommentsearchType;
    mediaFilePath = result.postmediaFilePath
    mediaType = result.postCommentmediaType

    console.log("mediaType", mediaType);
    console.log("action", action);
    if (!searchType) {
        console.log("No search type provided, exiting script.");
        return;
    }
    for (index = postcommentpostIndex; index < total_comment; index++) {
        console.log("index--->", index);
        console.log("keyword", keyword[index]);
        searchkeyword = keyword[index]

        await sleep(1)
        let timeout = await waitForResume();
        console.log("timeout--->", timeout);
        await sleep(1)

        if (timeout == false) {
            console.log("breck loop here ");
            break;
        }
        else {

            await searchUsername(keyword[index]);
            await sleep(2);
            await goToPeopleTab();
            await sleep(1);
            await clickFirstUserProfile();
            await sleep(1);
            const { tweet, isPinned } = await scrollToFirstTweet();
            if (tweet) {
                console.log("Tweet found. Pinned:", isPinned);
            } else {
                console.log("No tweet found.");
            }

            await indexupdate(index)

            await topclick()


            let parts = postDetails.split("/status/");
            console.log("parts", parts);
            if (parts.length !== 2) {
                console.log("length is 0");
                parts = [searchkeyword, '']

            }

            postcommentResult.push({ username: parts[0], tweetId: parts[1], likeStatus: likeStatus, commentStatus: commentStatus, repostStatus: repostStatus, });
            console.log("postcommentResult", postcommentResult);

            sendStatusToBackground(true, "account add comment successful", likeStatus, commentStatus, repostStatus, postcommentResult);
            let staticInteval = await getRandomNumber(minVal, maxVal)
            console.log("staticInteval", staticInteval);
            await sleep(staticInteval)
            likeStatus = null;
            commentStatus = null;
            repostStatus = null;

            console.log("all process completed");
        }
    }

});
async function sleep(s) {
    await new Promise(resolve => setTimeout(resolve, 1000 * s))
}
async function indexupdate(index) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ postcommentpostIndex: index + 1 }, () => {
            console.log("🔄 Updated postIndex to:", index);
            resolve();
        });
    });
}

async function getRandomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sendStatusToBackground(status, message, likeStatus, commentStatus, repostStatus) {
    chrome.storage.local.get(["postcommentprogressData", "postcommentpostIndex", "numberofpost", "postCommentkeyword"], (data) => {
        let postcommentprogressData = data.postcommentprogressData || {
            postCommentlikeSent: "0",
            postCommentlikeFailed: "0",
            postCommentrepostSent: "0",
            postCommentrepostFailed: "0",
            postCommentSent: "0",
            postCommentFailed: "0",
            postCommentprogressPercentage: "0%"
        };

        let postIndex = data.postcommentpostIndex || 0;
        let totalPosts = data.postCommentkeyword.length || 0;


        if (likeStatus !== null) {
            postcommentprogressData[likeStatus ? "postCommentlikeSent" : "postCommentlikeFailed"] = (parseInt(postcommentprogressData[likeStatus ? "postCommentlikeSent" : "postCommentlikeFailed"]) + 1).toString();
        }
        if (repostStatus !== null) {
            postcommentprogressData[repostStatus ? "postCommentrepostSent" : "postCommentrepostFailed"] = (parseInt(postcommentprogressData[repostStatus ? "postCommentrepostSent" : "postCommentrepostFailed"]) + 1).toString();
        }
        if (commentStatus !== null) {
            postcommentprogressData[commentStatus ? "postCommentSent" : "postCommentFailed"] = (parseInt(postcommentprogressData[commentStatus ? "postCommentSent" : "postCommentFailed"]) + 1).toString();
        }
        let successTotal = data.postcommentpostIndex;
        console.log("successTotal", successTotal);

        let progressPercent = totalPosts === 0 ? 0 : Math.round((successTotal / totalPosts) * 100);
        postcommentprogressData.postCommentprogressPercentage = `${progressPercent}%`;
        chrome.storage.local.set({ postcommentResult, postcommentprogressData, postCommentprogressPercentage: progressPercent }, () => {
            console.log(" Updated postcommentResult & postcommentprogressData, percentage saved!");

            chrome.runtime.sendMessage({
                action: "postcommentResultUpdated",
                postcommentResult,
                postcommentprogressData
            });
        });
    });
}

async function searchUsername(username) {
    console.log("Starting username search:", username);
    const exploreBtn = document.querySelector('[data-testid="AppTabBar_Explore_Link"]');
    if (!exploreBtn) {
        console.log("Explore button not found");
        return;
    }
    exploreBtn.click();
    console.log("Clicked Explore tab");
    await sleep(2);
    const searchInput = document.querySelector('input[data-testid="SearchBox_Search_Input"]');
    if (!searchInput) {
        console.log("Search input not found");
        return;
    }

    searchInput.value = username;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    searchInput.focus();
    console.log("Typed username");

    await sleep(1);
    const firstSuggestion = document.querySelector('div[role="listbox"] div[role="option"]');
    if (firstSuggestion) {
        console.log("Clicking first suggestion");
        firstSuggestion.click();
        return;
    }

    console.log("No suggestion found, updating URL directly");
    const query = encodeURIComponent(username);
    const url = `/search?q=${query}&src=typed_query`;
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
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
async function clickFirstUserProfile() {
    console.log(" Trying to click first user profile...");
    await sleep(1);
    const firstUserButton = document.querySelector('button[data-testid="UserCell"]');
    if (firstUserButton) {
        firstUserButton.click();
        console.log(" Clicked first user profile");
    } else {
        console.log("First user profile button not found");
    }
}
async function goToPeopleTab() {
    console.log("🌐 Clicking People tab...");
    let peopleTab = [...document.querySelectorAll("a")].find(a => a.textContent.includes("People"));
    if (peopleTab) {
        peopleTab.click();
        await sleep(2);
    } else {
        console.log("People tab not found.");
    }
}
async function scrollToFirstTweet(maxScrolls = 10, scrollDelay = 1000) {
    let attempts = 0;

    while (attempts < maxScrolls) {
        const tweet = document.querySelector('article[role="article"], div[data-testid="tweet"]');
        if (tweet) {
            const pinnedLabel = tweet.querySelector('[data-testid="socialContext"]');
            const isPinned = pinnedLabel && pinnedLabel.textContent.includes("Pinned");

            console.log(isPinned ? "Found pinned tweet" : "Found non-pinned tweet");
            return { tweet, isPinned };
        }

        window.scrollBy(0, window.innerHeight);
        await new Promise(resolve => setTimeout(resolve, scrollDelay));
        attempts++;
    }

    console.log(" Could not find any tweet after scrolling");
    return { tweet: null, isPinned: false };
}

async function topclick() {
    console.log("Starting topclick()");
    let result = false;

    while (!result) {
        await sleep(2);
        console.log("🔍 Scanning for tweets...");

        const tweets = Array.from(document.querySelectorAll('article[role="article"], div[data-testid="tweet"]'));

        if (!tweets.length) {
            console.log(" No tweets found, scrolling...");
            await smoothScroll(600, 600);
            continue;
        }

        let validTweet = null;

        for (let tweet of tweets) {
            const pinnedLabel = tweet.querySelector('[data-testid="socialContext"]');
            const isPinned = pinnedLabel && pinnedLabel.textContent.includes("Pinned");

            if (searchType === "first" && isPinned) {
                console.log("Skipping pinned tweet (searchType = first)");
                continue;
            }

            if (searchType === "pinned" && !isPinned) {
                console.log("Tweet is NOT pinned (searchType = pinned). Skipping all actions.");
                const timeEl = tweet.querySelector("a > time");
                if (timeEl) timeEl.click();
                await sleep(2);
                await backButtonClick();
                await sleep(2);
                return;
            }

            validTweet = tweet;
            break;
        }

        if (!validTweet) {
            console.log("↪️ No valid tweet found, scrolling...");
            await smoothScroll(600, 600);
            continue;
        }

        const anchorElement = validTweet.querySelector("a[href*='/status/']");
        if (!anchorElement) {
            console.log("No anchor found in tweet, skipping...");
            await smoothScroll(600, 600);
            continue;
        }

        const hrefValue = anchorElement.getAttribute("href");
        const url = `https://x.com${hrefValue}`;
        console.log("🧭 Found tweet URL:", url);

        const currenturl = await checkAndStoreUrl(url);
        if (!currenturl) {
            console.log("🔁 Tweet already processed. Scrolling...");
            await smoothScroll(600, 600);
            continue;
        }

        const timeElement = validTweet.querySelector("a > time");
        if (timeElement) {
            timeElement.click();
            console.log("🕓 Clicked tweet time to open post");
        } else {
            console.log("<time> element not found, skipping...");
            continue;
        }

        await sleep(2);

        if (searchType === "pinned") {
            console.log("Pinned tweet confirmed — processing like/repost/comment...");
        }

        await postclick();
        await sleep(1);

        try {
            await backButtonClick();
            await sleep(2);
            console.log("🔙 Returned to timeline");
        } catch (error) {
            console.log("⚠️ Error in backButtonClick:", error);
        }

        result = true;
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
            console.log("data", data);

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

function parseUrl(url) {
    const match = url.match(/https:\/\/x\.com\/([^/]+)\/status\/(\d+)/);
    if (match) {
        console.log("match", match);
        return { id: match[2], username: match[1] };
    }
    return null;
}
async function postclick() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
        await sleep(2);
        if (action.postCommentLikecheckbox) {
            try {
                await likeclick();
                console.log("LikeClick executed successfully.");
            } catch (error) {
                console.log("Error in likeclick:", error);
            }
        }
        if (action.postCommentrepostcheckbox) {
            try {
                await repost();
                console.log("Repost executed successfully.");
                await sleep(1)
            } catch (error) {
                console.log("Error in repost:", error);
            }
        }
        if (action.postCommentcheckbox) {
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
async function addComment() {
    let inputElement = document.querySelector("div.DraftEditor-editorContainer div div div div");
    if (inputElement) {
        console.log(" Comment box found. Clicking now...");
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

        await sleep(2);
        let replyButton = document.querySelector('button[data-testid="tweetButtonInline"]');

        if (replyButton && !replyButton.disabled && replyButton.offsetParent !== null) {
            replyButton.scrollIntoView({ behavior: 'smooth' });
            replyButton.focus();
            await sleep(0.5);
            replyButton.click();
            console.log(" Clicked the Reply button successfully!");
            commentStatus = true;
        } else {
            console.log(" Reply button not found, disabled, or hidden.");
            commentStatus = false;
        }

    } else {
        console.log(" Comment input field not found!");
        commentStatus = false;
    }
}
async function backButtonClick() {
    try {
        document.querySelector("div.css-175oi2r.r-1pz39u2.r-1777fci.r-15ysp7h.r-1habvwh.r-s8bhmr > button > div").click();
    } catch (error) {
        console.log("backButtonClick Error", error)
    }
}
async function uploadMediaFromLocalPath(base64String, mediaType) {
    try {
        if (!base64String) {
            console.log("No file select.....!");
            return;
        }
        console.log(`⌛ Waiting for Twitter file input to upload ${mediaType}...`);
        let fileInput = await waitForElement("input[type='file']", 15000);
        console.log(` File input found! Uploading ${mediaType}...`);
        let blob = await (await fetch(`data:${mediaType === "image" ? "image/jpeg" : "video/mp4"};base64,${base64String}`)).blob();
        let fileName = mediaType === "image" ? "upload_image.jpg" : "upload_video.mp4";
        let fileType = mediaType === "image" ? "image/jpeg" : "video/mp4";
        let file = new File([blob], fileName, { type: fileType });

        let dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(` ${mediaType} upload triggered. Waiting for completion...`);
        let mediaPreviewSelector = '[data-testid="attachments"] img, [data-testid="attachments"] video';
        await waitForElement(mediaPreviewSelector, 20000);
        if (mediaType === "video") {
            console.log("⌛ Waiting for video processing completion...");
            await waitForVideoProcessingCompletion();
            console.log(" Video fully processed!");
            window.scrollBy({ top: 600, left: 0, behavior: "smooth" });
            await sleep(2);
        }
        console.log(` ${mediaType} is fully processed and ready!`);
    } catch (error) {
        console.log(` Error uploading ${mediaType}:`, error);
    }
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

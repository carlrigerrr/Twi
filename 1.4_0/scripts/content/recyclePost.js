console.log("recycle Post tab");
let recyclePostData = []
let recyclekeyword = "";
let geminiApiKey = ""
let threadPostData = []
const extraImageAddPostIndex = [];
async function sleep(s) {
    await new Promise(resolve => setTimeout(resolve, 1000 * s))
}
async function newtweet() {
    const threadRecycleUrl = await new Promise((resolve, reject) => {
        chrome.storage.local.get(["threadRecyclekeyword", "TweetOption"], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
    console.log("threadRecycleUrlget", threadRecycleUrl);
    if (threadRecycleUrl.TweetOption == "threadRecycle") {
        console.log("this function work to thread Recycle tweet");
        await threadRecycletweet()

    } else {
        console.log("this function Recycle tweet and samart tweet");
        await recycletweet()
    }
}
newtweet()
async function threadRecycletweet() {
    const RecycleKeyword = await getRecycleKeyword();
    if (RecycleKeyword == null) {
        sendStatusMessage("error", "plz Enter Valid Tweet URL to Recycle.");
        await sleep(1)
        return
    }
    let postAvailable = await checkForNoResults();
    if (postAvailable == false) {
        await sleep(1)
        sendStatusMessage("error", "Post not found. Please check the URL and try again.");
        await sleep(1)
        breck;
    }
    while (true) {
        await sleep(2);
        let findpost = await clickDynamicTweet();
        await sleep(1)
        if (findpost == false) {
            await sleep(1)
            sendStatusMessage("error", "Post not found. Please check the URL and try again.");
            await sleep(1)
            break;
        }
        await sleep(2);
        const currentPageURL = window.location.href;
        const url = new URL(currentPageURL);
        const path = url.pathname;
        const formattedPath = path.substring(1);
        if (formattedPath === RecycleKeyword) {
            console.log("Loop finished, formattedPath matches RecycleKeyword.");
            break;
        } else {
            console.log("No match. Continuing to click dynamic tweet...");
        }
    }
    await sleep(2)
    const threadTweets = await collectThreadPosts();
    threadPostData = [...threadTweets];
    await sleep(3)
    const homeButton = document.querySelector('[data-testid="AppTabBar_Home_Link"]');
    if (homeButton) {
        homeButton.click();
    } else {
        console.error("Home button not found!");
    }

    function smoothRedirectToCompose() {
        if (window.location.pathname === "/home") {
            window.history.replaceState(null, null, "/compose/post");
            window.dispatchEvent(new Event("popstate"));
        }
    }
    await sleep(1)
    smoothRedirectToCompose();
    await sleep(2)
    await multipleThredPost()
}
async function checkForNoResults() {
    const emptyStateHeader = document.querySelector('[data-testid="empty_state_header_text"]');

    if (emptyStateHeader && emptyStateHeader.textContent.includes('No results for')) {
        console.log('no post available plz check your post URL');
        return false;
    } else {
        console.log('Post is available.');
        return true;
    }
}

async function recycletweet() {
    const RecycleKeyword = await getRecycleKeyword();
    if (RecycleKeyword == null) {
        sendStatusMessage("error", "plz Enter Valid Tweet URL to Recycle.");
        await sleep(1)
        return
    }

    let postAvailable = await checkForNoResults();
    if (postAvailable == false) {
        await sleep(1)
        sendStatusMessage("error", "Post not found. Please check the URL and try again.");
        await sleep(1)
        breck;
    }
    while (true) {
        await sleep(2);
        let findpost = await clickDynamicTweet();
        if (findpost == false) {
            await sleep(1)
            sendStatusMessage("error", "Post not found. Please check the URL and try again.");
            await sleep(1)
            breck;
        }

        await sleep(2);
        const currentPageURL = window.location.href;
        const url = new URL(currentPageURL);
        const path = url.pathname;
        const formattedPath = path.substring(1);
        if (formattedPath === RecycleKeyword) {
            break;
        } else {
            console.log("No match. Continuing to click dynamic tweet...");
        }
    }
    await sleep(1)
    let tweetDetails = await extractFirstTweetData()
    recyclePostData.push(tweetDetails);
    await sleep(3)
    const firstPost = await getFirstPost();
    console.log("firstPost",firstPost);
    
    await sleep(1)
    if (firstPost == true) {
        const existingTweet = document.querySelector('div[role="link"].css-175oi2r.r-adacv');
        await existingTweet.click()
        await sleep(1)
        await newTweetQuote()
    } else {
        const element = document.querySelector('#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > header > div > div > div > div.css-175oi2r.r-1habvwh > div.css-175oi2r.r-15zivkp.r-1bymd8e.r-13qz1uu > nav > a:nth-child(1)');
        if (element) {
            element.click();
            await sleep(2)
            await clickAndPasteAndPostRecycle()
        }
    }
}

async function clickDynamicTweet() {
    const existingTweet = document.querySelector('div[role="link"].css-175oi2r.r-adacv');
    let timeElement = await waitForElement("a > time", 5);
    if (existingTweet) {
        existingTweet.click();
    } else if (timeElement) {
        let anchorElement = document.querySelector(".css-175oi2r.r-18u37iz.r-1q142lx > a");
        if (anchorElement) {
            let hrefValue = anchorElement.getAttribute("href");
            const tweetIdMatch = hrefValue.match(/\/status\/(\d+)$/);
            const tweetId = tweetIdMatch[1];
            const RecycleKeywordtext = await new Promise((resolve, reject) => {
                chrome.storage.local.get("recyclekeyword", (data) => {
                    if (data.recyclekeyword) {
                        resolve(`/${data.recyclekeyword}`);
                    } else {
                        resolve("not found");
                    }
                });
            });
            const tweetIdrecycle = RecycleKeywordtext.match(/\/status\/(\d+)$/);
            let RecycleKeywordid = tweetIdrecycle[1]
            if (RecycleKeywordid == tweetId) {
                timeElement.click();
            }
            else {
                return false
            }
        }
    }
    else {
        console.log("not get repost in post");
        await sleep(1)
        return false;
    }
}

function getRecycleKeyword() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["recyclekeyword"], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.recyclekeyword);
            }
        });
    });
}
async function clickAndPasteAndPostRecycle() {
    const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!tweetBox) {
        console.log("Tweet box not found!");
        return;
    }

    tweetBox.focus();
    tweetBox.innerHTML = "";
    console.log("Focused on tweet box and cleared content.");
    let textToPaste = `${recyclePostData[0].text}`;
    console.log("text", `${recyclePostData[0].text}`);
    const clipboardData = new DataTransfer();

    let tweetOptionData = await tweetOption()
    geminiApiKey = tweetOptionData.geminiApiKey

    if (tweetOptionData.TweetOption == "smartTweet") {
        let smartconntent = await getRecycledContent(textToPaste);
        textToPaste = smartconntent
    }
    console.log("textToPaste", textToPaste);
    clipboardData.setData("text/plain", textToPaste);
    const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData
    });

    tweetBox.dispatchEvent(pasteEvent);
    await sleep(1);
    if (
        recyclePostData[0].imageUrls &&
        Array.isArray(recyclePostData[0].imageUrls) &&
        recyclePostData[0].imageUrls[0] !== "Not Found"
    ) {
        console.log("Images found! Calling the function...");
        for (let i = 0; i < recyclePostData[0].imageUrls.length; i++) {
            const imageUrl = recyclePostData[0].imageUrls[i];
            try {
                const base64Image = await convertImageToBase64(imageUrl);
                await uploadImageFromLocalPath(base64Image, "image");
            } catch (error) {
                console.log(` Failed to convert and upload image ${i + 1}:`, error);
            }
            await sleep(1)
        }
    } else {
        console.log("image no found");
    }

    await sleep(2);
    const premiumMessage = document.querySelector("div[aria-live='polite'] span");
    if (premiumMessage && premiumMessage.innerText.includes("Upgrade to Premium+")) {
        console.log(" Upgrade to Premium+ to write longer posts and Articles");
        sendStatusMessage("error", "Upgrade to Premium+ to write longer posts and Articles.");
        await sleep(1)
        window.location.reload();
        return;
    }    
    await sleep(1);
    const postButton = document.querySelector('[data-testid="tweetButtonInline"]');
    if (postButton) {
        postButton.click();
        sendStatusMessage("success", "tweet add sucessfully.");
    } else {
        console.log(" Post button not found!");
    }
}

async function newTweetQuote() {
    try {
        document.querySelector("button[data-testid='retweet']").click();
        await sleep(2);
        const quoteButton = document.querySelector('#layers > div.css-175oi2r.r-zchlnj.r-1d2f490.r-u8s1d.r-ipm5af.r-1p0dtai.r-105ug2t > div > div > div > div.css-175oi2r.r-1ny4l3l > div > div.css-175oi2r.r-j2cz3j.r-kemksi.r-1q9bdsx.r-qo02w8.r-1udh08x.r-u8s1d > div > div > div > a:nth-child(2)');
        if (quoteButton) {
            quoteButton.click();
        } else {
            console.log("Quote button not found.");
        }
        await sleep(1);
        const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]');
        if (!tweetBox) {
            console.error("Tweet box not found!");
            return;
        }
        tweetBox.focus();
        tweetBox.innerHTML = "";
        let textToPaste = `${recyclePostData[0].text}`;
        await sleep(2)
        let tweetOptionData = await tweetOption()

        geminiApiKey = tweetOptionData.geminiApiKey
        if (tweetOptionData.TweetOption == "smartTweet") {
            let smartconntent = await getRecycledContent(textToPaste);
            textToPaste = smartconntent
        }
        await sleep(1)
        const clipboardData = new DataTransfer();
        clipboardData.setData("text/plain", textToPaste);
        const pasteEvent = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: clipboardData
        });
        tweetBox.dispatchEvent(pasteEvent);
        await sleep(2);
        const premiumMessage = document.querySelector("div[aria-live='polite'] span");
        if (premiumMessage && premiumMessage.innerText.includes("Upgrade to Premium+")) {
            console.log(" Upgrade to Premium+ to write longer posts and Articles");

            sendStatusMessage("error", "Upgrade to Premium+ to write longer posts and Articles.");
            await sleep(1)
            const selector = "#layers > div:nth-child(2) > div > div > div > div > div > div.css-175oi2r.r-1ny4l3l.r-18u37iz.r-1pi2tsx.r-1777fci.r-1xcajam.r-ipm5af.r-g6jmlv.r-1habvwh > div.css-175oi2r.r-1wbh5a2.r-htvplk.r-1udh08x.r-1867qdf.r-rsyp9y.r-1pjcn9w.r-1potc6q > div > div > div > div.css-175oi2r.r-gtdqiz.r-ipm5af.r-136ojw6 > div > div > div > div > div > div.css-175oi2r.r-1pz39u2.r-1777fci.r-15ysp7h.r-1habvwh.r-s8bhmr > button";

            const button = document.querySelector(selector);
            if (button) {
                button.click();
                console.log("Dynamic button clicked!");

            }
            await sleep(1)
            const element = document.querySelector('#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > header > div > div > div > div.css-175oi2r.r-1habvwh > div.css-175oi2r.r-15zivkp.r-1bymd8e.r-13qz1uu > nav > a:nth-child(1)');
            if (element) {
                element.click();
                console.log("click home page ");
            }
            return;
        }
        await sleep(1);
        const postButton = document.querySelector('[data-testid="tweetButton"]');
        if (postButton) {
            postButton.click();
            sendStatusMessage("success", "tweet add sucessfully.");
        } else {
            console.log(" Post button not found!");
        }

    } catch (error) {
        console.log("Error in newTweetQuote:", error);
    }
}

async function convertImageToBase64(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting image to Base64:", error);
        throw error;
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

async function uploadImageFromLocalPath(base64Data, mediaType = "image") {
    try {
        if (!base64Data) {
            console.log("No file selected!");
            return;
        }
        console.log(`⌛ Waiting for Twitter file input to upload ${mediaType}...`);
        const fileInput = await waitForElement("input[type='file']", 15000);
        console.log(" File input found! Uploading image...");

        const prefix = mediaType === "image" ? "data:image/jpeg;base64," : "data:video/mp4;base64,";
        const dataUrl = base64Data.startsWith("data:") ? base64Data : prefix + base64Data;

        const blob = await (await fetch(dataUrl)).blob();
        const fileName = mediaType === "image" ? "upload_image.jpg" : "upload_video.mp4";
        const fileType = mediaType === "image" ? "image/jpeg" : "video/mp4";
        const file = new File([blob], fileName, { type: fileType });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));

        console.log(` ${mediaType} upload triggered. Waiting for preview...`);
        await waitForElement('[data-testid="attachments"] img', 20000);
        console.log(" Image is fully processed and ready!");
    } catch (error) {
        console.log(` Error uploading ${mediaType}:`, error);
    }
}

function sendStatusMessage(status, message) {
    const data = {
        status: status,
        message: message
    };
    chrome.runtime.sendMessage({ action: "sendStatus", data: data });
}

async function getFirstPost() {
    const postSelector = 'div.css-175oi2r.r-1kqtdi0.r-rs99b7.r-1867qdf.r-1udh08x.r-o7ynqc.r-6416eg.r-1ny4l3l';

    const post = document.querySelector(postSelector);
    if (!post) {
        console.log("Post not found based on selector.");
        return false;
    }

    if (post.classList.contains('r-1phboty')) {
        console.log("Found post with class 'r-1phboty' — skipping this type.");
        return false;
    }

    console.log("Valid first post found.");
    return true;
}
async function getRecycledContent(originalContent) {
    const promptText = await new Promise((resolve, reject) => {
        chrome.storage.local.get("promptText", (data) => {
            if (data.promptText) {
                resolve(data.promptText);
            } else {
                resolve("You are a creative content rewriter. Rewrite the following Twitter post content in a smarter, engaging, and fresh manner while preserving the core message. Please rewrite the following content while preserving the meaning, tone, and length.");
            }
        });
    });
    const prompt = `${promptText},\n\n${originalContent}\n\nThe rewritten content should convey the same meaning as the original, multipleThredPosttain similar length, and be in the same language. Provide only one unique answer.`;

    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: prompt
                    }
                ]
            }
        ]
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            const fullText = data.candidates[0].content.parts[0].text
            return fullText
        } else {
            console.log("No content found in the response.");
            return originalContent;
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return originalContent;
    }
}

async function tweetOption() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["TweetOption", "geminiApiKey"], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result);
            }
        });
    });
}

async function extractFirstTweetData() {
    const article = document.querySelector('article[data-testid="tweet"]');
    if (!article) {
        console.error("No tweet found!");
        return null;
    }

    const tweetTextElement = article.querySelector('div[data-testid="tweetText"]');
    const text = tweetTextElement ? tweetTextElement.innerText.trim() : "";
    const imageElements = article.querySelectorAll('div[data-testid="tweetPhoto"] img');
    const imageUrls = Array.from(imageElements).map(img => img.src);
    let videoUrl = "Not Found";
    const videoElement = article.querySelector('div[data-testid="videoPlayer"] video');
    if (videoElement) {
        const videoSource = videoElement.querySelector("source");
        if (videoSource && videoSource.src) {
            videoUrl = videoSource.src;
        }
    }

    const tweetData = {
        text,
        imageUrls: imageUrls.length > 0 ? imageUrls : ["Not Found"],
        videoUrl
    };

    console.log(" Extracted First Tweet Data:", tweetData);
    return tweetData;
}

async function collectThreadPosts() {
    console.log("🚀 Starting thread post collection...");

    const postDataArray = [];
    const SCROLL_DELAY = 1500;
    const SCROLL_STEP = 500;
    const MAX_EMPTY_SCROLLS = 3;
    let stopProcess = false;
    let foundPost = false;
    let consecutiveEmptyScrolls = 0;
    let firstPostTime = null;

    function smoothScroll() {
        window.scrollBy({
            top: SCROLL_STEP,
            behavior: 'smooth'
        });
    }

    const firstPost = document.querySelector('article');
    const handle = firstPost?.querySelector('div[data-testid="User-Name"] a span')?.textContent.trim();

    if (!handle) {
        console.log("Could not determine username from initial post.");
        return [];
    }

    const targetUsername = handle;
    console.log("🧑‍💻 Target username:", targetUsername);

    const firstTimeEl = firstPost.querySelector("time");
    if (firstTimeEl) {
        firstPostTime = new Date(firstTimeEl.getAttribute("datetime")).getTime();
        console.log("🕐 First post time:", new Date(firstPostTime).toLocaleString());
    }

    async function extractTweetData(post) {
        const tweetTextElement = post.querySelector('div[data-testid="tweetText"]');
        const text = tweetTextElement ? tweetTextElement.innerText.trim() : "";

        const imageElements = post.querySelectorAll('div[data-testid="tweetPhoto"] img');
        const imageUrls = Array.from(imageElements).map(img => img.src);

        let videoUrl = "Not Found";
        const videoElement = post.querySelector('div[data-testid="videoPlayer"] video');
        if (videoElement) {
            const videoSource = videoElement.querySelector("source");
            if (videoSource?.src) {
                videoUrl = videoSource.src;
            }
        }

        return {
            text,
            imageUrls: imageUrls.length > 0 ? imageUrls : ["Not Found"],
            videoUrl
        };
    }

    async function fetchNextPostData(post) {
        const timeElement = post.querySelector('time');
        const userNameElement = post.querySelector('span.css-1jxf684');

        if (timeElement && userNameElement) {
            const username = userNameElement.textContent.trim();
            const postTime = new Date(timeElement.getAttribute("datetime")).getTime();

            if (timeElement && userNameElement) {
                const username = userNameElement.textContent.trim();
                if (username === targetUsername) {
                    const timeDiff = postTime - firstPostTime;
                    if (timeDiff > 3600000) {
                        console.log("⏱ Post is older than 1 hour from first post. Stopping.");
                        stopProcess = true;
                        return;
                    }
                    const postData = await extractTweetData(post);
                    const isDuplicate = postDataArray.some(existingPost =>
                        existingPost.text === postData.text &&
                        existingPost.videoUrl === postData.videoUrl &&
                        existingPost.imageUrls.join(',') === postData.imageUrls.join(',')
                    );

                    if (!isDuplicate) {
                        const timeLink = timeElement.closest('a');
                        console.log("✅ Tweet found:", timeLink?.href);
                        postDataArray.push(postData);
                        foundPost = true;
                        consecutiveEmptyScrolls = 0;
                    }
                } else {
                    console.log("Different user detected. Stopping.");
                    stopProcess = true;
                }
            }
        }
    }

    async function processNextPost() {
        const posts = document.querySelectorAll('article');
        let foundAnyPost = false;

        for (const post of posts) {
            if (stopProcess) break;
            post.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
            await fetchNextPostData(post);

            if (foundPost) {
                foundAnyPost = true;
                foundPost = false;
            }
        }
        return foundAnyPost;
    }

    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            if (stopProcess) {
                clearInterval(interval);
                console.log("Stopped scrolling (username mismatch).");
                resolve(postDataArray);
                return;
            }
            const newPosts = await processNextPost();
            if (!newPosts) {
                consecutiveEmptyScrolls++;
                console.log(`📭 No new posts found (${consecutiveEmptyScrolls}/${MAX_EMPTY_SCROLLS})`);
                if (consecutiveEmptyScrolls >= MAX_EMPTY_SCROLLS) {
                    clearInterval(interval);
                    console.log("✅ Max scroll attempts reached.");
                    resolve(postDataArray);
                    return;
                }
            }
            smoothScroll();
        }, SCROLL_DELAY);
    });
}

async function multipleThredPost() {
    for (let i = 0; i < threadPostData.length; i++) {
        try {
            await sleep(1)
            await clickAndPasteAndPost(i);
            await sleep(1)
            let firstposttext = threadPostData[i].text;
            let result = await addFirstTweetData(`${firstposttext + " "}`, i);
            await sleep(1)

            if (i < threadPostData.length - 1) {
                hoverAndClickAddPost();
            }
            await sleep(2)
        } catch (e) {
            console.log(`Error posting ${i + 1}:`, e);
        }
        await sleep(2);
    }
    console.log("extraImageAddPostIndex : ", extraImageAddPostIndex);
    async function runExtraImageEdits() {
        for (const extraimageindex of extraImageAddPostIndex) {
            await sleep(1);
            await clickAnyTwitterInput(extraimageindex, "Temporary text!", 3000);
            await sleep(8)
            await clickRemoveMediaButton();
            await sleep(2)
        }
    }
    await runExtraImageEdits();
    setTimeout(() => {
        const postButton = document.querySelector('[data-testid="tweetButton"]');
        if (postButton) {
            postButton.click();
        } else {
            console.log("'Post all' button not found");
        }
    }, 2000);
    sendStatusMessage("success", "tweet add sucessfully.");
    console.log("Last post ready. Publish manually.");
}

async function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        function check() {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            if (Date.now() - startTime > timeout) return reject(`Timeout: ${selector} not found`);
            setTimeout(check, 300);
        }
        check();
    });
}
async function uploadImageFromUrl(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        const file = new File([blob], "upload.jpg", { type: "image/jpeg" });
        const input = await waitForElement("input[type='file']");
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;

        input.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("✅ File upload dispatched");

        await waitForElement('[data-testid="attachments"] img');
        console.log("✅ Image preview rendered");
    } catch (e) {
        console.log("❌ Image upload error", e);
    }
}

async function pasteTextIntoEditor(testId, text) {
    const el = await waitForElement(`[data-testid="${testId}"]`);
    el.focus();
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);

    const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData
    });
    el.dispatchEvent(pasteEvent);
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
}

async function clickAndPasteAndPost(postIndex) {
    console.log(`\n🚀 Posting ${postIndex + 1}/${threadPostData.length}`);

    const { text, imageUrls } = threadPostData[postIndex];
    const textAreaId = `tweetTextarea_${postIndex}`;
    console.log("textAreaId--->", textAreaId);
    console.log("📝 Pasting text:", text);
    if (imageUrls && imageUrls[0] !== "Not Found") {
        console.log("🖼 Uploading images...");
        for (let url of imageUrls) {
            await uploadImageFromUrl(url);
            await sleep(1);
        }
    } else {
        console.log("📭 No image to upload.");
        console.log("postindex", postIndex)
        extraImageAddPostIndex.push(postIndex)
        await uploadAndRemoveMedia();
    }
    await sleep(2);
}

async function addFirstTweetData(text, indexdata) {
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function check() {
                const el = document.querySelector(selector);
                if (el && el.offsetParent !== null) return resolve(el);
                if (Date.now() - start >= timeout) return reject("Timeout waiting for: " + selector);
                setTimeout(check, 300);
            })();
        });
    }

    try {
        const tweetBox = await waitForElement(`[data-testid^="tweetTextarea_${indexdata}"][contenteditable="true"]`);
        tweetBox.scrollIntoView({ behavior: "smooth", block: "center" });
        tweetBox.focus();
        await sleep(0.5)
        tweetBox.click();
        const clipboardData = new DataTransfer();
        clipboardData.setData("text/plain", text);
        const pasteEvent = new ClipboardEvent("paste", {
            clipboardData,
            bubbles: true,
            cancelable: true,
        });
        tweetBox.dispatchEvent(pasteEvent);
        console.log("✅ Text pasted:", `${text}`);

        console.log(`sucessfully text add on ${indexdata}`);

        await sleep(3)
        const premiumMessage = document.querySelector("div[aria-live='polite'] span");
        if (premiumMessage && premiumMessage.innerText.includes("Upgrade to Premium+")) {
            console.log(" Premium+ message found. Can't post until the message disappears.");

            console.log(" Upgrade to Premium+ to write longer posts and Articles");
            sendStatusMessage("error", "Upgrade to Premium+ to write longer posts and Articles.");
            await sleep(1)
            window.location.reload();
            return;
        }

        return text;
    } catch (error) {
        console.error("Error while tweeting:", error);
        return null;
    }
}

async function hoverAndClickAddPost() {
    const addBtn = await waitForElement('[data-testid="addButton"]');
    const mouseEnter = new MouseEvent("mouseenter", { bubbles: true });
    addBtn.dispatchEvent(mouseEnter);
    console.log("🖱 Hovered on 'Add post' button");
    await new Promise(resolve => setTimeout(resolve, 1000));
    addBtn.focus();
    addBtn.click();
    await sleep(2)
    console.log("✅ Clicked 'Add post' button");
}

async function uploadAndRemoveMedia() {
    const base64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z/C/HwMDAwMjBQAAbVQFvZ2nqwAAAABJRU5ErkJggg==";
    const byteCharacters = atob(base64);
    const byteArray = new Uint8Array([...byteCharacters].map(c => c.charCodeAt(0)));
    const blob = new Blob([byteArray], { type: "image/png" });
    const file = new File([blob], "valid.png", { type: "image/png" });

    const input = document.querySelector('input[type="file"][data-testid="fileInput"]');
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;

    input.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("🖼 Uploaded media...");
    await sleep(2);

}

async function clickAnyTwitterInput(inputIndex = 0, textToAdd = "Temporary text!", delayBeforeRemove = 3000) {
    const editors = Array.from(document.querySelectorAll('[role="textbox"][data-testid^="tweetTextarea_"]'))
        .filter(el => el.getAttribute('aria-label') === 'Post text' && el.offsetParent !== null);

    if (editors.length === 0) {
        console.log("No visible tweet inputs found");
        return false;
    }

    if (inputIndex >= editors.length) {
        console.log(`Input index ${inputIndex} not found (only ${editors.length} available)`);
        return false;
    }

    const editor = editors[inputIndex];
    editor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const simulateClickAddAndRemove = (el, text, delay) => {
        const range = document.createRange();
        const targetNode = el.childNodes[el.childNodes.length - 1] || el;
        range.setStart(targetNode, targetNode.length || 0);
        range.setEnd(targetNode, targetNode.length || 0);

        const rect = range.getBoundingClientRect();
        const x = rect.left + 5;
        const y = rect.top + 5;

        const events = [
            new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }),
            new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }),
            new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }),
            new FocusEvent('focusin', { bubbles: true }),
            new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }),
            new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }),
        ];

        events.forEach((event, idx) => {
            setTimeout(() => el.dispatchEvent(event), idx * 100);
        });

        setTimeout(() => {
            el.focus();
            const originalText = el.textContent;
            el.textContent = originalText + text;
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            el.style.boxShadow = '0 0 0 2px rgba(29,155,240,0.5)';
            setTimeout(() => el.style.boxShadow = '', 1000);
            setTimeout(() => {
                if (el.textContent.startsWith(originalText)) {
                    el.textContent = originalText;
                    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
                    console.log("🧹 Added text removed, original text preserved");
                }
            }, delay);
        }, events.length * 100 + 200);
    };

    simulateClickAddAndRemove(editor, textToAdd, delayBeforeRemove);
    console.log(`✅ Appended then removed extra text in input ${inputIndex}`);
    return true;
}

async function clickRemoveMediaButton() {
    try {
        const removeButton = await waitForElement('[aria-label="Remove media"]', 10000);
        if (!removeButton) {
            console.error("Could not find 'Remove media' button.");
            return;
        }
        removeButton.click();
        console.log("Removed media by clicking the button");
        return true;
    } catch (error) {
        console.error("Error clicking the 'Remove media' button:", error);
        return false;
    }
}

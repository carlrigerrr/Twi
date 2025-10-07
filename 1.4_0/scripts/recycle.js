document.addEventListener("DOMContentLoaded", function () {
    console.log("Recycle Tweet Page Loaded!");
    const progressContainer = document.querySelector(".progress-container");
    const statisticsBtn = document.getElementById("statisticsBtn");
    const recycleForm = document.getElementById("recycleForm");
    const startRecycleButton = document.getElementById("startRecycle");
    const tweetInput = document.getElementById("tweetInput");
    const hideBtn = document.getElementById("hideBtn");
    const storedUrlLink = document.getElementById('storedUrlLink');
    const likeSuccessEl = document.getElementById("likeSuccess");
    const likeFailedEl = document.getElementById("likeFailed");
    const errorMessageContainer = document.getElementById("errorMessageContainer");
    const errorMessageText = document.getElementById("errorMessageText");
    const geminiApiKeyInput = document.getElementById("geminiApiKey");
    const geminiApiKeyContainer = document.getElementById("geminiApiKeyContainer");
    const promptTextinput = document.getElementById("promptText");
    const promptTextContainer = document.getElementById("promptTextContainer");
    const recycleTweetRadio = document.getElementById("recycleTweet");
    const smartTweetRadio = document.getElementById("smartTweet");
    const threadRecycleRadio = document.getElementById("threadRecycle");
    const promptTextArea = document.getElementById('promptText');
    const editButton = document.getElementById('editPromptBtn');
    const saveButton = document.getElementById('savePromptBtn');
    const tweetInputLabel = document.getElementById('tweetInputLabel');

    editButton.addEventListener('click', function () {
        promptTextArea.readOnly = false;
        editButton.style.display = 'none';
        saveButton.style.display = 'inline-block';
    });
    saveButton.addEventListener('click', function () {
        promptTextArea.readOnly = true;
        saveButton.style.display = 'none';
        editButton.style.display = 'inline-block';
    });

    recycleTweetRadio.addEventListener('change', function () {
        if (recycleTweetRadio.checked) {
            geminiApiKeyContainer.style.display = "none";
            promptTextContainer.style.display = "none";
            tweetInputLabel.textContent = "📝 Enter Tweet URL to Recycle:";
            console.log("recycleTweetRadio", recycleTweetRadio);
        }
    });

    smartTweetRadio.addEventListener('change', function () {
        if (smartTweetRadio.checked) {
            geminiApiKeyContainer.style.display = "block";
            promptTextContainer.style.display = "block";
            tweetInputLabel.textContent = "📝 Enter Tweet URL to smart tweet:";
            console.log("smartTweetRadio", smartTweetRadio);
        }
    });


    threadRecycleRadio.addEventListener('change', function () {
        if (threadRecycleRadio.checked) {
            geminiApiKeyContainer.style.display = "none";
            promptTextContainer.style.display = "none";
            tweetInputLabel.textContent = "📝 Enter Thread Recycle Post URL:";

            console.log("threadRecycleRadio", threadRecycleRadio);
        }
    });

    if (!startRecycleButton || !tweetInput) {
        console.log("🚨 Error: Elements not found!");
        return;
    }
    if (chrome.runtime.getManifest && chrome.runtime.getManifest().version) {
        document.getElementById("extensionVersion").textContent = chrome.runtime.getManifest().version;
    } else {
        document.getElementById("extensionVersion").textContent = "Unknown";
    }
    progressContainer.style.display = "none";
    if (recycleForm) {
        recycleForm.style.display = "block";
    }
    statisticsBtn.addEventListener("click", function () {
        progressContainer.style.display = "block";
        const progressRecyclePost = document.getElementById("progressRecyclePost");
        chrome.storage.local.get(["TweetOption"], (data) => {

            if (progressRecyclePost) {
                console.log("data.TweetOption",data.TweetOption);

                if (data.TweetOption == undefined) {
                    console.log("data ");
                progressRecyclePost.textContent = `Task Progress : no progress`;
                    
                }else{

                    progressRecyclePost.textContent = `Task Progress : ${data.TweetOption}`;
                }
            }
        });
        if (recycleForm) {
            recycleForm.style.display = "none";
        }
    });
    hideBtn.addEventListener("click", function () {
        progressContainer.style.display = "none";
        if (recycleForm) {
            recycleForm.style.display = "block";
        }
    });
    function updateUrlDisplay(url) {
        let displayText = "";
        const parts = url.split('status/');
        displayText = parts.length > 1 ? parts[1] : url;
        storedUrlLink.href = url;
        storedUrlLink.textContent = displayText;
    }
    const storedUrl = localStorage.getItem('recyclekeyword');
    if (storedUrl) {
        updateUrlDisplay(storedUrl);
    }
    startRecycleButton.addEventListener("click", async function () {

        let tweetText = tweetInput.value.trim();
        const selectedOption = document.querySelector('input[name="tweetOption"]:checked');
        const geminiApiKey = geminiApiKeyInput.value.trim();
        const promptText = promptTextinput.value.trim();


        if (promptTextArea.readOnly === false) {
            showToast('Please save your prompt text before starting the recycling process!', 'error');
            return
        }

        if (tweetText === "") {
            showToast("Please enter a tweet to recycle.", "error");
            return;
        }

        if (!geminiApiKey && smartTweetRadio.checked) {
            showToast("Please enter your Gemini API Key.", "error");
            return;
        }
        if (!promptText && smartTweetRadio.checked) {
            showToast("Please enter your prompt Text.", "error");
            return;
        }
        console.log("selectedOption", selectedOption.value);
        if (selectedOption.value == "smartTweet") {

            if (tweetText === "") {
                showToast("Please enter a tweet to recycle.", "error");
                return;
            }
            const tweetUrlRegex = /^https:\/\/x\.com\/[^\/]+\/status\/\d+$/;
            if (!tweetUrlRegex.test(tweetText)) {
                showToast("Invalid URL format. Please use a URL like https://x.com/username/status/1234567890", "error");
                return;
            }

            console.log("geminiApiKey : ", geminiApiKey);
            let verifyGeminiApiKey = await getRecycledContent(geminiApiKey);
            console.log("verifyGeminiApiKey", verifyGeminiApiKey);

            if (verifyGeminiApiKey == false) {
                showToast("Please enter valid Gemini API Key.", "error");
                return;
            } else {
                showToast("Gemini API Key verified successfully!", "success");
                chrome.storage.local.set({
                    "geminiApiKey": geminiApiKey, "promptText": promptText
                }, function () {
                    console.log("Gemini API Key:", geminiApiKey);
                    console.log("Prompt Text:", promptText);
                });


            }
        } else if (selectedOption.value == "recycleTweet") {
            if (tweetText === "") {
                showToast("Please enter a tweet to recycle.", "error");
                return;
            }

            const tweetUrlRegex = /^https:\/\/x\.com\/[^\/]+\/status\/\d+$/;
            if (!tweetUrlRegex.test(tweetText)) {
                showToast("Invalid URL format. Please use a URL like https://x.com/username/status/1234567890", "error");
                return;
            }

        }
        else if (selectedOption.value == "threadRecycle") {
            const tweetRegex = /^https:\/\/x\.com\/[a-zA-Z0-9_]{1,15}\/status\/\d+(?:\?s=\d{1,3}&?[\w\-=&]*)?$/;

            if (!tweetRegex.test(tweetText)) {
                showToast("Please enter a valid tweet URL from x.com.", "error");
                return;
            }
        }
        console.log("♻️ Recycling Tweet:", tweetText);
        chrome.storage.local.set({
            'threadRecyclekeyword': tweetText
        });

        if (selectedOption) {
            const selectedValue = selectedOption.value;
            console.log("Selected Option:", selectedValue);
            chrome.storage.local.set({ "TweetOption": selectedValue }, function () {
                console.log("Selected tweet option saved:", selectedValue);
            });
        } else {
            console.log("No option selected.");
        }
        chrome.runtime.sendMessage({ action: "startRecycle", tweetText }, (response) => {
            console.log("🔄 Response from background:", response);
            if (response.status === "success") {
                showToast("✅ Search initiated successfully!", "success");
                console.log("Search initiated successfully!");
            } else {
                console.log(`Error: ${response.message}`);
                showToast(`Error: ${response.message}`, "error");
            }
        });
        const tweetUrl = tweetInput.value.trim();
        console.log("tweetUrl", tweetUrl);

        if (tweetUrl) {
            localStorage.setItem('recyclekeyword', tweetUrl);
            updateUrlDisplay(tweetUrl);
        }
        statisticsBtn.click();
        chrome.storage.local.set({
            likeSuccess: 0,
            likeFailed: 0,
            lastError: "false",
            RecyclepostStatusMessage: ""
        }, () => {
            likeSuccessEl.textContent = 0;
            likeFailedEl.textContent = 0;
            errorMessageContainer.style.display = "none";
        });
    });
    chrome.storage.local.get(
        ["likeSuccess", "likeFailed", "RecyclepostStatusMessage", "lastError"],
        (data) => {
            likeSuccessEl.textContent = data.likeSuccess || 0;
            likeFailedEl.textContent = data.likeFailed || 0;
            if (data.lastError === "true" && data.RecyclepostStatusMessage) {
                errorMessageText.textContent = data.RecyclepostStatusMessage;
                errorMessageContainer.style.display = "block";
            } else {
                errorMessageContainer.style.display = "none";
            }
        }
    );
    errorMessageContainer.addEventListener("click", () => {

        if (errorMessageContainer.style.display === "block") {

            console.log("shaoe error message");

        } else {
            errorMessageContainer.style.display = "block";
        }
    });
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

async function getRecycledContent(geminiApiKey) {
    const prompt = `What is AI? Explain in one line.`;
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
            const recycledContent = data.candidates[0].content.parts[0].text;
            return recycledContent;
        } else {
            console.log("No content found in the response.");
            return false;
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return false;
    }
}
chrome.storage.onChanged.addListener((changes, areaName) => {

    if (areaName === "local") {
        if (changes.likeSuccess) {
            document.getElementById("likeSuccess").textContent = changes.likeSuccess.newValue || 0;
        }
        if (changes.likeFailed) {
            document.getElementById("likeFailed").textContent = changes.likeFailed.newValue || 0;
        }
        if (changes.RecyclepostStatusMessage || changes.lastError) {
            const errorMessageContainer = document.getElementById("errorMessageContainer");
            const errorMessageText = document.getElementById("errorMessageText");
            chrome.storage.local.get(["RecyclepostStatusMessage", "lastError"], (data) => {
                if (data.lastError === "true" && data.RecyclepostStatusMessage) {
                    errorMessageText.textContent = data.RecyclepostStatusMessage;
                    errorMessageContainer.style.display = "block";
                } else {
                }
            });
        }
    }
});




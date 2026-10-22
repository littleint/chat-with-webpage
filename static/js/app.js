// Elements
const tabUrlBtn = document.getElementById("tabUrlBtn");
const tabFileBtn = document.getElementById("tabFileBtn");
const urlTabContent = document.getElementById("urlTabContent");
const fileTabContent = document.getElementById("fileTabContent");

const urlInput = document.getElementById("urlInput");
const indexBtn = document.getElementById("indexBtn");
const btnText = indexBtn.querySelector(".btn-text");
const btnLoader = indexBtn.querySelector(".btn-loader");

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const selectedFileInfo = document.getElementById("selectedFileInfo");
const selectedFileName = document.getElementById("selectedFileName");
const cancelFileBtn = document.getElementById("cancelFileBtn");
const uploadFileBtn = document.getElementById("uploadFileBtn");
const uploadBtnText = uploadFileBtn.querySelector(".btn-text");
const uploadBtnLoader = uploadFileBtn.querySelector(".btn-loader");

const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const clearChatBtn = document.getElementById("clearChatBtn");

const chatMessages = document.getElementById("chatMessages");
const welcomeState = document.getElementById("welcomeState");
const questionInput = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const chips = document.querySelectorAll(".chip");

const sourceCard = document.getElementById("sourceCard");
const collapsedBar = document.getElementById("collapsedBar");
const sourceCardBody = document.getElementById("sourceCardBody");
const activeSourceIcon = document.getElementById("activeSourceIcon");
const activeSourceTitle = document.getElementById("activeSourceTitle");
const toggleSourceBtn = document.getElementById("toggleSourceBtn");

let isIndexed = false;
let isIndexing = false;
let isQuerying = false;
let selectedFile = null;
let isSourceCollapsed = false;

// Toggle collapsible source card
if (toggleSourceBtn) {
    toggleSourceBtn.addEventListener("click", () => {
        setSourceCollapsed(!isSourceCollapsed);
    });
}

function setSourceCollapsed(collapsed) {
    isSourceCollapsed = collapsed;
    if (collapsed) {
        sourceCard.classList.add("is-collapsed");
        collapsedBar.style.display = "flex";
        sourceCardBody.style.display = "none";
    } else {
        sourceCard.classList.remove("is-collapsed");
        collapsedBar.style.display = "none";
        sourceCardBody.style.display = "flex";
    }
}

// 1. Tab Switching
tabUrlBtn.addEventListener("click", () => switchTab("url"));
tabFileBtn.addEventListener("click", () => switchTab("file"));

function switchTab(tab) {
    if (tab === "url") {
        tabUrlBtn.classList.add("active");
        tabFileBtn.classList.remove("active");
        urlTabContent.classList.add("active");
        fileTabContent.classList.remove("active");
    } else {
        tabFileBtn.classList.add("active");
        tabUrlBtn.classList.remove("active");
        fileTabContent.classList.add("active");
        urlTabContent.classList.remove("active");
    }
}

// 2. Initial State Check
async function checkStatus() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        if (data.is_indexed && data.source_name) {
            setReadyState(data.source_name, data.source_type);
        }
    } catch (e) {
        console.error("Status check failed", e);
    }
}

// 3. Set Ready State
function setReadyState(sourceName, sourceType = "url") {
    isIndexed = true;
    statusIndicator.className = "status-badge ready";
    
    const isFile = sourceType === "file";
    const displayLabel = isFile 
        ? `📄 ${sourceName}` 
        : `🔗 ${truncateUrl(sourceName)}`;

    statusText.textContent = `Ready: ${displayLabel}`;
    
    // Update collapsed bar details
    if (activeSourceIcon) activeSourceIcon.textContent = isFile ? "📄" : "🔗";
    if (activeSourceTitle) activeSourceTitle.textContent = sourceName;
    setSourceCollapsed(true);

    questionInput.disabled = false;
    sendBtn.disabled = false;
    if (clearChatBtn) clearChatBtn.style.display = "inline-flex";
    questionInput.placeholder = `Ask anything about ${sourceName}...`;
    questionInput.focus();
}

function truncateUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname + (u.pathname.length > 18 ? u.pathname.substring(0, 18) + "..." : u.pathname);
    } catch {
        return url.length > 25 ? url.substring(0, 25) + "..." : url;
    }
}

// 4. Handle Webpage Indexing
indexBtn.addEventListener("click", handleIndexUrl);
urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleIndexUrl();
});

async function handleIndexUrl() {
    const url = urlInput.value.trim();
    if (!url || isIndexing) return;

    isIndexing = true;
    indexBtn.disabled = true;
    btnText.textContent = "Indexing...";
    btnLoader.style.display = "inline-block";

    statusIndicator.className = "status-badge loading";
    statusText.textContent = "Scraping & Indexing...";

    try {
        const res = await fetch("/api/index", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Indexing failed");
        }

        setReadyState(data.source_name, "url");
        hideWelcome();
        chatMessages.innerHTML = "";
        appendMessage("assistant", `I have finished reading and indexing **[${data.source_name}](${data.source_name})**! You can now ask questions about it.`);

    } catch (err) {
        alert("Failed to index: " + err.message);
        statusIndicator.className = "status-badge idle";
        statusText.textContent = "Indexing Failed";
    } finally {
        isIndexing = false;
        indexBtn.disabled = false;
        btnText.textContent = "Index Webpage";
        btnLoader.style.display = "none";
    }
}

// 5. Handle File Selection & Drag-and-Drop
dropzone.addEventListener("click", (e) => {
    if (e.target.id === "cancelFileBtn") return;
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
});

dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setSelectedFile(e.dataTransfer.files[0]);
    }
});

cancelFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearSelectedFile();
});

function setSelectedFile(file) {
    selectedFile = file;
    selectedFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    selectedFileInfo.style.display = "inline-flex";
    uploadFileBtn.disabled = false;
}

function clearSelectedFile() {
    selectedFile = null;
    fileInput.value = "";
    selectedFileInfo.style.display = "none";
    uploadFileBtn.disabled = true;
}

// 6. Handle File Upload & Indexing
uploadFileBtn.addEventListener("click", handleUploadFile);

async function handleUploadFile() {
    if (!selectedFile || isIndexing) return;

    isIndexing = true;
    uploadFileBtn.disabled = true;
    uploadBtnText.textContent = "Reading & Indexing...";
    uploadBtnLoader.style.display = "inline-block";

    statusIndicator.className = "status-badge loading";
    statusText.textContent = `Processing ${selectedFile.name}...`;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "File processing failed");
        }

        setReadyState(data.source_name, "file");
        hideWelcome();
        chatMessages.innerHTML = "";
        appendMessage("assistant", `Successfully indexed document **${data.source_name}**! You can now ask questions about this file.`);

    } catch (err) {
        alert("Failed to upload: " + err.message);
        statusIndicator.className = "status-badge idle";
        statusText.textContent = "Upload Failed";
    } finally {
        isIndexing = false;
        uploadFileBtn.disabled = false;
        uploadBtnText.textContent = "Process & Index Document";
        uploadBtnLoader.style.display = "none";
    }
}

// 7. Sample URL Chips
chips.forEach(chip => {
    chip.addEventListener("click", () => {
        urlInput.value = chip.dataset.url;
        handleIndexUrl();
    });
});

// 8. Handle Clear Chat (RAM Memory Reset)
if (clearChatBtn) {
    clearChatBtn.addEventListener("click", handleClearChat);
}

async function handleClearChat() {
    if (!isIndexed) return;
    try {
        clearChatBtn.disabled = true;
        const res = await fetch("/api/reset", { method: "POST" });
        if (res.ok) {
            chatMessages.innerHTML = "";
            appendMessage("assistant", "🧹 Memory cleared! You can now ask fresh questions.");
            questionInput.focus();
        }
    } catch (err) {
        console.error("Failed to reset chat memory:", err);
    } finally {
        clearChatBtn.disabled = false;
    }
}

// 9. Handle Question Asking
sendBtn.addEventListener("click", handleSendQuestion);

questionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendQuestion();
    }
});

questionInput.addEventListener("input", () => {
    questionInput.style.height = "auto";
    questionInput.style.height = Math.min(questionInput.scrollHeight, 120) + "px";
});

async function handleSendQuestion() {
    const question = questionInput.value.trim();
    if (!question || !isIndexed || isQuerying) return;

    isQuerying = true;
    questionInput.value = "";
    questionInput.style.height = "auto";
    sendBtn.disabled = true;

    hideWelcome();
    appendMessage("user", question);

    const thinkingId = appendThinkingBubble();

    try {
        const res = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question })
        });

        const data = await res.json();
        removeThinkingBubble(thinkingId);

        if (!res.ok) {
            throw new Error(data.detail || "Error querying AI");
        }

        appendMessage("assistant", data.answer);

    } catch (err) {
        removeThinkingBubble(thinkingId);
        appendMessage("assistant", `⚠️ **Error:** ${err.message}`);
    } finally {
        isQuerying = false;
        sendBtn.disabled = false;
        questionInput.focus();
    }
}

// 10. UI Helpers
function hideWelcome() {
    if (welcomeState) {
        welcomeState.style.display = "none";
    }
}

function appendMessage(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = `avatar ${role === "user" ? "user-avatar" : "ai-avatar"}`;
    avatar.textContent = role === "user" ? "You" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = formatMarkdown(text);

    row.appendChild(avatar);
    row.appendChild(bubble);

    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendThinkingBubble() {
    const id = "thinking-" + Date.now();
    const row = document.createElement("div");
    row.id = id;
    row.className = "message-row assistant";

    const avatar = document.createElement("div");
    avatar.className = "avatar ai-avatar";
    avatar.textContent = "AI";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeThinkingBubble(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatMarkdown(text) {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline;">$1</a>');

    const lines = html.split("\n");
    let inList = false;
    let result = [];

    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            if (!inList) {
                result.push("<ul>");
                inList = true;
            }
            result.push(`<li>${trimmed.substring(2)}</li>`);
        } else {
            if (inList) {
                result.push("</ul>");
                inList = false;
            }
            if (trimmed.length > 0) {
                result.push(`<p>${trimmed}</p>`);
            }
        }
    }
    if (inList) result.push("</ul>");

    return result.join("");
}

// Start app
checkStatus();

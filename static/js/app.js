// Elements
const urlInput = document.getElementById("urlInput");
const indexBtn = document.getElementById("indexBtn");
const btnText = indexBtn.querySelector(".btn-text");
const btnLoader = indexBtn.querySelector(".btn-loader");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");

const chatMessages = document.getElementById("chatMessages");
const welcomeState = document.getElementById("welcomeState");
const questionInput = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const chips = document.querySelectorAll(".chip");

let isIndexed = false;
let isIndexing = false;
let isQuerying = false;

// 1. Initial State Check
async function checkStatus() {
    try {
        const res = await fetch("/api/status");
        const data = await res.json();
        if (data.is_indexed && data.current_url) {
            setReadyState(data.current_url);
        }
    } catch (e) {
        console.error("Status check failed", e);
    }
}

// 2. Set Ready State
function setReadyState(url) {
    isIndexed = true;
    urlInput.value = url;
    statusIndicator.className = "status-badge ready";
    statusText.textContent = "Ready: " + truncateUrl(url);

    questionInput.disabled = false;
    sendBtn.disabled = false;
    questionInput.placeholder = "Ask anything about this webpage...";
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

// 3. Handle Webpage Indexing
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

        setReadyState(data.url);
        
        // Add a system announcement to the chat
        hideWelcome();
        appendMessage("assistant", `I have finished reading and indexing **[${data.url}](${data.url})**! You can now ask me any questions about its content.`);

    } catch (err) {
        alert("Failed to index: " + err.message);
        statusIndicator.className = "status-badge idle";
        statusText.textContent = "Indexing Failed";
    } finally {
        isIndexing = false;
        indexBtn.disabled = false;
        btnText.textContent = "Index Page";
        btnLoader.style.display = "none";
    }
}

// 4. Sample URL Chips
chips.forEach(chip => {
    chip.addEventListener("click", () => {
        urlInput.value = chip.dataset.url;
        handleIndexUrl();
    });
});

// 5. Handle Question Asking
sendBtn.addEventListener("click", handleSendQuestion);

questionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendQuestion();
    }
});

// Auto-expand textarea height
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

// 6. UI Helpers
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

// Basic markdown formatter (bold, lists, code, links, newlines)
function formatMarkdown(text) {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Markdown bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Markdown inline code: `code`
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline;">$1</a>');

    // Split lines for list and paragraph processing
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

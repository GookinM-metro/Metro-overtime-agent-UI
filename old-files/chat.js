// OVERTIME AI AGENT - CONVERSATIONAL SIMULATOR (chat.js)

// ----------------------------------------------------
// 1. MOCK RESPONSES COMPENDIUM
// ----------------------------------------------------
const BOT_RESPONSES = {
    greetings: {
        thought: `[init] Initializing Overtime AI Core...\n[data] Loading YTD 2026 datasets (24 log entries, 5 corporate events, 4 department profiles)\n[match] Indexing correlations between 'job_vacancies' and 'ot_hours'\n[success] Models calibrated. Ready to serve.`,
        content: `### Welcome to the Overtime Analysis Agent! 👋

I have ingested all operational logs, job vacancy posts, and IT/event schedules. Here is a high-level audit for **YTD 2026**:

| Department | Total OT Hours | Est. Cost | Key Core Driver |
| :--- | :---: | :---: | :--- |
| **Logistics** | 3,970 hrs | $238,200 | Open Vacancies (Understaffing) |
| **Customer Support** | 2,240 hrs | $134,400 | CRM System Outage (May) |
| **Engineering** | 1,830 hrs | $109,800 | Sprint Release Backlogs |
| **Finance** | 992 hrs | $60,520 | Quarter-End Ledger Audit |

*Notice the severe **Logistics shortage** and the **May CS outage peak**.* 

How can I help you analyze these spikes today? Feel free to click any of the **suggested questions below** or type your own!`
    },
    spike: {
        thought: `[query] SELECT * FROM events JOIN logs ON events.date_range = logs.date WHERE month = 'April'\n[calc] April overall OT = 1,940 hours (Peak Month, +40.5% over Mar average)\n[correlate] Overlapping Black Friday prep event (540 hrs Logistics) + Inventory Audit (320 hrs Logistics)\n[action] Triggering dashboard reset: Department => 'all', Table Search => 'April'`,
        content: `In **April 2026**, our overall overtime hours peaked at **1,940 hours** (the highest month of the entire year). 

If you filter the dashboard to **All Departments** and search the logs for **"April"**, you can see the matching records. Here is the exact breakdown of what triggered this massive surge:

1. **Black Friday Shipping Preparation (Logistics)**:
   - Generated **540 overtime hours** between April 15-28.
   - Due to **22 open vacancies** in the warehouse, existing staff had to pull double shifts to handle the packaging throughput.
2. **Q2 Inventory Stocktaking (Logistics)**:
   - Generated **320 overtime hours** between April 5-08.
   - This is a mandatory operational audit that was heavily backlogged.

**Suggested Strategy**: We should implement a *temporary worker buffer* in early April next year to prevent paying standard staff 1.5x time-and-a-half overtime rates, which cost us an extra **$32,400** in April alone.`,
        effect: () => {
            window.OvertimeDashboard.setDepartment('all');
            window.OvertimeDashboard.searchTable('April');
            window.OvertimeDashboard.toggleDriver('seasonality', true);
            window.OvertimeDashboard.toggleDriver('understaffing', true);
        }
    },
    vacancy: {
        thought: `[query] SELECT correlation(ot_hours, job_vacancies) FROM logs WHERE department = 'Logistics'\n[calc] Pearson Correlation Coefficient R = 0.94 (Extremely Strong Positive Correlation)\n[calc] Logistics vacancy average: 22 open postings. Overtime cost = $58,800\n[action] Triggering dashboard navigation: Department => 'logistics', Toggle Vacancy => ON`,
        content: `If you isolate the **Logistics & Supply Chain** department and enable both the **Overtime Hours** and **Job Vacancy** series on the trend chart, you can clearly see this correlation.

There is an **extremely strong positive correlation (R = 0.94)** between our open warehouse postings and paid overtime. 

### Key Findings:
* **The Core Issue**: Logistics has been struggling with an average of **22 to 25 open job postings** since March.
* **The Financial Impact**: This understaffing alone accounts for **46% of total Logistics overtime**, costing us **$52,800** in Q2.
* **Vicious Cycle**: Because we are short-staffed, existing warehouse workers are averaging **18-22 hours of overtime per week**, leading to higher burnout risks and subsequent voluntary resignations, which increases vacancies further.

**Hiring Recommendation**: Offering a **$2,500 signing bonus** for the remaining 5 critical material handler postings will cost **$12,500** upfront, but will eliminate an estimated **$36,000/month** in compounding overtime labor!`,
        effect: () => {
            window.OvertimeDashboard.setDepartment('logistics');
            window.OvertimeDashboard.searchTable('');
            // Ensure both checkboxes are checked
            const cbOt = document.getElementById("toggle-ot-hours");
            const cbVac = document.getElementById("toggle-vacancies");
            if (cbOt && !cbOt.checked) cbOt.click();
            if (cbVac && !cbVac.checked) cbVac.click();
            window.OvertimeDashboard.toggleDriver('understaffing', true);
        }
    },
    outage: {
        thought: `[query] SELECT ot_hours, date FROM logs WHERE department = 'CS' AND date LIKE '2026-05-%'\n[calc] May Support OT hours = 680 hrs (+112% over baseline average)\n[match] Event database shows 'CRM System Migration Downtime' May 10-14\n[calc] Outage duration = 14 hours. Backlog ticket count spiked to 4,200\n[action] Triggering dashboard navigation: Department => 'cs'`,
        content: `If you select **Customer Support** on your dashboard, you will notice a massive, isolated surge in **May 2026** reaching **680 hours**.

The data proves that the **ERP System Upgrade / CRM Migration** from May 10-14 was the direct catalyst.

### Outage Impact breakdown:
* **The Event**: The CRM went down for a total of **14 hours** over a 4-day migration window.
* **The Backlog**: Customer tickets spiked by **450%** (reaching 4,200 pending tickets) while agents were unable to access client profiles.
* **The Recovery Cost**: Once the system came online, agents worked overnight shifts to clear the backlog, registering **420 outage-related overtime hours** in May alone, costing us **$40,800** in supplementary labor.

**Contractual Insight**: Since this outage exceeded our vendor SLA threshold of 99.9%, we are entitled to a **$15,000 service credit refund**. I have drafted a claim document that our operations team can submit to the vendor.`,
        effect: () => {
            window.OvertimeDashboard.setDepartment('cs');
            window.OvertimeDashboard.searchTable('CRM Migration');
            window.OvertimeDashboard.toggleDriver('outages', true);
        }
    },
    recommendations: {
        thought: `[aggregate] Analyzing all drivers and ROI vectors...\n[model] Running cost mitigation forecast algorithms\n[success] 3 high-probability strategic maneuvers identified. ROI ratio: 4.2x`,
        content: `Based on my predictive models and the Q2 dataset, here is the **3-Step Overtime Mitigation Strategy** with high ROI:

### 1. Accelerate Logistics Hiring (ROI: 240%)
* **Action**: Approve a **$15,000 auxiliary budget** for regional warehouse job fairs and accelerated onboarding programs.
* **Rationale**: Filling just **8 open material handler roles** will immediately lower Logistics overtime by 55%, yielding **$36,000 in monthly savings** (Net Savings: $21,000 in the first quarter alone).

### 2. SLA Penalties for Tech Outages (ROI: 100%)
* **Action**: Formally submit the **SLA Service Credit claim** to our CRM SaaS vendor for the May 10-14 outage.
* **Rationale**: The outage cost us **$40,800** in Support overtime recovery. We can reclaim **$15,000** directly from the vendor's billing department.

### 3. Support Cross-Training Pool
* **Action**: Cross-train **6 Logistics admin staff** to assist Customer Support during IT outages or delivery bottlenecks.
* **Rationale**: Admin staff can absorb simple ticket tiers at standard salaries during emergency surges rather than paying Support staff 1.5x overtime.

Would you like me to generate a formal PDF report summarizing these recommendations for the executive board?`,
        effect: () => {
            window.OvertimeDashboard.setDepartment('all');
            window.OvertimeDashboard.searchTable('');
            // Toggle all drivers to show high-level view
            const checkboxes = document.querySelectorAll(".driver-checkbox");
            checkboxes.forEach(cb => {
                if(!cb.checked) cb.click();
            });
        }
    },
    fallback: {
        thought: `[nlp] Query unrecognized. Reverting to general semantic search on dataset\n[match] Searching logs for query patterns`,
        content: `I've analyzed your query against the active overtime records. While I couldn't find a direct correlation mapping, I can confirm that our current **Total Overtime is 1,642 hours** with an estimated cost of **$98,520**.

You can try asking me one of the primary correlations:
* **"Explain the April OT spike"**
* **"How do vacancies affect Logistics?"**
* **"What was the impact of the CRM system migration?"**
* **"What recommendations do you have to lower overtime cost?"**`,
        effect: () => {}
    }
};

// ----------------------------------------------------
// 2. CHAT LIFECYCLE CONTROLLER
// ----------------------------------------------------

let CHAT_LOG = [];

document.addEventListener("DOMContentLoaded", () => {
    initChat();
});

function initChat() {
    // Load initial bot greeting
    triggerAgentResponse("greetings");

    // Bind Enter key and Send button
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("btn-send-chat");
    const clearBtn = document.getElementById("btn-clear-chat");
    const chips = document.querySelectorAll(".query-chip");

    chatInput.addEventListener("input", () => {
        // Auto-grow height
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';

        // Enable/Disable send button
        sendBtn.disabled = chatInput.value.trim().length === 0;
    });

    sendBtn.addEventListener("click", () => {
        handleUserMessageSubmit(chatInput.value);
    });

    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatInput.value.trim().length > 0) {
                handleUserMessageSubmit(chatInput.value);
            }
        }
    });

    // Clear history button
    clearBtn.addEventListener("click", () => {
        const container = document.getElementById("chat-messages-container");
        container.innerHTML = "";
        CHAT_LOG = [];
        triggerAgentResponse("greetings");
    });

    // Bind Query Chips
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const queryText = chip.dataset.query;
            handleUserMessageSubmit(queryText);
        });
    });
}

// ----------------------------------------------------
// 3. CORE CHAT SUBMISSION & TYPING EFFECTS
// ----------------------------------------------------

function handleUserMessageSubmit(text) {
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("btn-send-chat");

    // 1. Render User Bubble
    appendBubble("user", text);
    
    // Reset Input field
    chatInput.value = "";
    chatInput.style.height = "auto";
    sendBtn.disabled = true;

    // Scroll chat list
    scrollToBottom();

    // 2. Identify Match Category
    let responseKey = "fallback";
    const cleanText = text.toLowerCase();

    if (cleanText.includes("spike") || cleanText.includes("april") || cleanText.includes("massive overtime") || cleanText.includes("seasonal") || cleanText.includes("seasonality")) {
        responseKey = "spike";
    } else if (cleanText.includes("vacancy") || cleanText.includes("vacancies") || cleanText.includes("shortage") || cleanText.includes("understaffing")) {
        responseKey = "vacancy";
    } else if (cleanText.includes("outage") || cleanText.includes("outages") || cleanText.includes("crm") || cleanText.includes("system migration") || cleanText.includes("erp") || cleanText.includes("system outages")) {
        responseKey = "outage";
    } else if (cleanText.includes("recommend") || cleanText.includes("recommendation") || cleanText.includes("hiring strategy") || cleanText.includes("lower") || cleanText.includes("backlog")) {
        responseKey = "recommendations";
    }

    // 3. Trigger Agent Loading Indicator & Mindmap steps
    const responseData = BOT_RESPONSES[responseKey];
    triggerAgentResponse(responseKey);
}

function triggerAgentResponse(key) {
    const data = BOT_RESPONSES[key];
    const thinkingIndicator = document.getElementById("agent-thinking-indicator");
    const statusText = document.getElementById("thinking-status-text");

    // 1. Show bottom thinking spinner
    thinkingIndicator.classList.remove("hidden");
    
    // Dynamically replace timeframe and year with active selection from APP_STATE
    const activeYear = (typeof APP_STATE !== 'undefined' && APP_STATE.selectedYear) ? APP_STATE.selectedYear : 2026;
    const activeTimeframe = (typeof APP_STATE !== 'undefined' && APP_STATE.selectedTimeframe) ? APP_STATE.selectedTimeframe : "ytd";
    
    function getTimeframeLabel(tf) {
        switch (tf) {
            case "q1": return "Q1";
            case "q2": return "Q2";
            case "q3": return "Q3";
            case "q4": return "Q4";
            case "h1": return "H1";
            case "h2": return "H2";
            case "ytd": return "YTD";
            case "full": return "Full Year";
            default: return "YTD";
        }
    }
    
    const tfLabel = getTimeframeLabel(activeTimeframe);
    
    let dataThought = data.thought;
    let dataContent = data.content;
    
    // Always replace YTD with the friendly active timeframe label and 2026 with the active year
    dataThought = dataThought.replace(/YTD/g, tfLabel).replace(/2026/g, activeYear.toString());
    dataContent = dataContent.replace(/YTD/g, tfLabel).replace(/2026/g, activeYear.toString());

    // Simulate thinking logical stages
    const thoughts = dataThought.split("\n");
    let stage = 0;
    
    statusText.innerText = thoughts[stage];

    // 2. Immediately append an agent bubble placeholder with blinking dots
    const bubbleElement = appendAgentBubblePlaceholder(thoughts[0]);

    const interval = setInterval(() => {
        stage++;
        if (stage < thoughts.length) {
            statusText.innerText = thoughts[stage];
            // Update the reasoning block dynamically with accumulated thoughts
            const accumulatedThoughts = thoughts.slice(0, stage + 1).join("\n");
            updatePlaceholderThoughts(bubbleElement, accumulatedThoughts);
        } else {
            clearInterval(interval);
            
            // Hide bottom indicator
            thinkingIndicator.classList.add("hidden");
            
            // Reveal full content all at once
            revealAgentBubbleContent(bubbleElement, dataThought, dataContent);
            
            // Run dashboard effects - DISABLED per user request to avoid distracting automatic graph changes on the left
            /*
            if (data.effect) {
                data.effect();
            }
            */
        }
    }, 550);
}

// Appends an agent bubble placeholder with the three bouncing dots
function appendAgentBubblePlaceholder(initialThought) {
    const container = document.getElementById("chat-messages-container");
    
    const bubbleWrapper = document.createElement("div");
    bubbleWrapper.className = "chat-bubble-container agent";

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Construct the expander accordion
    const thoughtBlockHtml = `
        <div class="thought-process-container">
            <div class="thought-header" onclick="this.parentElement.classList.toggle('expanded')">
                <span class="thought-title">
                    <i data-lucide="brain" class="thought-icon"></i>
                    <span>View Agent Reasoning</span>
                </span>
                <i data-lucide="chevron-down" class="thought-chevron"></i>
            </div>
            <div class="thought-body">${initialThought}</div>
        </div>
    `;

    bubbleWrapper.innerHTML = `
        ${thoughtBlockHtml}
        <div class="chat-bubble">
            <div class="typing-target">
                <div class="bubble-typing-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        </div>
        <span class="chat-time">${timestamp}</span>
    `;

    container.appendChild(bubbleWrapper);
    lucide.createIcons();
    scrollToBottom();

    return bubbleWrapper;
}

// Dynamically updates thoughts in the expander accordion
function updatePlaceholderThoughts(bubbleElement, thoughtsText) {
    const body = bubbleElement.querySelector(".thought-body");
    if (body) {
        body.innerHTML = thoughtsText.replace(/\n/g, "<br>");
    }
}

// Reveals the fully formatted response all at once, removing the typing indicator
function revealAgentBubbleContent(bubbleElement, fullThoughtLog, mdContent) {
    // Ensure thoughts are completely populated
    const body = bubbleElement.querySelector(".thought-body");
    if (body) {
        body.innerHTML = fullThoughtLog.replace(/\n/g, "<br>");
    }

    const targetSpan = bubbleElement.querySelector(".typing-target");
    if (targetSpan) {
        // Set fully parsed Markdown all at once
        targetSpan.innerHTML = marked.parse(mdContent);
    }
    
    scrollToBottom();
}

function appendBubble(sender, text) {
    const container = document.getElementById("chat-messages-container");
    const bubbleWrapper = document.createElement("div");
    bubbleWrapper.className = `chat-bubble-container ${sender}`;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubbleWrapper.innerHTML = `
        <div class="chat-bubble">
            <p>${escapeHtml(text)}</p>
        </div>
        <span class="chat-time">${timestamp}</span>
    `;

    container.appendChild(bubbleWrapper);
    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById("chat-messages-container");
    container.scrollTop = container.scrollHeight;
}

// ----------------------------------------------------
// 4. TEXT FORMATTING UTILS
// ----------------------------------------------------

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

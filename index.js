// OVERTIME AI AGENT - CORE DASHBOARD LOGIC (index.js)

// ----------------------------------------------------
// 1. DATA MODELS & STATE MANAGEMENT
// ----------------------------------------------------

const GLOBAL_DATA = {
    departments: {
        all: {
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            otHours: [1200, 1150, 1380, 1940, 1642, 1720, 1450, 1300, 1550, 1800, 2100, 1950],
            vacancies: [28, 30, 34, 42, 45, 41, 38, 35, 39, 44, 48, 43],
            otCost: [72000, 69000, 82800, 116400, 98520, 103200, 87000, 78000, 93000, 108000, 126000, 117000],
            drivers: {
                understaffing: 624, // 38%
                outages: 361,       // 22%
                seasonality: 295,   // 18%
                backlog: 246,       // 15%
                others: 116         // 7%
            },
            primaryDriver: "Logistics Vacancies",
            driverSubtext: "Accounting for 38% of total hours"
        },
        logistics: {
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            otHours: [500, 480, 520, 980, 610, 880, 720, 650, 810, 920, 1150, 1020],
            vacancies: [12, 14, 16, 22, 25, 23, 20, 18, 22, 24, 28, 25],
            otCost: [30000, 28800, 31200, 58800, 36600, 52800, 43200, 39000, 48600, 55200, 69000, 61200],
            drivers: {
                understaffing: 450,
                outages: 40,
                seasonality: 320,
                backlog: 120,
                others: 40
            },
            primaryDriver: "Warehouse Shortages",
            driverSubtext: "Understaffing responsible for 46% of Logistics OT"
        },
        cs: {
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            otHours: [300, 290, 310, 320, 680, 340, 310, 280, 330, 410, 480, 420],
            vacancies: [8, 8, 9, 10, 11, 8, 9, 8, 9, 11, 12, 10],
            otCost: [18000, 17400, 18600, 19200, 40800, 20400, 18600, 16800, 19800, 24600, 28800, 25200],
            drivers: {
                understaffing: 90,
                outages: 420,
                seasonality: 40,
                backlog: 110,
                others: 20
            },
            primaryDriver: "ERP System Outage",
            driverSubtext: "IT downtime caused 61% of Support OT in May"
        },
        engineering: {
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            otHours: [250, 230, 400, 420, 210, 320, 280, 240, 270, 310, 320, 340],
            vacancies: [5, 5, 6, 7, 6, 7, 6, 6, 5, 6, 5, 5],
            otCost: [15000, 13800, 24000, 25200, 12600, 19200, 16800, 14400, 16200, 18600, 19200, 20400],
            drivers: {
                understaffing: 60,
                outages: 110,
                seasonality: 30,
                backlog: 310,
                others: 60
            },
            primaryDriver: "Cloud Migration Backlog",
            driverSubtext: "Sprint deadlines & releases account for 54%"
        },
        finance: {
            months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            otHours: [150, 150, 150, 220, 142, 180, 140, 130, 140, 160, 150, 170],
            vacancies: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            otCost: [9000, 9000, 9000, 13200, 8520, 10800, 8400, 7800, 8400, 9600, 9000, 10200],
            drivers: {
                understaffing: 24,
                outages: 21,
                seasonality: 50,
                backlog: 160,
                others: 20
            },
            primaryDriver: "Quarter-End Audits",
            driverSubtext: "Audit compliance driving 58% of finance OT"
        }
    },
    events: [
        { name: "SaaS CRM Migration", date: "May 10-14", type: "it", hours: 410, cost: 24600, dept: "cs" },
        { name: "Server Overload Incident", date: "May 12-15", type: "it", hours: 180, cost: 10800, dept: "cs" },
        { name: "Black Friday Shipping Prep", date: "Apr 15-28", type: "market", hours: 540, cost: 32400, dept: "logistics" },
        { name: "Supply Chain Delays", date: "Apr 20-25", type: "market", hours: 280, cost: 16800, dept: "logistics" },
        { name: "Year-End Ledger Audit", date: "Jun 18-24", type: "operations", hours: 190, cost: 11400, dept: "finance" },
        { name: "Tax Compliance Review", date: "Jun 20-23", type: "operations", hours: 120, cost: 7200, dept: "finance" },
        { name: "Database Service Outage", date: "May 22", type: "it", hours: 140, cost: 8400, dept: "engineering" },
        { name: "Q2 Inventory Stocktaking", date: "Apr 05-08", type: "operations", hours: 320, cost: 19200, dept: "logistics" },
        { name: "Q3 Inventory Stocktaking", date: "Jul 12-15", type: "operations", hours: 340, cost: 20400, dept: "logistics" },
        { name: "Labor Day Transit Surge", date: "Sep 02-05", type: "market", hours: 310, cost: 18600, dept: "logistics" },
        { name: "SaaS CRM Annual Archive", date: "Oct 14-16", type: "operations", hours: 150, cost: 9000, dept: "cs" },
        { name: "Black Friday Logistics Peak", date: "Nov 22-29", type: "market", hours: 580, cost: 34800, dept: "logistics" },
        { name: "Annual Ledger Reconciliation", date: "Dec 14-18", type: "operations", hours: 220, cost: 13200, dept: "finance" },
        { name: "Holiday System Freeze", date: "Dec 18-24", type: "operations", hours: 160, cost: 9600, dept: "engineering" }
    ],
    logs: [
        { employee: "Marcus Vance", department: "Logistics", date: "2026-06-18", hours: 14, cause: "Inventory Stocktaking Audit", cost: 840, status: "Approved" },
        { employee: "Siddharth Nair", department: "Customer Support", date: "2026-05-12", hours: 18, cause: "CRM Migration Outage Support", cost: 1080, status: "Approved" },
        { employee: "Elena Rostova", department: "Software Engineering", date: "2026-05-22", hours: 12, cause: "Database Crash Recovery", cost: 960, status: "Approved" },
        { employee: "Arthur Pendelton", department: "Finance & Billing", date: "2026-06-20", hours: 8, cause: "Quarterly Close Auditing", cost: 560, status: "Approved" },
        { employee: "Clarissa Zhang", department: "Logistics", date: "2026-04-18", hours: 22, cause: "Staff Shortage - Shift Cover", cost: 1320, status: "Approved" },
        { employee: "David Miller", department: "Customer Support", date: "2026-05-13", hours: 15, cause: "CRM Migration Outage Support", cost: 900, status: "Approved" },
        { employee: "Sarah Jenkins", department: "Logistics", date: "2026-04-20", hours: 16, cause: "Warehouse Black Friday Overload", cost: 960, status: "Approved" },
        { employee: "Kenji Sato", department: "Software Engineering", date: "2026-06-05", hours: 10, cause: "CI/CD Deployment Failure", cost: 800, status: "Approved" },
        { employee: "Amira Khatib", department: "Finance & Billing", date: "2026-04-15", hours: 6, cause: "Backlog Voucher Processing", cost: 420, status: "Approved" },
        { employee: "Niels Bohr", department: "Logistics", date: "2026-05-02", hours: 11, cause: "Understaffing - Delivery Backlog", cost: 660, status: "Approved" },
        { employee: "Chloe Dubois", department: "Customer Support", date: "2026-06-12", hours: 9, cause: "Surge in Customer Tickets", cost: 540, status: "Pending" },
        { employee: "Rajesh Koothra", department: "Software Engineering", date: "2026-04-28", hours: 14, cause: "Release 2.4 Hard Freeze Deadlines", cost: 1120, status: "Approved" },
        { employee: "Emma Watson", department: "Logistics", date: "2026-04-22", hours: 19, cause: "Warehouse Black Friday Overload", cost: 1140, status: "Approved" },
        { employee: "Linus Torvalds", department: "Software Engineering", date: "2026-05-22", hours: 16, cause: "Database Crash Recovery", cost: 1280, status: "Approved" },
        { employee: "Grace Hopper", department: "Software Engineering", date: "2026-03-15", hours: 8, cause: "Legacy Code Bugfixing", cost: 640, status: "Approved" },
        { employee: "Ada Lovelace", department: "Software Engineering", date: "2026-03-18", hours: 10, cause: "Analytics Engine Optimization", cost: 800, status: "Approved" },
        { employee: "Alan Turing", department: "Software Engineering", date: "2026-02-10", hours: 15, cause: "Database Security Patching", cost: 1200, status: "Approved" },
        { employee: "Albert Einstein", department: "Customer Support", date: "2026-01-20", hours: 12, cause: "New Year Sales Surge Support", cost: 720, status: "Approved" },
        { employee: "Katherine Johnson", department: "Finance & Billing", date: "2026-03-31", hours: 14, cause: "Q1 Financial Reconciliation", cost: 980, status: "Approved" },
        { employee: "Richard Feynman", department: "Logistics", date: "2026-02-25", hours: 18, cause: "Understaffing - Delivery Backlog", cost: 1080, status: "Approved" },
        { employee: "Marie Curie", department: "Customer Support", date: "2026-02-28", hours: 8, cause: "Understaffing - Weekend Coverage", cost: 480, status: "Approved" },
        { employee: "Nikola Tesla", department: "Software Engineering", date: "2026-01-15", hours: 12, cause: "Server Migration Overnight", cost: 960, status: "Approved" },
        { employee: "Stephen Hawking", department: "Customer Support", date: "2026-04-12", hours: 10, cause: "Understaffing - Ticket Backlog", cost: 600, status: "Approved" },
        { employee: "Charles Darwin", department: "Logistics", date: "2026-06-25", hours: 15, cause: "Q2 Inventory Stocktaking", cost: 900, status: "Pending" }
    ]
};

const DEPT_BASELINES = {
    all: { totalHeadcount: 650, standardHours: 84000, standardPay: 3360000 },
    logistics: { totalHeadcount: 280, standardHours: 36000, standardPay: 1080000 },
    cs: { totalHeadcount: 180, standardHours: 24000, standardPay: 720000 },
    engineering: { totalHeadcount: 140, standardHours: 18000, standardPay: 1260000 },
    finance: { totalHeadcount: 50, standardHours: 6000, standardPay: 300000 }
};

// Application Global State
let APP_STATE = {
    selectedDepartment: "all",
    selectedTimeframe: "ytd", // q2, h1, ytd
    selectedYear: 2026,
    enabledDrivers: ["understaffing", "outages", "seasonality", "backlog", "others"],
    selectedEventType: "all",
    
    // Table Sorting & Pagination
    tableSortField: "date",
    tableSortOrder: "desc",
    tableSearchQuery: "",
    tableCurrentPage: 1,
    tableRowsPerPage: 8,
    
    // Loaded Chart instances
    charts: {
        trend: null,
        drivers: null,
        events: null
    },
    scaleAnimationId: null,
    predictionsProgress: 1.0,
    predictionsAnimationId: null,
    vacancyProgress: 1.0,
    vacancyAnimationId: null,
    hoursProgress: 1.0,
    hoursAnimationId: null,
    payProgress: 1.0,
    payAnimationId: null,
    eventsProgress: 1.0,
    eventsAnimationId: null
};

// ----------------------------------------------------
// 2. COMPONENT INITIALIZATION
// ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Initialize historical data pools for prior years
    initHistoricalData();
    
    // Initialize standard state structures
    initDashboard();
    initEventListeners();
});

function initHistoricalData() {
    // Deep-copy baseline 2026 data
    GLOBAL_DATA.historical = {
        2026: {
            departments: JSON.parse(JSON.stringify(GLOBAL_DATA.departments)),
            events: JSON.parse(JSON.stringify(GLOBAL_DATA.events)),
            logs: JSON.parse(JSON.stringify(GLOBAL_DATA.logs))
        }
    };

    // Procedurally generate 2025 and 2024 deterministically
    const events2025 = [
        { name: "CS CRM Upgrade Support", date: "Mar 10-15", type: "it", hours: 320, cost: 19200, dept: "cs" },
        { name: "Black Friday Support Surge", date: "May 15-20", type: "market", hours: 250, cost: 15000, dept: "cs" },
        { name: "Port Strike Congestion", date: "Apr 10-18", type: "market", hours: 480, cost: 28800, dept: "logistics" },
        { name: "Warehouse Expansion Logistics", date: "Jan 15-22", type: "operations", hours: 350, cost: 21000, dept: "logistics" },
        { name: "Cloud Migration Outage", date: "Feb 14", type: "it", hours: 190, cost: 11400, dept: "engineering" },
        { name: "Q1 Tax Reconciliation Audit", date: "Mar 24-28", type: "operations", hours: 140, cost: 8400, dept: "finance" },
        { name: "Labor Day Transit Surge Prep", date: "Sep 01-05", type: "market", hours: 300, cost: 18000, dept: "logistics" },
        { name: "Black Friday Delivery Run", date: "Nov 22-29", type: "market", hours: 500, cost: 30000, dept: "logistics" },
        { name: "Year-End Accounts Closure", date: "Dec 18-23", type: "operations", hours: 160, cost: 9600, dept: "finance" },
        { name: "ERP Annual Data Purge", date: "Oct 15-18", type: "operations", hours: 120, cost: 7200, dept: "cs" },
        { name: "Annual Security Penetration Test", date: "Aug 10-14", type: "operations", hours: 140, cost: 8400, dept: "engineering" }
    ];

    const events2024 = [
        { name: "Helpdesk Platform Training", date: "Jan 08-12", type: "operations", hours: 210, cost: 12600, dept: "cs" },
        { name: "Supply Chain Rerouting", date: "Mar 05-12", type: "market", hours: 400, cost: 24000, dept: "logistics" },
        { name: "Fuel Surcharge Audit", date: "Feb 18-22", type: "operations", hours: 180, cost: 10800, dept: "logistics" },
        { name: "Data Center Power Failure", date: "Jun 02-04", type: "it", hours: 230, cost: 13800, dept: "engineering" },
        { name: "Core API Security Patching", date: "Apr 12-14", type: "it", hours: 160, cost: 9600, dept: "engineering" },
        { name: "M&A Corporate Audit", date: "May 10-18", type: "operations", hours: 290, cost: 17400, dept: "finance" },
        { name: "Summer Fleet Inspection", date: "Jul 15-20", type: "operations", hours: 320, cost: 19200, dept: "logistics" },
        { name: "Q3 Financial Performance Audit", date: "Sep 22-26", type: "operations", hours: 150, cost: 9000, dept: "finance" },
        { name: "Black Friday Order Overflow", date: "Nov 24-28", type: "market", hours: 280, cost: 16800, dept: "cs" },
        { name: "Holiday Schedule Dispatch", date: "Dec 20-24", type: "market", hours: 420, cost: 25200, dept: "logistics" }
    ];

    [2025, 2024].forEach(year => {
        const factor = year === 2025 ? 0.91 : 0.81;
        const deptsCopy = JSON.parse(JSON.stringify(GLOBAL_DATA.historical[2026].departments));
        
        // Setup distinct monthly multipliers to ensure unique shapes data-wise
        const hoursMultipliers = year === 2025 
            ? [1.15, 0.85, 0.95, 1.25, 0.75, 1.10, 0.90, 1.05, 1.25, 0.80, 0.95, 1.05]
            : [0.80, 1.20, 0.75, 1.10, 1.25, 0.85, 1.05, 0.95, 0.70, 1.25, 0.90, 1.20];
            
        const vacMultipliers = year === 2025
            ? [0.85, 1.15, 1.20, 0.80, 1.10, 0.95, 1.05, 1.25, 0.75, 1.15, 0.90, 0.95]
            : [1.20, 0.75, 0.90, 1.15, 0.80, 1.10, 1.25, 0.85, 1.00, 0.70, 1.20, 1.05];

        // Scale departments with organic monthly variations
        for (const dept in deptsCopy) {
            const d = deptsCopy[dept];
            d.otHours = d.otHours.map((v, idx) => v === null ? null : Math.round(v * factor * hoursMultipliers[idx]));
            d.otCost = d.otCost.map((v, idx) => v === null ? null : Math.round(v * factor * hoursMultipliers[idx]));
            d.vacancies = d.vacancies.map((v, idx) => v === null ? null : Math.max(0, Math.round(v * (factor + 0.05) * vacMultipliers[idx])));
            
            // scale drivers
            for (const k in d.drivers) {
                d.drivers[k] = Math.round(d.drivers[k] * factor);
            }
        }

        // Scale and shift logs
        const logsCopy = JSON.parse(JSON.stringify(GLOBAL_DATA.historical[2026].logs));
        logsCopy.forEach(log => {
            log.hours = Math.round(log.hours * factor);
            log.cost = Math.round(log.cost * factor);
            log.date = log.date.replace("2026", year.toString());
            
            // Map causes to fit the events of each specific year
            if (year === 2025) {
                if (log.cause.includes("CRM Migration")) {
                    log.cause = "CS CRM Upgrade Support";
                } else if (log.cause.includes("Database Crash") || log.cause.includes("CI/CD Deployment")) {
                    log.cause = "Cloud Migration Support";
                } else if (log.cause.includes("Quarterly Close") || log.cause.includes("Reconciliation")) {
                    log.cause = "Q1 Tax Reconciliation Audit";
                } else if (log.cause.includes("Warehouse Black Friday") || log.cause.includes("Understaffing - Delivery")) {
                    log.cause = "Port Strike Logistics Recovery";
                } else if (log.cause.includes("Inventory Stocktaking") || log.cause.includes("Staff Shortage")) {
                    log.cause = "Warehouse Expansion Logistics";
                } else if (log.cause.includes("Customer Tickets")) {
                    log.cause = "CS Ticket Surge";
                }
            } else if (year === 2024) {
                if (log.cause.includes("CRM Migration") || log.cause.includes("Customer Tickets")) {
                    log.cause = "Helpdesk Platform Training Support";
                } else if (log.cause.includes("Database Crash") || log.cause.includes("CI/CD Deployment")) {
                    log.cause = "Core API Security Patching";
                } else if (log.cause.includes("Quarterly Close") || log.cause.includes("Reconciliation")) {
                    log.cause = "M&A Corporate Audit";
                } else if (log.cause.includes("Warehouse Black Friday") || log.cause.includes("Understaffing - Delivery")) {
                    log.cause = "Supply Chain Rerouting Support";
                } else if (log.cause.includes("Inventory Stocktaking") || log.cause.includes("Staff Shortage")) {
                    log.cause = "Fuel Surcharge Audit";
                } else if (log.cause.includes("Server Migration")) {
                    log.cause = "Data Center Power Outage Support";
                }
            }
        });

        GLOBAL_DATA.historical[year] = {
            departments: deptsCopy,
            events: year === 2025 ? events2025 : events2024,
            logs: logsCopy
        };
    });
}

function getTimeframeSlice(timeframe) {
    switch (timeframe) {
        case "q1":
            return { start: 0, end: 3, label: "Q1" };
        case "q2":
            return { start: 3, end: 6, label: "Q2" };
        case "q3":
            return { start: 6, end: 9, label: "Q3" };
        case "q4":
            return { start: 9, end: 12, label: "Q4" };
        case "h1":
            return { start: 0, end: 6, label: "H1" };
        case "h2":
            return { start: 6, end: 12, label: "H2" };
        case "ytd":
            const endMonth = APP_STATE.selectedYear === 2026 ? 6 : 12;
            return { start: 0, end: endMonth, label: "YTD" };
        case "full":
        default:
            return { start: 0, end: 12, label: "Full Year" };
    }
}

function isUpcomingEvent(ev) {
    if (APP_STATE.selectedYear !== 2026) return false;
    const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = ev.date.substring(0, 3);
    const monthIndex = monthsList.indexOf(monthStr);
    return monthIndex >= 6; // July through December in 2026
}

function validateTimeframeForYear() {
    if (APP_STATE.selectedYear === 2026) {
        const valid2026 = ["q1", "q2", "h1", "ytd", "full"];
        if (!valid2026.includes(APP_STATE.selectedTimeframe)) {
            APP_STATE.selectedTimeframe = "ytd";
        }
    } else {
        const validHistorical = ["q1", "q2", "q3", "q4", "h1", "h2", "full"];
        if (!validHistorical.includes(APP_STATE.selectedTimeframe)) {
            APP_STATE.selectedTimeframe = "full";
        }
    }
}

function updateTimeframeSelector() {
    const container = document.querySelector(".timeframe-selector");
    if (!container) return;

    container.innerHTML = ""; // Clear existing elements

    let timeframes = [];
    if (APP_STATE.selectedYear === 2026) {
        timeframes = [
            { range: "q1", label: `Q1 ${APP_STATE.selectedYear}` },
            { range: "q2", label: `Q2 ${APP_STATE.selectedYear}` },
            { range: "h1", label: `H1 ${APP_STATE.selectedYear}` },
            { range: "ytd", label: "YTD" },
            { range: "full", label: "Full Year" }
        ];
    } else {
        timeframes = [
            { range: "q1", label: `Q1 ${APP_STATE.selectedYear}` },
            { range: "q2", label: `Q2 ${APP_STATE.selectedYear}` },
            { range: "q3", label: `Q3 ${APP_STATE.selectedYear}` },
            { range: "q4", label: `Q4 ${APP_STATE.selectedYear}` },
            { range: "h1", label: `H1 ${APP_STATE.selectedYear}` },
            { range: "h2", label: `H2 ${APP_STATE.selectedYear}` },
            { range: "full", label: "Full Year" }
        ];
    }

    // 1. Buttons Wrapper (for wider viewports)
    const buttonsWrapper = document.createElement("div");
    buttonsWrapper.className = "timeframe-buttons-wrapper";

    timeframes.forEach(tf => {
        const btn = document.createElement("button");
        btn.className = "tf-btn";
        if (APP_STATE.selectedTimeframe === tf.range) {
            btn.classList.add("active");
        }
        btn.dataset.range = tf.range;
        btn.innerText = tf.label;

        btn.addEventListener("click", () => {
            APP_STATE.selectedTimeframe = tf.range;
            
            // Re-render everything
            updateKPIs();
            renderTrendChart();
            renderDriversChart();
            renderLogsTable();
            updateTimeframeSelector(); // Sync dropdown selection
        });

        buttonsWrapper.appendChild(btn);
    });

    // 2. Dropdown Wrapper (for smaller viewports)
    const dropdownWrapper = document.createElement("div");
    dropdownWrapper.className = "timeframe-dropdown-wrapper";

    const selectEl = document.createElement("select");
    selectEl.className = "timeframe-select-dropdown";

    timeframes.forEach(tf => {
        const option = document.createElement("option");
        option.value = tf.range;
        option.innerText = tf.label;
        if (APP_STATE.selectedTimeframe === tf.range) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    });

    selectEl.addEventListener("change", (e) => {
        APP_STATE.selectedTimeframe = e.target.value;
        
        // Re-render everything
        updateKPIs();
        renderTrendChart();
        renderDriversChart();
        renderLogsTable();
        updateTimeframeSelector(); // Sync button active highlight states
    });

    dropdownWrapper.appendChild(selectEl);

    // Append both to the container
    container.appendChild(buttonsWrapper);
    container.appendChild(dropdownWrapper);
}

function setYear(year) {
    APP_STATE.selectedYear = parseInt(year, 10);
    
    // Swap global datasets to selected year
    GLOBAL_DATA.departments = JSON.parse(JSON.stringify(GLOBAL_DATA.historical[APP_STATE.selectedYear].departments));
    GLOBAL_DATA.events = JSON.parse(JSON.stringify(GLOBAL_DATA.historical[APP_STATE.selectedYear].events));
    GLOBAL_DATA.logs = JSON.parse(JSON.stringify(GLOBAL_DATA.historical[APP_STATE.selectedYear].logs));

        // Cancel any active line animations and sync progress with checkbox states
        if (APP_STATE.vacancyAnimationId) {
            cancelAnimationFrame(APP_STATE.vacancyAnimationId);
            APP_STATE.vacancyAnimationId = null;
        }
        if (APP_STATE.hoursAnimationId) {
            cancelAnimationFrame(APP_STATE.hoursAnimationId);
            APP_STATE.hoursAnimationId = null;
        }
        if (APP_STATE.payAnimationId) {
            cancelAnimationFrame(APP_STATE.payAnimationId);
            APP_STATE.payAnimationId = null;
        }
        if (APP_STATE.eventsAnimationId) {
            cancelAnimationFrame(APP_STATE.eventsAnimationId);
            APP_STATE.eventsAnimationId = null;
        }

        const vToggle = document.getElementById("toggle-vacancies");
        if (vToggle) APP_STATE.vacancyProgress = vToggle.checked ? 1.0 : 0.0;
        const hToggle = document.getElementById("toggle-ot-hours");
        if (hToggle) APP_STATE.hoursProgress = hToggle.checked ? 1.0 : 0.0;
        const pToggle = document.getElementById("toggle-trendline");
        if (pToggle) APP_STATE.payProgress = pToggle.checked ? 1.0 : 0.0;
        const eToggle = document.getElementById("toggle-events-overlay");
        if (eToggle) APP_STATE.eventsProgress = eToggle.checked ? 1.0 : 0.0;

        // Toggle predictions checkbox visibility depending on whether selected year is 2026
        const predToggle = document.getElementById("wrapper-toggle-predictions");
        if (predToggle) {
            if (APP_STATE.selectedYear === 2026) {
                predToggle.style.display = "flex";
                const toggleEl = document.getElementById("toggle-predictions");
                APP_STATE.predictionsProgress = (toggleEl && toggleEl.checked) ? 1.0 : 0.0;
            } else {
                predToggle.style.display = "none";
            }
        }

    // Handle timeframe constraints (fallback)
    validateTimeframeForYear();

    // Refresh dynamic timeframe selector buttons
    updateTimeframeSelector();
    
    // Trigger full redraw of components
    updateKPIs();
    renderTrendChart();
    renderDriversChart();
    renderLogsTable();
}

function initDashboard() {
    updateTimeframeSelector();
    updateKPIs();
    renderTrendChart();
    renderDriversChart();
    renderLogsTable();
}

// ----------------------------------------------------
// 3. CORE STATS CALCULATION
// ----------------------------------------------------

function updateKPIs() {
    const dept = APP_STATE.selectedDepartment;
    const data = GLOBAL_DATA.departments[dept];
    
    // Hours KPI
    const hoursVal = document.getElementById("kpi-hours-val");
    const hoursTrend = document.getElementById("kpi-hours-trend");
    
    // Vacancies KPI
    const vacanciesVal = document.getElementById("kpi-vacancies-val");
    const vacanciesTrend = document.getElementById("kpi-vacancies-trend");
    
    // Cost KPI
    const costVal = document.getElementById("kpi-cost-val");
    const costTrend = document.getElementById("kpi-cost-trend");

    // Driver KPI
    const driverVal = document.getElementById("kpi-primary-driver-val");
    const driverBadge = document.getElementById("kpi-driver-badge");

    // Recalculations based on timeframe and department
    let displayHours = 0;
    let displayVacancies = 0;
    let displayCost = 0;
    let otPercent = "-12.4%";
    let vacPercent = "+18.2%";
    let costReduction = "-$14,200";

    const slice = getTimeframeSlice(APP_STATE.selectedTimeframe);
    
    let hList = data.otHours.slice(slice.start, slice.end);
    let vList = data.vacancies.slice(slice.start, slice.end);
    let cList = data.otCost.slice(slice.start, slice.end);

    // If current year (2026), filter out future months (indices >= 6) from arrays used for calculations
    if (APP_STATE.selectedYear === 2026) {
        hList = hList.filter((_, i) => (slice.start + i) < 6);
        vList = vList.filter((_, i) => (slice.start + i) < 6);
        cList = cList.filter((_, i) => (slice.start + i) < 6);
    }

    displayHours = hList.reduce((a, b) => a + b, 0);
    displayVacancies = vList.length > 0 ? Math.round(vList.reduce((a, b) => a + b, 0) / vList.length) : 0;
    displayCost = cList.reduce((a, b) => a + b, 0);

    // Apply text changes
    hoursVal.innerText = displayHours.toLocaleString() + "h";
    vacanciesVal.innerText = displayVacancies.toLocaleString();
    costVal.innerText = "$" + displayCost.toLocaleString();

    // Overtime primary driver selection
    driverVal.innerText = data.primaryDriver;

    if (dept === "all") {
        driverBadge.innerText = "High Impact";
        driverBadge.className = "driver-tag alert";
        driverVal.className = "metric-value text-glow-rose";
    } else if (dept === "cs") {
        driverBadge.innerText = "System Issue";
        driverBadge.className = "driver-tag alert";
        driverVal.className = "metric-value text-glow-rose";
    } else if (dept === "finance") {
        driverBadge.innerText = "Compliant";
        driverBadge.className = "driver-tag approved";
        driverVal.className = "metric-value text-glow-emerald";
    } else {
        driverBadge.innerText = "Operational";
        driverBadge.className = "driver-tag pending";
        driverVal.className = "metric-value text-glow-violet";
    }
}

// ----------------------------------------------------
// 4. CHART.JS INTEGRATION
// ----------------------------------------------------

// Helper to get the exact, currently animating horizontal pixel position for any month scale value
// Since we animate the scale min/max frame-by-frame, getPixelForValue is perfectly accurate and smooth.
// We return the raw floating-point coordinate to allow the canvas engine to use sub-pixel anti-aliasing,
// which eliminates motion jitter (pixel snapping) during sliding transitions.
function getAnimatedX(chart, val) {
    return chart.scales.x.getPixelForValue(val);
}

// Helper to calculate the perfect Y-axis min/max range to fit the visible datasets inside an X-axis range
function calculateYRangeForXRange(chart, startX, endX) {
    let minVal = Infinity;
    let maxVal = -Infinity;
    
    chart.data.datasets.forEach(dataset => {
        // Only count if visible
        if (dataset.hidden) return;
        
        const data = dataset.data || [];
        data.forEach(pt => {
            // Include points whose X is within the visible range [startX, endX]
            if (pt.x >= startX - 0.01 && pt.x <= endX + 0.01 && pt.y !== null && !isNaN(pt.y)) {
                if (pt.y < minVal) minVal = pt.y;
                if (pt.y > maxVal) maxVal = pt.y;
            }
        });
    });
    
    // Fallback if no visible points are found
    if (minVal === Infinity || maxVal === -Infinity) {
        return { min: 0, max: 20 };
    }
    
    // Calculate final min based on the lowest percentage value.
    // If the lowest percentage is positive (> 0), the lowest number on the graph is 0.
    // If the lowest percentage is negative (or zero), it goes to the next-lowest integer.
    let finalMin;
    if (minVal > 0) {
        finalMin = 0;
    } else {
        finalMin = Math.floor(minVal);
        // Provide a small 1-integer buffer if the actual values sit exactly on or extremely close (< 0.15) to the boundaries.
        // This ensures line points are never clipped at the very bottom of the graph viewport.
        if (minVal - finalMin < 0.15) {
            finalMin -= 1;
        }
    }
    
    // The highest percentage on the graph always rounds to the next-highest integer (ceil)
    let finalMax = Math.ceil(maxVal);
    
    // Provide a small 1-integer buffer if the actual values sit exactly on or extremely close (< 0.15) to the boundaries.
    // This ensures line points are never clipped at the very top of the graph viewport.
    if (finalMax - maxVal < 0.15) {
        finalMax += 1;
    }
    
    // Ensure we don't have a flat scale if they end up being equal (or if minVal and maxVal are the same)
    if (finalMin === finalMax) {
        finalMin = finalMin > 0 ? finalMin - 1 : finalMin;
        finalMax = finalMax + 1;
    }
    
    return { min: finalMin, max: finalMax };
}

// Custom animation engine to smoothly pan scale limits frame-by-frame
function animateTrendChartScale(chart, targetMin, targetMax, durationMs = 750) {
    if (APP_STATE.scaleAnimationId) {
        cancelAnimationFrame(APP_STATE.scaleAnimationId);
        APP_STATE.scaleAnimationId = null;
    }
    
    chart.stop(); // Stop any active native Chart.js animations to prevent frame-fighting and jitter
    
    let startMin = typeof chart.options.scales.x.min === 'number' ? chart.options.scales.x.min : targetMin;
    let startMax = typeof chart.options.scales.x.max === 'number' ? chart.options.scales.x.max : targetMax;
    
    if (startMin === targetMin && startMax === targetMax) {
        chart.options.scales.x.min = targetMin;
        chart.options.scales.x.max = targetMax;
        
        // Also update Y-scale instantly if timeframe unchanged (department/toggle swap)
        const targetYRange = calculateYRangeForXRange(chart, targetMin, targetMax);
        chart.options.scales.y.min = targetYRange.min;
        chart.options.scales.y.max = targetYRange.max;
        
        chart.update(); // Native transitions for data/toggles if scale already at target
        return;
    }
    
    // Calculate Y scale boundaries
    const startMinY = typeof chart.options.scales.y.min === 'number' ? chart.options.scales.y.min : (chart.scales && chart.scales.y ? chart.scales.y.min : calculateYRangeForXRange(chart, startMin, startMax).min);
    const startMaxY = typeof chart.options.scales.y.max === 'number' ? chart.options.scales.y.max : (chart.scales && chart.scales.y ? chart.scales.y.max : calculateYRangeForXRange(chart, startMin, startMax).max);
    
    const targetYRange = calculateYRangeForXRange(chart, targetMin, targetMax);
    const targetMinY = targetYRange.min;
    const targetMaxY = targetYRange.max;
    
    const startTime = performance.now();
    
    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        
        // Premium Ease-In-Out Cubic: perfectly smooth acceleration and decelerating slowdown to zero velocity
        const ease = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        const currentMin = startMin + (targetMin - startMin) * ease;
        const currentMax = startMax + (targetMax - startMax) * ease;
        
        const currentMinY = startMinY + (targetMinY - startMinY) * ease;
        const currentMaxY = startMaxY + (targetMaxY - startMaxY) * ease;
        
        chart.options.scales.x.min = currentMin;
        chart.options.scales.x.max = currentMax;
        chart.options.scales.y.min = currentMinY;
        chart.options.scales.y.max = currentMaxY;
        
        chart.update('none');
        
        if (progress < 1) {
            APP_STATE.scaleAnimationId = requestAnimationFrame(step);
        } else {
            chart.options.scales.x.min = targetMin;
            chart.options.scales.x.max = targetMax;
            chart.options.scales.y.min = targetMinY;
            chart.options.scales.y.max = targetMaxY;
            chart.update('none');
            APP_STATE.scaleAnimationId = null;
        }
    }
    
    APP_STATE.scaleAnimationId = requestAnimationFrame(step);
}


// Cut off dataset smoothly up to an interpolated x_cut coordinate based on predictionsProgress
function cutDatasetAtProgress(data, progress) {
    if (progress >= 1.0) return data;
    if (progress <= 0.0) {
        const result = data.filter(pt => pt.x <= 5.0);
        const junePt = result.find(pt => pt.x === 5.0);
        if (junePt) {
            result.push({ x: 5.5, y: junePt.y });
        }
        return result;
    }
    
    const x_cut = 5.0 + 6.5 * progress;
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
        const pt = data[i];
        if (pt.x <= x_cut) {
            result.push({ x: pt.x, y: pt.y });
        } else {
            const prevPt = data[i - 1];
            if (prevPt) {
                const t = (x_cut - prevPt.x) / (pt.x - prevPt.x);
                const interpolatedY = prevPt.y + t * (pt.y - prevPt.y);
                result.push({ x: x_cut, y: parseFloat(interpolatedY.toFixed(2)) });
            }
            break;
        }
    }
    return result;
}

// Animate predictions progress in/out using easeInOutQuad
function animatePredictions(show) {
    if (APP_STATE.predictionsAnimationId) {
        cancelAnimationFrame(APP_STATE.predictionsAnimationId);
        APP_STATE.predictionsAnimationId = null;
    }
    
    const duration = 600; // 600ms for premium fluid transition feel
    const startProgress = APP_STATE.predictionsProgress;
    const targetProgress = show ? 1.0 : 0.0;
    
    if (startProgress === targetProgress) return;
    
    const startTime = performance.now();
    
    function step(timestamp) {
        const elapsed = timestamp - startTime;
        const ratio = Math.min(elapsed / duration, 1.0);
        
        // easeInOutQuad
        const ease = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
        
        APP_STATE.predictionsProgress = startProgress + (targetProgress - startProgress) * ease;
        
        renderTrendChart();
        
        if (ratio < 1.0) {
            APP_STATE.predictionsAnimationId = requestAnimationFrame(step);
        } else {
            APP_STATE.predictionsProgress = targetProgress;
            APP_STATE.predictionsAnimationId = null;
            renderTrendChart();
        }
    }
    
    APP_STATE.predictionsAnimationId = requestAnimationFrame(step);
}

// Cut off entire dataset smoothly from minX to maxX based on animation progress
function cutFullDatasetAtProgress(data, progress) {
    if (progress >= 1.0) return data;
    if (progress <= 0.0) return []; // Completely hidden
    if (!data || data.length === 0) return [];
    
    const minX = data[0].x;
    const maxX = data[data.length - 1].x;
    const x_cut = minX + (maxX - minX) * progress;
    
    const result = [];
    for (let i = 0; i < data.length; i++) {
        const pt = data[i];
        if (pt.x <= x_cut) {
            result.push({ x: pt.x, y: pt.y });
        } else {
            const prevPt = data[i - 1];
            if (prevPt) {
                if (Math.abs(prevPt.x - x_cut) > 0.0001) {
                    const t = (x_cut - prevPt.x) / (pt.x - prevPt.x);
                    const interpolatedY = prevPt.y + t * (pt.y - prevPt.y);
                    result.push({ x: x_cut, y: parseFloat(interpolatedY.toFixed(2)) });
                }
            }
            break;
        }
    }
    return result;
}

// General parameterized function to animate showing/hiding any core line
function animateLine(key, show) {
    const animKey = `${key}AnimationId`;
    const progKey = `${key}Progress`;
    
    if (APP_STATE[animKey]) {
        cancelAnimationFrame(APP_STATE[animKey]);
        APP_STATE[animKey] = null;
    }
    
    const duration = 600; // 600ms fluid transition
    const startProgress = APP_STATE[progKey];
    const targetProgress = show ? 1.0 : 0.0;
    
    if (startProgress === targetProgress) return;
    
    const startTime = performance.now();
    
    function step(timestamp) {
        const elapsed = timestamp - startTime;
        const ratio = Math.min(elapsed / duration, 1.0);
        
        // easeInOutQuad
        const ease = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
        
        APP_STATE[progKey] = startProgress + (targetProgress - startProgress) * ease;
        
        renderTrendChart();
        
        if (ratio < 1.0) {
            APP_STATE[animKey] = requestAnimationFrame(step);
        } else {
            APP_STATE[progKey] = targetProgress;
            APP_STATE[animKey] = null;
            renderTrendChart();
        }
    }
    
    APP_STATE[animKey] = requestAnimationFrame(step);
}

// Animate events progress in/out using easeInOutQuad for vertical sliding transition
function animateEvents(show) {
    if (APP_STATE.eventsAnimationId) {
        cancelAnimationFrame(APP_STATE.eventsAnimationId);
        APP_STATE.eventsAnimationId = null;
    }
    
    const duration = 600; // 600ms premium fluid transition
    const startProgress = APP_STATE.eventsProgress;
    const targetProgress = show ? 1.0 : 0.0;
    
    if (startProgress === targetProgress) return;
    
    const startTime = performance.now();
    
    function step(timestamp) {
        const elapsed = timestamp - startTime;
        const ratio = Math.min(elapsed / duration, 1.0);
        
        // easeInOutQuad
        const ease = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
        
        APP_STATE.eventsProgress = startProgress + (targetProgress - startProgress) * ease;
        
        renderTrendChart();
        
        if (ratio < 1.0) {
            APP_STATE.eventsAnimationId = requestAnimationFrame(step);
        } else {
            APP_STATE.eventsProgress = targetProgress;
            APP_STATE.eventsAnimationId = null;
            renderTrendChart();
        }
    }
    
    APP_STATE.eventsAnimationId = requestAnimationFrame(step);
}


// Render Trend Correlation Chart (Pure Line-Only Chart for Percentages with Event Overlays)
function renderTrendChart() {
    const ctx = document.getElementById("trendChart").getContext("2d");
    const dept = APP_STATE.selectedDepartment;
    const slice = getTimeframeSlice(APP_STATE.selectedTimeframe);
    
    const months = GLOBAL_DATA.departments[dept].months;
    let otHoursList = [...GLOBAL_DATA.departments[dept].otHours];
    let vacanciesList = [...GLOBAL_DATA.departments[dept].vacancies];
    let otCostList = [...GLOBAL_DATA.departments[dept].otCost];

    const showPredictions = document.getElementById("toggle-predictions") ? document.getElementById("toggle-predictions").checked : true;
    const includePredictions = showPredictions || (APP_STATE.selectedYear === 2026 && APP_STATE.predictionsProgress > 0.0);
    if (APP_STATE.selectedYear === 2026 && !includePredictions) {
        for (let i = 6; i < 12; i++) {
            otHoursList[i] = null;
            vacanciesList[i] = null;
            otCostList[i] = null;
        }
    }

    const baseline = DEPT_BASELINES[dept] || DEPT_BASELINES.all;


    // Calculate percentages (handling nulls gracefully so Chart.js can render line breaks/cutoffs)
    const vacancyPercentages = vacanciesList.map(v => v === null ? null : parseFloat(((v / baseline.totalHeadcount) * 100).toFixed(2)));
    const hoursPercentages = otHoursList.map(h => h === null ? null : parseFloat(((h / baseline.standardHours) * 100).toFixed(2)));
    const payPercentages = otCostList.map(c => c === null ? null : parseFloat(((c / baseline.standardPay) * 100).toFixed(2)));

    // Helper to extend dataset to scale edges for a full-bleed graph
    function extendDatasetToEdges(percentages) {
        let firstIdx = -1;
        let lastIdx = -1;
        for (let i = 0; i < percentages.length; i++) {
            if (percentages[i] !== null) {
                if (firstIdx === -1) firstIdx = i;
                lastIdx = i;
            }
        }
        if (firstIdx === -1) return [];
        
        const data = [];
        // Prepend edge point
        data.push({ x: firstIdx - 0.5, y: percentages[firstIdx] });
        // Main points
        for (let i = firstIdx; i <= lastIdx; i++) {
            data.push({ x: i, y: percentages[i] });
            // Insert a midpoint halfway between June (5) and July (6) if predictions are enabled
            if (i === 5 && percentages[6] !== null && percentages[5] !== null) {
                const midY = parseFloat(((percentages[5] + percentages[6]) / 2).toFixed(2));
                data.push({ x: 5.5, y: midY });
            }
        }
        // Append edge point
        data.push({ x: lastIdx + 0.5, y: percentages[lastIdx] });
        return data;
    }

    // Map arrays to {x, y} coordinate objects for linear x-axis interpolation, extended to edges for full-bleed lines
    let vacancyData = extendDatasetToEdges(vacancyPercentages);
    let hoursData = extendDatasetToEdges(hoursPercentages);
    let payData = extendDatasetToEdges(payPercentages);

    // If year is 2026, cut off the datasets smoothly according to predictionsProgress
    if (APP_STATE.selectedYear === 2026) {
        vacancyData = cutDatasetAtProgress(vacancyData, APP_STATE.predictionsProgress);
        hoursData = cutDatasetAtProgress(hoursData, APP_STATE.predictionsProgress);
        payData = cutDatasetAtProgress(payData, APP_STATE.predictionsProgress);
    }

    // Cut off datasets smoothly according to each line's progress
    vacancyData = cutFullDatasetAtProgress(vacancyData, APP_STATE.vacancyProgress);
    hoursData = cutFullDatasetAtProgress(hoursData, APP_STATE.hoursProgress);
    payData = cutFullDatasetAtProgress(payData, APP_STATE.payProgress);

    const isDark = document.body.classList.contains("dark-theme");

    const vChecked = document.getElementById("toggle-vacancies") ? document.getElementById("toggle-vacancies").checked : true;
    const hChecked = document.getElementById("toggle-ot-hours") ? document.getElementById("toggle-ot-hours").checked : true;
    const pChecked = document.getElementById("toggle-trendline") ? document.getElementById("toggle-trendline").checked : true;

    if (APP_STATE.charts.trend) {
        const chart = APP_STATE.charts.trend;
        chart.data.labels = months;
        chart.data.datasets[0].data = vacancyData;
        chart.data.datasets[0].hidden = !vChecked && APP_STATE.vacancyProgress === 0.0;
        chart.data.datasets[1].data = hoursData;
        chart.data.datasets[1].hidden = !hChecked && APP_STATE.hoursProgress === 0.0;
        chart.data.datasets[2].data = payData;
        chart.data.datasets[2].hidden = !pChecked && APP_STATE.payProgress === 0.0;

        chart.data.datasets.forEach(dataset => {
            const strokeColor = dataset.borderColor;
            dataset.pointBorderColor = (ctx) => {
                const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                if (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) {
                    return strokeColor;
                }
                return isDark ? '#07080d' : '#ffffff';
            };
            dataset.pointBackgroundColor = (ctx) => {
                const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                if (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) {
                    return isDark ? '#0d0f1a' : '#ffffff';
                }
                return strokeColor;
            };
        });

        // Update Theme-specific options
        chart.options.plugins.tooltip.backgroundColor = isDark ? '#12131a' : '#ffffff';
        chart.options.plugins.tooltip.titleColor = isDark ? '#f8fafc' : '#0f172a';
        chart.options.plugins.tooltip.bodyColor = isDark ? '#94a3b8' : '#475569';
        chart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        
        chart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
        chart.options.scales.y.ticks.color = isDark ? '#94a3b8' : '#475569';
        chart.options.scales.y.title.color = isDark ? '#94a3b8' : '#475569';

        const yearChanged = chart.lastSelectedYear !== APP_STATE.selectedYear;
        chart.lastSelectedYear = APP_STATE.selectedYear;

        if (yearChanged) {
            if (APP_STATE.scaleAnimationId) {
                cancelAnimationFrame(APP_STATE.scaleAnimationId);
                APP_STATE.scaleAnimationId = null;
            }
            chart.options.scales.x.min = slice.start - 0.5;
            chart.options.scales.x.max = slice.end - 0.5;
            
            // Instantly update Y scale limits on year swap to avoid jumps
            const targetYRange = calculateYRangeForXRange(chart, slice.start - 0.5, slice.end - 0.5);
            chart.options.scales.y.min = targetYRange.min;
            chart.options.scales.y.max = targetYRange.max;
            
            chart.update('none'); // Instant swap when year changes
        } else {
            animateTrendChartScale(chart, slice.start - 0.5, slice.end - 0.5, 750);
        }

        renderActiveEventsList();
        return;
    }

    const showEvents = document.getElementById("toggle-events-overlay") ? document.getElementById("toggle-events-overlay").checked : true;

    // Custom Canvas Plugin to draw Vertical Event Overlays (Lines & Shaded Regions) with Hover Interactivity
    const eventOverlayPlugin = {
        id: 'eventOverlay',
        beforeDraw: (chart) => {
            // Dynamically retrieve transitioning point border colors from the transition tracker element
            const tracker = document.getElementById("theme-transition-tracker");
            const isDark = document.body.classList.contains("dark-theme");
            let dotBorderColor = isDark ? '#07080d' : '#ffffff';
            if (tracker) {
                const computedStyle = window.getComputedStyle(tracker);
                dotBorderColor = computedStyle.backgroundColor || dotBorderColor;
            }
            chart.data.datasets.forEach(dataset => {
                const strokeColor = dataset.borderColor;
                dataset.pointBorderColor = (ctx) => {
                    const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                    const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                    if (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) {
                        return strokeColor;
                    }
                    return dotBorderColor;
                };
                dataset.pointBackgroundColor = (ctx) => {
                    const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                    const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                    if (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) {
                        return isDark ? '#0d0f1a' : '#ffffff';
                    }
                    return strokeColor;
                };
            });

            // Flatten control points for transition segments (x = 5.0 to 5.5, and 5.5 to 6.0) in 2026 to ensure straight lines (including dynamic cut-off during animations)
            if (APP_STATE.selectedYear === 2026) {
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (meta && meta.data) {
                        meta.data.forEach((pt, idx) => {
                            const raw = dataset.data[idx];
                            const xVal = raw && typeof raw === 'object' ? raw.x : null;
                            if (xVal === 5.0) {
                                pt.cp2x = pt.x;
                                pt.cp2y = pt.y;
                            } else if (xVal === 5.5) {
                                pt.cp1x = pt.x;
                                pt.cp1y = pt.y;
                                pt.cp2x = pt.x;
                                pt.cp2y = pt.y;
                            } else if (xVal === 6.0) {
                                pt.cp1x = pt.x;
                                pt.cp1y = pt.y;
                            } else if (xVal > 5.0 && xVal < 6.0) {
                                // Cut-off point during active transition animation frame
                                pt.cp1x = pt.x;
                                pt.cp1y = pt.y;
                            }
                        });
                    }
                });
            }

            const showEvents = document.getElementById("toggle-events-overlay") ? document.getElementById("toggle-events-overlay").checked : true;
            if (!showEvents && APP_STATE.eventsProgress === 0.0) return;
            
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            
            const months = chart.data.labels;
            ctx.save();
            
            // Clip to chart area boundaries for shaded regions and vertical lines
            ctx.save();
            ctx.beginPath();
            ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
            ctx.clip();
            
            // Fade the shaded areas and vertical lines smoothly in-place
            ctx.globalAlpha = APP_STATE.eventsProgress;
            
            const currentDept = APP_STATE.selectedDepartment;
            
            GLOBAL_DATA.events.forEach(ev => {
                // Filter events based on selected department (all shows all, specific department isolates it)
                if (currentDept !== "all" && ev.dept !== currentDept) {
                    return;
                }
                
                const monthStr = ev.date.substring(0, 3); // "Jan", "Feb", etc.
                const monthIndex = months.indexOf(monthStr);
                if (monthIndex === -1) return;
                
                const daysPart = ev.date.substring(4); // "10-14" or "22"
                let startDay = 1;
                let endDay = 1;
                if (daysPart.includes("-")) {
                    const parts = daysPart.split("-");
                    startDay = parseInt(parts[0], 10);
                    endDay = parseInt(parts[1], 10);
                } else {
                    startDay = parseInt(daysPart, 10);
                    endDay = startDay;
                }
                
                const daysInMonthMap = {
                    Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
                    Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
                };
                const totalDays = daysInMonthMap[monthStr] || 30;
                
                // Align event days dynamically on the monthly category scale
                const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
                const endVal = monthIndex - 0.5 + (endDay - 0.5) / totalDays;
                
                const startX = getAnimatedX(chart, startVal);
                const endX = getAnimatedX(chart, endVal);
                
                let colorHex = "#0072bc"; /* Metro Blue (A Line) */
                let bgHex = "rgba(0, 114, 188, 0.05)";
                
                const isHovered = (chart.hoveredEvents && chart.hoveredEvents.includes(ev)) || (chart.hoveredEvent === ev);
                
                if (ev.type === "operations") {
                    colorHex = "#58a738"; /* Metro Green (C Line) */
                    bgHex = isHovered ? "rgba(88, 167, 56, 0.18)" : "rgba(88, 167, 56, 0.05)";
                } else if (ev.type === "market") {
                    colorHex = "#e3131b"; /* Metro Red (B Line) */
                    bgHex = isHovered ? "rgba(227, 19, 27, 0.18)" : "rgba(227, 19, 27, 0.05)";
                } else {
                    bgHex = isHovered ? "rgba(0, 114, 188, 0.18)" : "rgba(0, 114, 188, 0.05)";
                }
                
                if (startDay !== endDay) {
                    // Shaded section for multi-day events
                    ctx.fillStyle = bgHex;
                    ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);
                    
                    // Dashed borders
                    ctx.strokeStyle = colorHex;
                    ctx.lineWidth = isHovered ? 2.5 : 1.5;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(startX, chartArea.top);
                    ctx.lineTo(startX, chartArea.bottom);
                    ctx.moveTo(endX, chartArea.top);
                    ctx.lineTo(endX, chartArea.bottom);
                    ctx.stroke();
                } else {
                    // Single-day vertical line
                    ctx.strokeStyle = colorHex;
                    ctx.lineWidth = isHovered ? 2.5 : 1.5;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.moveTo(startX, chartArea.top);
                    ctx.lineTo(startX, chartArea.bottom);
                    ctx.stroke();
                }
            });
            ctx.restore(); // Restore clip
            ctx.restore();
        },
        
        afterDatasetsDraw: (chart) => {
            const showEvents = document.getElementById("toggle-events-overlay") ? document.getElementById("toggle-events-overlay").checked : true;
            if (!showEvents && APP_STATE.eventsProgress === 0.0) return;
            
            const { ctx, chartArea } = chart;
            if (!chartArea) return;

            const slideOffset = (1.0 - APP_STATE.eventsProgress) * chartArea.height;
            
            const months = chart.data.labels;
            const currentDept = APP_STATE.selectedDepartment;
            const isDark = document.body.classList.contains("dark-theme");
            
            // Dynamically retrieve transitioning badge colors from the transition tracker element
            const tracker = document.getElementById("theme-transition-tracker");
            let badgeBg = isDark ? "#0c0d16" : "#ffffff";
            let badgeTextHover = isDark ? "#ffffff" : "#0f172a";
            if (tracker) {
                const computedStyle = window.getComputedStyle(tracker);
                badgeBg = computedStyle.backgroundColor || badgeBg;
                badgeTextHover = computedStyle.color || badgeTextHover;
            }
            
            // Draw rotated event flag badges in the foreground (after lines, but before tooltips)
            ctx.save();
            
            // Clip to chartArea so that sliding badges don't overflow the axes
            ctx.beginPath();
            ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
            ctx.clip();
            
            let visibleEventIndex = 0;
            GLOBAL_DATA.events.forEach(ev => {
                if (currentDept !== "all" && ev.dept !== currentDept) {
                    return;
                }
                
                const monthStr = ev.date.substring(0, 3);
                const monthIndex = months.indexOf(monthStr);
                if (monthIndex === -1) return;
                
                const daysPart = ev.date.substring(4);
                let startDay = 1;
                if (daysPart.includes("-")) {
                    startDay = parseInt(daysPart.split("-")[0], 10);
                } else {
                    startDay = parseInt(daysPart, 10);
                }
                
                const daysInMonthMap = {
                    Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
                    Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
                };
                const totalDays = daysInMonthMap[monthStr] || 30;
                const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
                const startX = getAnimatedX(chart, startVal);
                
                let colorHex = "#0072bc"; /* Metro Blue */
                if (ev.type === "operations") {
                    colorHex = "#58a738"; /* Metro Green */
                } else if (ev.type === "market") {
                    colorHex = "#e3131b"; /* Metro Red */
                }
                
                const isHovered = (chart.hoveredEvents && chart.hoveredEvents.includes(ev)) || (chart.hoveredEvent === ev);
                
                ctx.save();
                ctx.font = isHovered ? "bold 10px Outfit" : "600 9px Outfit";
                const textWidth = ctx.measureText(ev.name).width;
                
                // Alternate Y offset to prevent overlapping label collisions!
                const yOffsetBase = 12 + (visibleEventIndex % 2) * 22;
                visibleEventIndex++;
                
                // Translate & Rotate to create a beautiful hanging ribbon/tag
                ctx.translate(startX + 11, chartArea.top + yOffsetBase - slideOffset);
                ctx.rotate(Math.PI / 2);
                
                // Solid background for extreme readability
                ctx.fillStyle = badgeBg;
                ctx.beginPath();
                
                const padX = isHovered ? 8 : 6;
                const padY = isHovered ? 10 : 8;
                const badgeHeight = isHovered ? 14 : 12;
                
                if (ctx.roundRect) {
                    ctx.roundRect(-padX, -padY, textWidth + padX * 2, badgeHeight, 5);
                } else {
                    ctx.rect(-padX, -padY, textWidth + padX * 2, badgeHeight);
                }
                ctx.fill();
                
                // Elegant capsule border matching category color
                ctx.strokeStyle = colorHex;
                ctx.lineWidth = isHovered ? 2 : 1;
                ctx.stroke();
                
                // Contrasting text
                ctx.fillStyle = isHovered ? badgeTextHover : colorHex;
                ctx.textBaseline = "middle";
                ctx.fillText(ev.name, 0, badgeHeight / 2 - padY);
                ctx.restore();
            });
            ctx.restore();
        },
        
        afterDraw: (chart) => {
            const showEvents = document.getElementById("toggle-events-overlay") ? document.getElementById("toggle-events-overlay").checked : true;
            if (!showEvents && APP_STATE.eventsProgress === 0.0) return;
            
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            
            const isDark = document.body.classList.contains("dark-theme");
            
            // Draw interactive details popup card if an event is active (on top of everything)
            const hoveredEvents = chart.hoveredEvents || (chart.hoveredEvent ? [chart.hoveredEvent] : []);
            if (hoveredEvents.length > 0 && chart.hoveredMousePos) {
                 const mPos = chart.hoveredMousePos;
                 
                 ctx.save();
                 
                 const tooltipW = 210;
                 const tooltipH = 58;
                 const spacing = 8;
                 const totalStackH = hoveredEvents.length * tooltipH + (hoveredEvents.length - 1) * spacing;
                 
                 // Center stacked tooltips relative to the mouse vertically
                 let tooltipX = mPos.x + 15;
                 let tooltipY = mPos.y - (totalStackH / 2);
                 
                 if (tooltipX + tooltipW > chartArea.right) {
                     tooltipX = mPos.x - tooltipW - 15;
                 }
                 if (tooltipY + totalStackH > chartArea.bottom) {
                     tooltipY = chartArea.bottom - totalStackH - 10;
                 }
                 if (tooltipY < chartArea.top) {
                     tooltipY = chartArea.top + 10;
                 }

                 // Avoid overlapping the standard Chart.js data point tooltip if it is active
                 const chartTooltip = chart.tooltip;
                 if (chartTooltip && chartTooltip.opacity > 0) {
                     const tX = chartTooltip.x;
                     const tY = chartTooltip.y;
                     const tW = chartTooltip.width || 140;
                     const tH = chartTooltip.height || 100;

                     // Check horizontal overlap with small margin
                     const overlapX = (tooltipX < tX + tW + 10) && (tooltipX + tooltipW + 10 > tX);
                     if (overlapX) {
                         // If there is horizontal overlap, shift vertically around standard tooltip
                         if (tooltipY + totalStackH / 2 < tY + tH / 2) {
                             tooltipY = tY - totalStackH - 10; // Shift above standard tooltip
                         } else {
                             tooltipY = tY + tH + 10; // Shift below standard tooltip
                         }

                         // Boundary clamping and safety
                         if (tooltipY < chartArea.top) {
                             tooltipY = tY + tH + 10; // Try placing below
                         }
                         if (tooltipY + totalStackH > chartArea.bottom) {
                             tooltipY = tY - totalStackH - 10; // Try placing above
                         }
                         if (tooltipY < chartArea.top) {
                             tooltipY = chartArea.top + 10;
                         }
                         if (tooltipY + totalStackH > chartArea.bottom) {
                             tooltipY = chartArea.bottom - totalStackH - 10;
                         }
                     }
                 }
                 
                 hoveredEvents.forEach((ev, idx) => {
                     const cardY = tooltipY + idx * (tooltipH + spacing);
                     
                     ctx.save();
                     
                     let colorHex = "#0072bc"; /* Metro Blue */
                     let typeText = "IT / Tech Migration";
                     if (ev.type === "operations") {
                         colorHex = "#58a738"; /* Metro Green */
                         typeText = "Operational Audit";
                     } else if (ev.type === "market") {
                         colorHex = "#e3131b"; /* Metro Red */
                         typeText = "Market Peak / Seasonality";
                     }
                     
                     // Draw rich smooth drop shadow
                     ctx.shadowColor = isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(148, 163, 184, 0.25)";
                     ctx.shadowBlur = 15;
                     ctx.shadowOffsetX = 0;
                     ctx.shadowOffsetY = 6;
                     
                     // Glass panel solid container base
                     ctx.fillStyle = isDark ? "#090a10" : "#ffffff";
                     ctx.strokeStyle = colorHex;
                     ctx.lineWidth = 2;
                     
                     ctx.beginPath();
                     if (ctx.roundRect) {
                         ctx.roundRect(tooltipX, cardY, tooltipW, tooltipH, 5);
                     } else {
                         ctx.rect(tooltipX, cardY, tooltipW, tooltipH);
                     }
                     ctx.fill();
                     ctx.stroke();
                     
                     // Disable shadow for text to keep it completely crisp
                     ctx.shadowColor = "transparent";
                     ctx.shadowBlur = 0;
                     ctx.shadowOffsetX = 0;
                     ctx.shadowOffsetY = 0;
                     
                     // Render Tooltip Text Contents
                     // 1. Tag type header
                     ctx.font = "800 8px Inter";
                     ctx.fillStyle = colorHex;
                     ctx.textBaseline = "top";
                     ctx.fillText(typeText.toUpperCase(), tooltipX + 14, cardY + 14);
                     
                     // 2. Event title
                     ctx.font = "bold 13px Outfit";
                     ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
                     ctx.fillText(ev.name, tooltipX + 14, cardY + 26);
                     
                     // 3. Date string
                     ctx.font = "500 9px Inter";
                     ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
                     ctx.fillText(`📅 ${ev.date}, ${APP_STATE.selectedYear}`, tooltipX + 14, cardY + 43);
                     
                     ctx.restore();
                 });
             }
        },
        
        afterEvent: (chart, args) => {
            const showEvents = document.getElementById("toggle-events-overlay") ? document.getElementById("toggle-events-overlay").checked : true;
            if (!showEvents || APP_STATE.eventsProgress < 1.0) {
                if (chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0)) {
                    chart.hoveredEvent = null;
                    chart.hoveredEvents = null;
                    chart.canvas.style.cursor = 'default';
                    chart.hoveredMousePos = null;
                    args.changed = true;
                }
                return;
            }
            
            const event = args.event;
            const { chartArea, scales } = chart;
            if (!chartArea) return;
            
            const scaleX = scales.x;
            const months = chart.data.labels;
            const currentDept = APP_STATE.selectedDepartment;
            
            // Capture mouse movements, mouseouts, and clicks on the chart
            if (event.type !== 'mousemove' && event.type !== 'mouseout' && event.type !== 'click') {
                return;
            }

            if (event.type === 'click') {
                const hoveredEvents = chart.hoveredEvents || (chart.hoveredEvent ? [chart.hoveredEvent] : []);
                if (hoveredEvents.length > 0) {
                    const ev = hoveredEvents[0];
                    const monthStr = ev.date.substring(0, 3);
                    const input = document.getElementById("chat-input");
                    if (input) {
                        input.value = `Explain the impact of the "${ev.name}" event in ${monthStr} ${APP_STATE.selectedYear}.`;
                        const sendBtn = document.getElementById("btn-send-chat");
                        if (sendBtn) {
                            sendBtn.disabled = false;
                            sendBtn.click();
                        }
                    }
                }
                return;
            }


            const mouseY = event.y;
            const isNearTop = mouseY < chartArea.top + 60;

            // Prioritize line graph data points over event overlays to avoid hover conflicts
            // EXCEPT when the user is hovering near the top where the event ribbon badges are.
            const activeElements = chart.getActiveElements();
            if (activeElements && activeElements.length > 0 && !isNearTop) {
                if (chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0)) {
                    chart.hoveredEvent = null;
                    chart.hoveredEvents = null;
                    chart.canvas.style.cursor = 'default';
                    chart.hoveredMousePos = null;
                    args.changed = true;
                }
                return;
            }
            
            if (event.type === 'mouseout') {
                if (chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0)) {
                    chart.hoveredEvent = null;
                    chart.hoveredEvents = null;
                    chart.canvas.style.cursor = 'default';
                    chart.hoveredMousePos = null;
                    args.changed = true;
                }
                return;
            }
            
            const mouseX = event.x;
            
            // Verify if cursor is vertically inside chart boundaries
            const inY = mouseY >= chartArea.top && mouseY <= chartArea.bottom;
            const matchingEvents = [];
            
            if (inY) {
                // Build a list of all events for this department
                const visibleEvents = [];
                GLOBAL_DATA.events.forEach(ev => {
                    if (currentDept !== "all" && ev.dept !== currentDept) {
                        return;
                    }
                    const monthStr = ev.date.substring(0, 3);
                    const monthIndex = months.indexOf(monthStr);
                    if (monthIndex !== -1) {
                        visibleEvents.push(ev);
                    }
                });

                // Measure text width using chart context
                ctx.save();
                ctx.font = "600 9px Outfit";

                // Find all events matching the mouse precise collision bounds
                visibleEvents.forEach((ev, visibleIndex) => {
                    const monthStr = ev.date.substring(0, 3);
                    const monthIndex = months.indexOf(monthStr);
                    
                    const daysPart = ev.date.substring(4);
                    let startDay = 1;
                    let endDay = 1;
                    if (daysPart.includes("-")) {
                        const parts = daysPart.split("-");
                        startDay = parseInt(parts[0], 10);
                        endDay = parseInt(parts[1], 10);
                    } else {
                        startDay = parseInt(daysPart, 10);
                        endDay = startDay;
                    }
                    
                    const daysInMonthMap = {
                        Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
                        Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
                    };
                    const totalDays = daysInMonthMap[monthStr] || 30;
                    
                    const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
                    const endVal = monthIndex - 0.5 + (endDay - 0.5) / totalDays;
                    
                    const startX = getAnimatedX(chart, startVal);
                    const endX = getAnimatedX(chart, endVal);
                    
                    // 1. Shaded area check for multi-day events
                    let isOverShaded = false;
                    if (startDay !== endDay) {
                        isOverShaded = mouseX >= startX && mouseX <= endX && mouseY >= chartArea.top && mouseY <= chartArea.bottom;
                    }
                    
                    // 2. Rotated badge area check (using mathematical rotation transform)
                    const textWidth = ctx.measureText(ev.name).width;
                    const yOffsetBase = 12 + (visibleIndex % 2) * 22;
                    const cx = startX + 11;
                    const cy = chartArea.top + yOffsetBase;
                    
                    const dx = mouseX - cx;
                    const dy = mouseY - cy;
                    
                    // Rotated coordinate boundaries:
                    // dy is along rotated X-axis, dx is along rotated -Y-axis
                    const isOverBadge = (dy >= -6 && dy <= textWidth + 6 && dx >= -4 && dx <= 8);
                    
                    // Only count as hovered when directly over the event name badge (not the shaded area)
                    if (isOverBadge) {
                        matchingEvents.push({ ev, visibleIndex });
                    }
                });
                ctx.restore();
            }

            const foundHoverList = matchingEvents.map(item => item.ev);
            const foundHover = foundHoverList.length > 0 ? foundHoverList[0] : null;

            // Note: Tooltip suppression is handled natively in the options.plugins.tooltip.filter callback
            // to avoid dynamic enabled-property lock-up issues.

            // Check if hovered events list changed
            let hasChanged = false;
            const prevHoveredEvents = chart.hoveredEvents || [];
            
            if (prevHoveredEvents.length !== foundHoverList.length) {
                hasChanged = true;
            } else {
                for (let i = 0; i < foundHoverList.length; i++) {
                    if (prevHoveredEvents[i] !== foundHoverList[i]) {
                        hasChanged = true;
                        break;
                    }
                }
            }

            if (hasChanged) {
                chart.hoveredEvents = foundHoverList;
                chart.hoveredEvent = foundHover; // Compatibility sync
                chart.canvas.style.cursor = foundHoverList.length > 0 ? 'pointer' : 'default';
                chart.hoveredMousePos = foundHoverList.length > 0 ? { x: mouseX, y: mouseY } : null;
                args.changed = true;
            } else if (foundHoverList.length > 0) {
                // Keep cursor position synced to let tooltip track the mouse
                chart.hoveredMousePos = { x: mouseX, y: mouseY };
                args.changed = true;
            }
        }
    };

    const config = {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Vacancy Rate (%)',
                    data: vacancyData,
                    borderColor: '#0072bc', /* Metro Blue (A Line) */
                    backgroundColor: 'rgba(0, 114, 188, 0.05)',
                    borderWidth: 3,
                    pointBackgroundColor: '#0072bc',
                    pointBorderColor: isDark ? '#07080d' : '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: ctx => {
                        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                        if (xVal !== null && xVal % 1 !== 0) return 0;
                        return (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) ? 4 : 6;
                    },
                    pointHoverRadius: ctx => {
                        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                        if (xVal !== null && xVal % 1 !== 0) return 0;
                        return (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) ? 6 : 8;
                    },
                    tension: 0.35,
                    fill: true,
                    hidden: !(document.getElementById("toggle-vacancies") ? document.getElementById("toggle-vacancies").checked : true) && APP_STATE.vacancyProgress === 0.0,
                    segment: {
                        borderDash: ctx => (APP_STATE.selectedYear === 2026 && ctx.p0 && ctx.p0.parsed && ctx.p0.parsed.x >= 5.5) ? [5, 5] : undefined
                    }
                },
                {
                    label: 'Overtime Hours (%)',
                    data: hoursData,
                    borderColor: '#a05da5', /* Metro Purple (D Line) */
                    backgroundColor: 'rgba(160, 93, 165, 0.05)',
                    borderWidth: 3,
                    pointBackgroundColor: '#a05da5',
                    pointBorderColor: isDark ? '#07080d' : '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: ctx => {
                        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                        if (xVal !== null && xVal % 1 !== 0) return 0;
                        return (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) ? 4 : 6;
                    },
                    pointHoverRadius: ctx => {
                        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                        if (xVal !== null && xVal % 1 !== 0) return 0;
                        return (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) ? 6 : 8;
                    },
                    tension: 0.35,
                    fill: true,
                    hidden: !(document.getElementById("toggle-ot-hours") ? document.getElementById("toggle-ot-hours").checked : true) && APP_STATE.hoursProgress === 0.0,
                    segment: {
                        borderDash: ctx => (APP_STATE.selectedYear === 2026 && ctx.p0 && ctx.p0.parsed && ctx.p0.parsed.x >= 5.5) ? [5, 5] : undefined
                    }
                },
                {
                    label: 'Overtime Pay (%)',
                    data: payData,
                    borderColor: '#f7b618', /* Metro Gold (E Line) */
                    backgroundColor: 'rgba(247, 182, 24, 0.05)',
                    borderWidth: 3,
                    pointBackgroundColor: '#f7b618',
                    pointBorderColor: isDark ? '#07080d' : '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: ctx => {
                        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                        if (xVal !== null && xVal % 1 !== 0) return 0;
                        return (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) ? 4 : 6;
                    },
                    pointHoverRadius: ctx => {
                        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
                        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
                        if (xVal !== null && xVal % 1 !== 0) return 0;
                        return (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) ? 6 : 8;
                    },
                    tension: 0.35,
                    fill: true,
                    hidden: !(document.getElementById("toggle-trendline") ? document.getElementById("toggle-trendline").checked : true) && APP_STATE.payProgress === 0.0,
                    segment: {
                        borderDash: ctx => (APP_STATE.selectedYear === 2026 && ctx.p0 && ctx.p0.parsed && ctx.p0.parsed.x >= 5.5) ? [5, 5] : undefined
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                autoPadding: false,
                padding: {
                    top: 15,
                    bottom: 15,
                    left: 10,
                    right: 15
                }
            },
            animation: {
                duration: 300,
                easing: 'easeOutCubic'
            },
            plugins: {
                legend: {
                    display: false // We use custom header legend and toggles
                },
                tooltip: {
                    backgroundColor: isDark ? '#12131a' : '#ffffff',
                    titleColor: isDark ? '#f8fafc' : '#0f172a',
                    bodyColor: isDark ? '#94a3b8' : '#475569',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 5,
                    font: {
                        family: 'Inter'
                    },
                    filter: function(tooltipItem) {
                        const rawPoint = tooltipItem.dataset.data[tooltipItem.dataIndex];
                        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (tooltipItem.parsed ? tooltipItem.parsed.x : null);
                        return xVal !== null && xVal !== undefined && xVal % 1 === 0;
                    },
                    callbacks: {
                        title: function(contexts) {
                            if (contexts.length === 0) return "";
                            const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            const rawPoint = contexts[0].dataset && contexts[0].dataset.data ? contexts[0].dataset.data[contexts[0].dataIndex] : null;
                            const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (contexts[0].parsed ? contexts[0].parsed.x : null);
                            const clampedIndex = Math.max(0, Math.min(11, Math.round(xVal)));
                            return monthsList[clampedIndex] || "";
                        },
                        label: function(context) {
                            const val = typeof context.raw === 'object' && context.raw !== null ? context.raw.y : context.raw;
                            let suffix = "";
                            const rawPoint = context.dataset && context.dataset.data ? context.dataset.data[context.dataIndex] : null;
                            const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (context.parsed ? context.parsed.x : null);
                            if (APP_STATE.selectedYear === 2026 && xVal !== null && xVal > 5.1) {
                                suffix = " (Predicted)";
                            }
                            return ` ${context.dataset.label}: ${val}%${suffix}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    grid: { display: false },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Outfit', size: 11, weight: 600 },
                        callback: function(value) {
                            const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            return monthsList[value] || "";
                        }
                    },
                    afterBuildTicks: (axis) => {
                        const min = Math.ceil(axis.min);
                        const max = Math.floor(axis.max);
                        const ticks = [];
                        for (let i = min; i <= max; i++) {
                            ticks.push({ value: i });
                        }
                        axis.ticks = ticks;
                    },
                    min: slice.start - 0.5,
                    max: slice.end - 0.5
                },
                y: {
                    minWidth: 60,
                    maxWidth: 60,
                    grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)' },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#475569',
                        font: { family: 'Outfit', size: 11, weight: 600 },
                        callback: value => Math.round(value) + '%',
                        stepSize: 1,
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        color: isDark ? '#94a3b8' : '#475569',
                        font: { family: 'Outfit', size: 10, weight: 700 }
                    }
                }
            }
        },
        plugins: [eventOverlayPlugin]
    };

    // Calculate initial Y-range to prevent initial visual jump on loading
    const initialYRange = calculateYRangeForXRange({ data: { datasets: config.data.datasets } }, slice.start - 0.5, slice.end - 0.5);
    config.options.scales.y.min = initialYRange.min;
    config.options.scales.y.max = initialYRange.max;

    APP_STATE.charts.trend = new Chart(ctx, config);
    APP_STATE.charts.trend.lastSelectedYear = APP_STATE.selectedYear;
    
    // Render the active interactive event chips below the chart
    renderActiveEventsList();
}

// Render Doughnut Chart (Drivers Analysis)
function renderDriversChart() {
    const ctx = document.getElementById("driversChart").getContext("2d");
    const dept = APP_STATE.selectedDepartment;
    const rawDrivers = GLOBAL_DATA.departments[dept].drivers;
    const isDark = document.body.classList.contains("dark-theme");

    // Maintain a fixed-index design to enable smooth, natural animations in Chart.js
    const allKeys = ["understaffing", "outages", "seasonality", "backlog", "others"];
    const labels = [];
    const values = [];
    const colors = [];
    let sumSelected = 0;

    const driverMetadata = {
        understaffing: { label: "Understaffing", color: "#a05da5" }, /* Metro Purple */
        outages: { label: "System Outages", color: "#0072bc" },       /* Metro Blue */
        seasonality: { label: "Seasonal Peaks", color: "#e3131b" },   /* Metro Red */
        backlog: { label: "Backlog Clearance", color: "#f7b618" },   /* Metro Gold */
        others: { label: "Other Events", color: "#64748b" }
    };

    allKeys.forEach(key => {
        if (rawDrivers[key] !== undefined) {
            labels.push(driverMetadata[key].label);
            const isEnabled = APP_STATE.enabledDrivers.includes(key);
            const val = isEnabled ? rawDrivers[key] : 0;
            values.push(val);
            colors.push(driverMetadata[key].color);
            if (isEnabled) {
                sumSelected += rawDrivers[key];
            }
        }
    });

    // Update sidebar checkbox labels dynamically with updated relative percentages
    const driverCheckboxes = document.querySelectorAll(".driver-checkbox");
    driverCheckboxes.forEach(cb => {
        const key = cb.value;
        const parentLabel = cb.closest("label");
        const textSpan = parentLabel ? parentLabel.querySelector(".checkbox-text") : null;
        if (textSpan) {
            const baseName = driverMetadata[key] ? driverMetadata[key].label : key;
            if (cb.checked) {
                const pct = sumSelected > 0 ? Math.round((rawDrivers[key] / sumSelected) * 100) : 0;
                textSpan.textContent = `${baseName} (${pct}%)`;
            } else {
                textSpan.textContent = baseName;
            }
        }
    });

    if (APP_STATE.charts.drivers) {
        const chart = APP_STATE.charts.drivers;
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
        chart.data.datasets[0].backgroundColor = colors;
        chart.data.datasets[0].borderColor = isDark ? '#07080d' : '#ffffff';
        
        // Update Theme-specific options
        chart.options.plugins.tooltip.backgroundColor = isDark ? '#12131a' : '#ffffff';
        chart.options.plugins.tooltip.titleColor = isDark ? '#f8fafc' : '#0f172a';
        chart.options.plugins.tooltip.bodyColor = isDark ? '#94a3b8' : '#475569';
        chart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        
        chart.update();
        return;
    }

    // Custom center text plugin for Chart.js - completely dynamic to support in-place updates smoothly
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: (chart) => {
            const { width, height, ctx } = chart;
            ctx.restore();
            
            const isDarkCurrent = document.body.classList.contains("dark-theme");
            const sum = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            
            // Draw Main Total Value
            ctx.font = "bold 20px Outfit";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isDarkCurrent ? "#f8fafc" : "#0f172a";
            const valText = sum + "h";
            const valX = Math.round((width - ctx.measureText(valText).width) / 2);
            
            // Draw Subtext label
            ctx.font = "600 9px Outfit";
            ctx.fillStyle = isDarkCurrent ? "#64748b" : "#475569";
            const lblText = "TOTAL OVERTIME";
            const lblX = Math.round((width - ctx.measureText(lblText).width) / 2);
            
            ctx.fillText(valText, valX, (height / 2) - 5);
            ctx.fillText(lblText, lblX, (height / 2) + 14);
            ctx.save();
        }
    };

    const config = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: isDark ? '#07080d' : '#ffffff',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            onClick: (e, activeElements) => {
                if (activeElements && activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const chart = APP_STATE.charts.drivers;
                    if (chart && chart.data && chart.data.labels) {
                        const label = chart.data.labels[index];
                        if (label) {
                            const input = document.getElementById("chat-input");
                            if (input) {
                                input.value = `Explain the impact of ${label.toLowerCase()}.`;
                                const sendBtn = document.getElementById("btn-send-chat");
                                if (sendBtn) {
                                    sendBtn.disabled = false;
                                    sendBtn.click();
                                }
                            }
                        }
                    }
                }
            },
            onHover: (event, activeElements) => {
                if (event && event.native && event.native.target) {
                    event.native.target.style.cursor = (activeElements && activeElements.length > 0) ? 'pointer' : 'default';
                }
            },
            animation: {
                duration: 300,
                easing: 'easeOutCubic'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#12131a' : '#ffffff',
                    titleColor: isDark ? '#f8fafc' : '#0f172a',
                    bodyColor: isDark ? '#94a3b8' : '#475569',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    cornerRadius: 5,
                    callbacks: {
                        label: function(context) {
                            let val = context.raw || 0;
                            const chart = APP_STATE.charts.drivers;
                            let total = (chart && chart.data && chart.data.datasets[0]) ? chart.data.datasets[0].data.reduce((a, b) => a + b, 0) : 0;
                            let pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${val}h (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [centerTextPlugin]
    };

    APP_STATE.charts.drivers = new Chart(ctx, config);
}

// Render Event Impact Chart (Bar representation)
function renderEventsChart() {
    const canvas = document.getElementById("eventsChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const isDark = document.body.classList.contains("dark-theme");
    
    // Filter events based on selected category dropdown
    const type = APP_STATE.selectedEventType;
    const filteredEvents = GLOBAL_DATA.events.filter(ev => {
        const matchesCategory = type === "all" || ev.type === type;
        if (!matchesCategory) return false;
        return !isUpcomingEvent(ev);
    });

    const labels = filteredEvents.map(ev => ev.name);
    const dataHours = filteredEvents.map(ev => ev.hours);
    const borderColors = filteredEvents.map(ev => {
        if(ev.type === "it") return "#0072bc"; /* Metro Blue */
        if(ev.type === "operations") return "#58a738"; /* Metro Green */
        return "#e3131b"; /* Metro Red */
    });
    const bgColors = borderColors.map(col => col + "25"); // 15% opacity

    if (APP_STATE.charts.events) {
        const chart = APP_STATE.charts.events;
        chart.filteredEvents = filteredEvents; // Update stored filtered events
        chart.data.labels = labels;
        chart.data.datasets[0].data = dataHours;
        chart.data.datasets[0].backgroundColor = bgColors;
        chart.data.datasets[0].borderColor = borderColors;
        
        // Update theme-specific options
        chart.options.plugins.tooltip.backgroundColor = isDark ? '#12131a' : '#ffffff';
        chart.options.plugins.tooltip.titleColor = isDark ? '#f8fafc' : '#0f172a';
        chart.options.plugins.tooltip.bodyColor = isDark ? '#94a3b8' : '#475569';
        chart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        
        chart.options.scales.x.grid.color = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)';
        chart.options.scales.y.ticks.color = isDark ? '#94a3b8' : '#475569';
        
        chart.update();
        return;
    }

    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Overtime Generated',
                data: dataHours,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1.5,
                borderRadius: 5,
                barPercentage: 0.45,
                categoryPercentage: 0.65,
                maxBarThickness: 16
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bars
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, activeElements) => {
                if (activeElements && activeElements.length > 0) {
                    const index = activeElements[0].index;
                    const chart = APP_STATE.charts.events;
                    const ev = (chart && chart.filteredEvents) ? chart.filteredEvents[index] : null;
                    if (ev) {
                        const monthStr = ev.date.substring(0, 3);
                        const input = document.getElementById("chat-input");
                        if (input) {
                            input.value = `Explain the impact of the "${ev.name}" event in ${monthStr} ${APP_STATE.selectedYear}.`;
                            const sendBtn = document.getElementById("btn-send-chat");
                            if (sendBtn) {
                                sendBtn.disabled = false;
                                sendBtn.click();
                            }
                        }
                    }
                }
            },

            animation: {
                duration: 300,
                easing: 'easeOutCubic'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#12131a' : '#ffffff',
                    titleColor: isDark ? '#f8fafc' : '#0f172a',
                    bodyColor: isDark ? '#94a3b8' : '#475569',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    borderWidth: 1,
                    cornerRadius: 5,
                    callbacks: {
                        label: function(context) {
                            return ` Click to explain impact`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.05)' },
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Outfit', size: 10, weight: 600 }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#475569',
                        font: { family: 'Outfit', size: 10, weight: 500 },
                        // Shorten labels if too long - safely lookup labels via chart instance
                        callback: function(val, index) {
                            const chart = APP_STATE.charts.events;
                            const lbl = (chart && chart.data && chart.data.labels) ? (chart.data.labels[index] || "") : "";
                            return lbl.length > 18 ? lbl.substring(0, 15) + "..." : lbl;
                        }
                    }
                }
            }
        }
    };

    APP_STATE.charts.events = new Chart(ctx, config);
    APP_STATE.charts.events.filteredEvents = filteredEvents;
}

// Populates custom color indicator legends dynamically below Event Chart
function renderEventLegend() {
    const container = document.getElementById("event-legend-container");
    container.innerHTML = ""; // Clear existing

    const legendMeta = [
        { label: "IT / Tech Migrations", color: "#0072bc" }, /* Metro Blue */
        { label: "Operational Audits", color: "#58a738" },  /* Metro Green */
        { label: "Market Demand Peak", color: "#e3131b" }   /* Metro Red */
    ];

    legendMeta.forEach(meta => {
        const el = document.createElement("div");
        el.className = "event-legend-badge";
        el.innerHTML = `
            <span class="event-legend-dot" style="background-color: ${meta.color}"></span>
            <span>${meta.label}</span>
        `;
        container.appendChild(el);
    });
}

// ----------------------------------------------------
// 5. INTERACTIVE TABLE COMPONENT
// ----------------------------------------------------

function renderLogsTable() {
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = ""; // Clear

    // Filter logic
    let filteredLogs = GLOBAL_DATA.logs;

    // Timeframe filter
    const slice = getTimeframeSlice(APP_STATE.selectedTimeframe);
    filteredLogs = filteredLogs.filter(log => {
        if (!log.date) return false;
        const parts = log.date.split("-");
        if (parts.length !== 3) return false;
        const monthIndex = parseInt(parts[1], 10) - 1;
        return monthIndex >= slice.start && monthIndex < slice.end;
    });

    // Department filter
    if (APP_STATE.selectedDepartment !== "all") {
        const deptMap = {
            logistics: "Logistics",
            cs: "Customer Support",
            engineering: "Software Engineering",
            finance: "Finance & Billing"
        };
        const targetText = deptMap[APP_STATE.selectedDepartment];
        filteredLogs = filteredLogs.filter(log => log.department === targetText);
    }

    // Search query filter
    if (APP_STATE.tableSearchQuery.trim() !== "") {
        const query = APP_STATE.tableSearchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter(log => {
            return log.employee.toLowerCase().includes(query) || 
                   log.cause.toLowerCase().includes(query) ||
                   log.department.toLowerCase().includes(query);
        });
    }

    // Sort logic
    const field = APP_STATE.tableSortField;
    const order = APP_STATE.tableSortOrder === "asc" ? 1 : -1;

    filteredLogs.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];

        if (typeof valA === 'string') {
            return valA.localeCompare(valB) * order;
        } else {
            return (valA - valB) * order;
        }
    });

    // Pagination logic
    const totalLogsCount = filteredLogs.length;
    const totalPages = Math.ceil(totalLogsCount / APP_STATE.tableRowsPerPage) || 1;
    
    // Bound page
    if (APP_STATE.tableCurrentPage > totalPages) {
        APP_STATE.tableCurrentPage = totalPages;
    }

    const startIndex = (APP_STATE.tableCurrentPage - 1) * APP_STATE.tableRowsPerPage;
    const endIndex = Math.min(startIndex + APP_STATE.tableRowsPerPage, totalLogsCount);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    // Update sort icons in table headers
    const headers = document.querySelectorAll("#ot-logs-table th[data-sort]");
    headers.forEach(th => {
        const field = th.dataset.sort;
        const icon = th.querySelector(".sort-icon");
        if (icon) {
            const newIcon = document.createElement("i");
            newIcon.className = "sort-icon";
            if (APP_STATE.tableSortField === field) {
                if (APP_STATE.tableSortOrder === "asc") {
                    newIcon.setAttribute("data-lucide", "chevron-up");
                } else {
                    newIcon.setAttribute("data-lucide", "chevron-down");
                }
            } else {
                newIcon.setAttribute("data-lucide", "chevrons-up-down");
            }
            icon.parentNode.replaceChild(newIcon, icon);
        }
    });

    // Populate rows
    if (paginatedLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px 0;">
                    <i data-lucide="info" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>
                    No overtime records found matching filters.
                </td>
            </tr>
        `;
        document.getElementById("table-showing-info").innerText = `Showing 0 of 0 logs`;
        document.getElementById("page-indicator").innerText = `Page 1 of 1`;
        document.getElementById("pag-prev").disabled = true;
        document.getElementById("pag-next").disabled = true;
        lucide.createIcons();
        return;
    }

    paginatedLogs.forEach(log => {
        const row = document.createElement("tr");
        
        const statusClass = log.status.toLowerCase();

        // Format Date from YYYY-MM-DD to MM/DD/YYYY at rendering boundary
        let displayDate = log.date;
        if (log.date && log.date.includes("-")) {
            const parts = log.date.split("-");
            if (parts.length === 3) {
                displayDate = `${parts[1]}/${parts[2]}/${parts[0]}`;
            }
        }

        row.innerHTML = `
            <td>
                <div class="emp-cell">
                    <span class="emp-name">${log.employee}</span>
                </div>
            </td>
            <td><span class="td-dept">${log.department}</span></td>
            <td><span class="td-date">${displayDate}</span></td>
            <td class="num-align"><span class="td-hours">${log.hours} hrs</span></td>
            <td><span class="td-cause">${log.cause}</span></td>
            <td class="num-align"><span class="td-cost">$${log.cost.toLocaleString()}</span></td>
            <td><span class="badge-status ${statusClass}">${log.status}</span></td>
        `;
        tbody.appendChild(row);
    });

    // Update Pagination indicators
    document.getElementById("table-showing-info").innerText = `Showing ${startIndex + 1}-${endIndex} of ${totalLogsCount} logs`;
    document.getElementById("page-indicator").innerText = `Page ${APP_STATE.tableCurrentPage} of ${totalPages}`;
    
    document.getElementById("pag-prev").disabled = APP_STATE.tableCurrentPage === 1;
    document.getElementById("pag-next").disabled = APP_STATE.tableCurrentPage === totalPages;

    lucide.createIcons();
}

// ----------------------------------------------------
// 6. EVENT BINDING & HANDLERS
// ----------------------------------------------------

function initEventListeners() {
    // 1. Department Selector Dropdown
    const deptSelect = document.getElementById("dept-select");
    deptSelect.addEventListener("change", (e) => {
        APP_STATE.selectedDepartment = e.target.value;
        APP_STATE.tableCurrentPage = 1; // reset page
        
        // Dynamic animation/refresh
        updateKPIs();
        renderTrendChart();
        renderDriversChart();
        renderLogsTable();
    });

    // 1b. Year Selector Dropdown
    const yearSelect = document.getElementById("year-select");
    if (yearSelect) {
        yearSelect.addEventListener("change", (e) => {
            setYear(e.target.value);
        });
    }

    // 2. Trend Inline Checkbox Toggles (except predictions and metrics/events that animate)
    const toggles = [];
    toggles.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", () => {
                renderTrendChart();
            });
        }
    });

    const eventsToggle = document.getElementById("toggle-events-overlay");
    if (eventsToggle) {
        eventsToggle.addEventListener("change", (e) => {
            animateEvents(e.target.checked);
        });
    }

    const metricToggles = [
        { id: "toggle-vacancies", key: "vacancy" },
        { id: "toggle-ot-hours", key: "hours" },
        { id: "toggle-trendline", key: "pay" }
    ];
    metricToggles.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", (e) => {
                animateLine(key, e.target.checked);
            });
        }
    });

    // 2b. Predictions Specific Toggle with Animations
    const predToggle = document.getElementById("toggle-predictions");
    if (predToggle) {
        predToggle.addEventListener("change", (e) => {
            if (APP_STATE.selectedYear === 2026) {
                animatePredictions(e.target.checked);
            } else {
                renderTrendChart();
            }
        });
    }

    // 3. Driver Toggles near Doughnut
    const driverCheckboxes = document.querySelectorAll(".driver-checkbox");
    driverCheckboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            // Recompute enabled drivers
            const enabled = [];
            driverCheckboxes.forEach(item => {
                if (item.checked) {
                    enabled.push(item.value);
                }
            });
            APP_STATE.enabledDrivers = enabled;
            renderDriversChart();
        });
    });

    // 5. Dynamic timeframe selection is handled directly inside updateTimeframeSelector()

    // 6. Sync Header Button Animation Mock
    document.getElementById("btn-sync-data").addEventListener("click", (e) => {
        const syncBtn = document.getElementById("btn-sync-data");
        const icon = syncBtn.querySelector("i, svg");
        syncBtn.disabled = true;
        if (icon) {
            icon.style.animation = "spin 1s infinite linear";
        }
        syncBtn.querySelector("span").innerText = "Syncing...";
        
        setTimeout(() => {
            syncBtn.disabled = false;
            if (icon) {
                icon.style.animation = "";
            }
            syncBtn.querySelector("span").innerText = "Synced";
            updateKPIs();
            renderLogsTable();
            setTimeout(() => {
                syncBtn.querySelector("span").innerText = "Sync";
            }, 1500);
        }, 1200);
    });

    // 7. Table Searching
    const searchInput = document.getElementById("table-search-input");
    searchInput.addEventListener("input", (e) => {
        APP_STATE.tableSearchQuery = e.target.value;
        APP_STATE.tableCurrentPage = 1;
        renderLogsTable();
    });

    // 8. Table Export CSV Mock
    document.getElementById("btn-export-csv").addEventListener("click", () => {
        const headers = ["Employee", "Department", "Date", "OT Hours", "Cause", "Cost", "Status"];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
        
        GLOBAL_DATA.logs.forEach(log => {
            const row = [
                `"${log.employee}"`,
                `"${log.department}"`,
                `"${log.date}"`,
                log.hours,
                `"${log.cause}"`,
                log.cost,
                `"${log.status}"`
            ];
            csvContent += row.join(",") + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `overtime_export_${APP_STATE.selectedDepartment}_${APP_STATE.selectedTimeframe}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 9. Table Column Headers Sorting
    const thElements = document.querySelectorAll("#ot-logs-table th[data-sort]");
    thElements.forEach(th => {
        th.addEventListener("click", () => {
            const field = th.dataset.sort;
            if (APP_STATE.tableSortField === field) {
                APP_STATE.tableSortOrder = APP_STATE.tableSortOrder === "asc" ? "desc" : "asc";
            } else {
                APP_STATE.tableSortField = field;
                APP_STATE.tableSortOrder = "desc"; // Default desc
            }
            
            // Re-render
            renderLogsTable();
        });
    });

    // 10. Table Pagination Buttons
    document.getElementById("pag-prev").addEventListener("click", () => {
        if (APP_STATE.tableCurrentPage > 1) {
            APP_STATE.tableCurrentPage--;
            renderLogsTable();
        }
    });

    document.getElementById("pag-next").addEventListener("click", () => {
        APP_STATE.tableCurrentPage++;
        renderLogsTable();
    });

    // 11. Theme Toggle Button
    const themeToggleBtn = document.getElementById("btn-theme-toggle");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const isDark = document.body.classList.toggle("dark-theme");
            const themeToggleIcon = document.getElementById("theme-toggle-icon");
            if (isDark) {
                themeToggleIcon.setAttribute("data-lucide", "sun");
                themeToggleBtn.setAttribute("title", "Switch to Light Mode");
            } else {
                themeToggleIcon.setAttribute("data-lucide", "moon");
                themeToggleBtn.setAttribute("title", "Switch to Dark Mode");
            }
            lucide.createIcons();
            
            // Re-render charts with correct theme-specific options
            renderTrendChart();
            renderDriversChart();
            renderEventsChart();
        });
    }

    // 12. Prevent trackpad diagonal vertical scrolling on table wrapper
    const tableWrapper = document.querySelector(".table-wrapper");
    if (tableWrapper) {
        tableWrapper.addEventListener("wheel", (e) => {
            // If we are scrolling horizontally, handle manual horizontal scroll and prevent default behavior (bubbling vertical scroll to parent)
            if (Math.abs(e.deltaX) > 0) {
                tableWrapper.scrollLeft += e.deltaX;
                e.preventDefault();
            }
        }, { passive: false });
    }

    // 13. Responsive Panel Reordering (Tablet/Mobile Chat Insertion)
    const layoutQuery = window.matchMedia("(max-width: 1150px)");
    const handleResponsiveLayout = (e) => {
        const mainLayout = document.querySelector(".main-layout");
        const leftPanel = document.querySelector(".left-panel");
        const rightPanel = document.querySelector(".right-panel");
        const metricsGrid = document.querySelector(".metrics-grid");

        if (!mainLayout || !leftPanel || !rightPanel || !metricsGrid) return;

        if (e.matches) {
            // Move right-panel (chatbot) inside left-panel, right after metrics-grid
            if (rightPanel.parentNode !== leftPanel) {
                leftPanel.insertBefore(rightPanel, metricsGrid.nextSibling);
            }
        } else {
            // Move right-panel (chatbot) back to main-layout as second child
            if (rightPanel.parentNode !== mainLayout) {
                mainLayout.appendChild(rightPanel);
            }
        }
    };

    // Run on initial load and register listener
    handleResponsiveLayout(layoutQuery);
    if (layoutQuery.addEventListener) {
        layoutQuery.addEventListener("change", handleResponsiveLayout);
    } else {
        layoutQuery.addListener(handleResponsiveLayout);
    }
}

// ----------------------------------------------------
// 7. PUBLIC INTERFACES FOR EXTERNAL MANIPULATION (chat.js)
// ----------------------------------------------------
window.OvertimeDashboard = {
    // Allows external Chat script to trigger department selection as if user clicked it
    setDepartment: (deptVal) => {
        const select = document.getElementById("dept-select");
        if (select) {
            select.value = deptVal;
            // Trigger change event programmatically
            select.dispatchEvent(new Event('change'));
        }
    },
    // Allows programmatic year selection
    setYear: (yearVal) => {
        const select = document.getElementById("year-select");
        if (select) {
            select.value = yearVal;
            select.dispatchEvent(new Event('change'));
        }
    },
    // Allows external Chat script to set specific driver exclusions
    toggleDriver: (driverKey, state) => {
        const driverCheckboxes = document.querySelectorAll(".driver-checkbox");
        driverCheckboxes.forEach(cb => {
            if (cb.value === driverKey) {
                cb.checked = state;
                cb.dispatchEvent(new Event('change'));
            }
        });
    },
    // Triggers search filter on table
    searchTable: (query) => {
        const searchInput = document.getElementById("table-search-input");
        if (searchInput) {
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input'));
        }
    },
    // Retrieve currently calculated KPIs
    getKPIs: () => {
        const dept = APP_STATE.selectedDepartment;
        return {
            deptName: dept.toUpperCase(),
            totalHours: document.getElementById("kpi-hours-val").innerText,
            vacancyCount: document.getElementById("kpi-vacancies-val").innerText,
            estCost: document.getElementById("kpi-cost-val").innerText,
            driver: document.getElementById("kpi-primary-driver-val").innerText
        };
    }
};

// Generates, styles, and binds mouse interactions to horizontal active event badges below the trend chart
function renderActiveEventsList() {
    const container = document.getElementById("active-events-list-container");
    if (!container) return;

    const chart = APP_STATE.charts.trend;
    if (!chart) {
        container.style.display = "none";
        return;
    }

    const currentDept = APP_STATE.selectedDepartment;
    const months = chart.data.labels;

    const slice = getTimeframeSlice(APP_STATE.selectedTimeframe);

    // Filter events to match currently visible chart dimensions
    const activeEvents = GLOBAL_DATA.events.filter(ev => {
        if (currentDept !== "all" && ev.dept !== currentDept) {
            return false;
        }
        const monthStr = ev.date.substring(0, 3);
        const monthIndex = months.indexOf(monthStr);
        return monthIndex >= slice.start && monthIndex < slice.end;
    });

    // Sort active events chronologically (by month and start day)
    const monthOrder = { "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12 };
    activeEvents.sort((a, b) => {
        const monthA = monthOrder[a.date.substring(0, 3)] || 0;
        const monthB = monthOrder[b.date.substring(0, 3)] || 0;
        if (monthA !== monthB) {
            return monthA - monthB;
        }
        const dayA = parseInt(a.date.substring(4), 10) || 0;
        const dayB = parseInt(b.date.substring(4), 10) || 0;
        return dayA - dayB;
    });

    const isOverlayEnabled = document.getElementById("toggle-events-overlay") ? document.getElementById("toggle-events-overlay").checked : true;

    if (activeEvents.length === 0) {
        container.classList.add("collapsed");
        container.innerHTML = "";
        return;
    }

    container.style.display = "flex";

    if (!isOverlayEnabled) {
        container.classList.add("collapsed");
    } else {
        container.classList.remove("collapsed");
    }

    container.innerHTML = `
        <span class="active-events-title">Active Events in Selected Period (Hover to Locate):</span>
    `;

    activeEvents.forEach(ev => {
        const chip = document.createElement("button");
        chip.className = `active-event-chip event-${ev.type}`;
        const monthStr = ev.date.substring(0, 3);
        
        chip.innerHTML = `
            <span class="event-chip-dot"></span>
            <span>${ev.name} (${ev.date})</span>
        `;

        // Register interactive hover mechanics
        chip.addEventListener("mouseenter", () => {
            const scaleX = chart.scales.x;
            const monthIndex = months.indexOf(monthStr);

            if (monthIndex === -1) return;

            const daysPart = ev.date.substring(4);
            let startDay = 1;
            let endDay = 1;
            if (daysPart.includes("-")) {
                const parts = daysPart.split("-");
                startDay = parseInt(parts[0], 10);
                endDay = parseInt(parts[1], 10);
            } else {
                startDay = parseInt(daysPart, 10);
                endDay = startDay;
            }

            const daysInMonthMap = {
                Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
                Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
            };
            const totalDays = daysInMonthMap[monthStr] || 30;

            const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
            const endVal = monthIndex - 0.5 + (endDay - 0.5) / totalDays;

            const startX = Math.round(scaleX.getPixelForValue(startVal));
            const endX = Math.round(scaleX.getPixelForValue(endVal));
            const eventX = Math.round(startDay === endDay ? startX : (startX + endX) / 2);

            // Apply hover states programmatically to the Chart canvas
            chart.hoveredEvent = ev;
            chart.hoveredMousePos = { x: eventX, y: chart.chartArea.top + 70 };
            // Suppressed via filter callback

            chart.update('none'); // Silent update without jarred animations
        });

        chip.addEventListener("mouseleave", () => {
            chart.hoveredEvent = null;
            chart.hoveredMousePos = null;
            // Restored via filter callback

            chart.update('none');
        });

        // Trigger automated chat analysis on chip click!
        chip.addEventListener("click", () => {
            const input = document.getElementById("chat-input");
            if (input) {
                input.value = `Explain the impact of the "${ev.name}" event in ${monthStr} ${APP_STATE.selectedYear}.`;
                const sendBtn = document.getElementById("btn-send-chat");
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.click();
                }
            }
        });

        container.appendChild(chip);
    });
}

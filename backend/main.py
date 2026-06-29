import os
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google.cloud import bigquery
import copy
import math
import hashlib

app = FastAPI(title="Overtime Analysis Agent API")

bq_client = bigquery.Client()

# Enable CORS to allow direct requests if someone goes direct, though we use Vite proxy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# 1. BASE DATA DEFINITIONS (YTD 2026 Baseline)
# ----------------------------------------------------

DEPARTMENTS_LIST = [
    "CONGESTION REDUCTION",
    "EXECUTIVE OFFICE, SHARED MOBILITY",
    "DPS CARE-BASED SERVICE DEPARTMENT",
    "SYSTEM SECURITY DEPARTMENT",
    "EMERGENCY SECURITY OPERATIONS CENTER",
    "OFFICE THE CHIEF OF POLICE",
    "EXECUTIVE OFFICE, ADMINISTRATION AND DEVELOPMENT",
    "VEHICLE ENGINEERING & ACQUISITION",
    "CHIEF OPERATIONS OFFICE",
    "VEHICLE MAINTENANCE AND ENGINEERING",
    "SERVICE DEVELOPMENT & SCHEDULING",
    "WORKFORCE MANAGEMENT",
    "INFORMATION TECHNOLOGY SERVICES",
    "BUS TRANSIT OPERATIONS",
    "CENTRAL OPERATIONS, TRANSIT SERVICE DELIVERY",
    "EXECUTIVE DIRECTOR, BUS MAINTENANCE",
    "FACILITIES CONTRACTED MAINTENANCE & OPS CONTRACTS",
    "FACILITIES",
    "MOTORIST SERVICES & REGIONAL SHARED MOBILITY PRGMS",
    "OPERATIONS STRATEGIC INITIATIVE",
    "BUS DIVISION MAINTENANCE",
    "CONTRACT SERVICES",
    "MICROTRANSIT OPERATIONS",
    "EXECUTIVE DIRECTOR, MAINTENANCE AND ENGINEERING",
    "RAIL MAINTENANCE OF WAY & MOW ENGINEERING",
    "EXECUTIVE DIRECTOR, RAIL MAINTENANCE",
    "RAIL FLEET SERVICES MAINTENANCE",
    "EXECUTIVE OFFICE, TRANSIT SERVICE DELIVERY",
    "RAIL TRANSIT OPERATIONS",
    "ITS/SPEED & RELIABILITY GROUP"
]

EMPLOYEE_NAMES = [
    "Marcus Vance", "Siddharth Nair", "Elena Rostova", "Arthur Pendelton", "Clarissa Zhang",
    "David Miller", "Sarah Jenkins", "Kenji Sato", "Amira Khatib", "Niels Bohr",
    "Chloe Dubois", "Rajesh Koothra", "Emma Watson", "Linus Torvalds", "Grace Hopper",
    "Ada Lovelace", "Alan Turing", "Albert Einstein", "Katherine Johnson", "Richard Feynman",
    "Marie Curie", "Nikola Tesla", "Stephen Hawking", "Charles Darwin", "Thomas Edison",
    "Nikolaus Otto", "Rudolf Diesel", "James Watt", "Alexander Bell", "Guglielmo Marconi",
    "Tim Berners-Lee", "Vint Cerf", "Robert Kahn", "Donald Knuth", "Dennis Ritchie",
    "Ken Thompson", "Bjarne Stroustrup", "James Gosling", "Guido van Rossum", "Yukihiro Matsumoto",
    "Margaret Hamilton", "Dorothy Vaughan", "Mary Jackson", "Jane Goodall", "Rachel Carson",
    "Barbara McClintock", "Rosalind Franklin", "Chien-Shiung Wu", "Mae Jemison", "Sally Ride"
]

LOG_CAUSES = [
    "System Migration Outage Support",
    "Emergency Repair Coverage",
    "Inventory Stocktaking Audit",
    "Understaffing - Weekend Coverage",
    "Operational Backlog Resolution",
    "Critical Security Patching",
    "SLA Escalation Queue Clearing",
    "Quarter-End Audit Support",
    "Hardware Upgrade Deployments",
    "Infrastructure Recovery Response"
]

EVENT_TEMPLATES = [
    {"template": "{dept} System Migration", "type": "it"},
    {"template": "{dept} Performance Audit", "type": "operations"},
    {"template": "{dept} Service Disruption", "type": "it"},
    {"template": "{dept} Annual Review", "type": "operations"},
    {"template": "{dept} High Volume Surge", "type": "market"},
    {"template": "{dept} Hardware Upgrade", "type": "it"},
    {"template": "{dept} Staff Onboarding", "type": "operations"},
    {"template": "{dept} Market Demand Peak", "type": "market"},
]

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def get_dept_factor(dept_name: str) -> float:
    h = hashlib.md5(dept_name.encode('utf-8')).hexdigest()
    val = int(h[:6], 16)
    factor = 0.015 + (val % 251) / 250.0 * 0.025
    return factor

def generate_dept_data(dept_name: str, all_dept_data: Dict[str, Any]) -> Dict[str, Any]:
    factor = get_dept_factor(dept_name)
    months = list(all_dept_data["months"])
    otHours = [int(round(h * factor)) for h in all_dept_data["otHours"]]
    otCost = [int(round(c * factor)) for c in all_dept_data["otCost"]]
    vacancies = [max(1, int(round(v * factor * 8))) for v in all_dept_data["vacancies"]]
    
    h = hashlib.md5(dept_name.encode('utf-8')).hexdigest()
    val_mod = int(h[6:12], 16)
    
    total_ot_hours_sum = sum(otHours)
    r1 = 10 + (val_mod % 30)
    r2 = 10 + ((val_mod // 30) % 30)
    r3 = 10 + ((val_mod // 900) % 30)
    r4 = 10 + ((val_mod // 27000) % 30)
    r5 = 10
    total_r = r1 + r2 + r3 + r4 + r5
    
    drivers = {
        "understaffing": int(round(total_ot_hours_sum * (r1 / total_r))),
        "outages": int(round(total_ot_hours_sum * (r2 / total_r))),
        "seasonality": int(round(total_ot_hours_sum * (r3 / total_r))),
        "backlog": int(round(total_ot_hours_sum * (r4 / total_r))),
        "others": 0
    }
    current_sum = sum(drivers.values())
    drivers["others"] = max(0, total_ot_hours_sum - current_sum)
    if sum(drivers.values()) != total_ot_hours_sum:
        diff = total_ot_hours_sum - sum(drivers.values())
        drivers["understaffing"] += diff
        
    max_driver = max(drivers, key=lambda k: drivers[k] if k != "others" else -1)
    driver_pretty_names = {
        "understaffing": "Staff Vacancies",
        "outages": "System Downtime",
        "seasonality": "Seasonal Surges",
        "backlog": "Operational Backlog"
    }
    
    primary_driver = f"{dept_name.title()} {driver_pretty_names.get(max_driver, 'Operational Demands')}"
    pct = round((drivers[max_driver] / total_ot_hours_sum) * 100) if total_ot_hours_sum > 0 else 0
    driver_subtext = f"{driver_pretty_names.get(max_driver, 'Operations')} accounts for {pct}% of total OT"
    
    return {
        "months": months,
        "otHours": otHours,
        "vacancies": vacancies,
        "otCost": otCost,
        "drivers": drivers,
        "primaryDriver": primary_driver,
        "driverSubtext": driver_subtext
    }

def generate_dept_baseline(dept_name: str) -> Dict[str, Any]:
    factor = get_dept_factor(dept_name)
    all_b = DEPT_BASELINES["all"]
    headcount = max(5, int(round(all_b["totalHeadcount"] * factor)))
    standard_hours = int(round(all_b["standardHours"] * factor))
    standard_pay = int(round(all_b["standardPay"] * factor))
    return {
        "totalHeadcount": headcount,
        "standardHours": standard_hours,
        "standardPay": standard_pay
    }

def generate_global_events(year: int) -> List[Dict[str, Any]]:
    if year < 2025:
        return []
    elif year == 2026:
        return [
            {
                "name": "Q1 Operational Performance Audit",
                "date": "Feb 12-14",
                "type": "operations",
                "hours": 140,
                "cost": 8400,
                "dept": "all"
            },
            {
                "name": "Spring Transit Service Demand Peak",
                "date": "Mar 22-25",
                "type": "market",
                "hours": 260,
                "cost": 15600,
                "dept": "all"
            },
            {
                "name": "ITS Security Infrastructure Audit",
                "date": "Apr 15-19",
                "type": "operations",
                "hours": 190,
                "cost": 11400,
                "dept": "all"
            },
            {
                "name": "Bus Division Maintenance System Migration",
                "date": "May 10-14",
                "type": "it",
                "hours": 343,
                "cost": 20593,
                "dept": "all"
            },
            {
                "name": "Operations Strategic Initiative Staff Onboarding",
                "date": "Jun 15-18",
                "type": "operations",
                "hours": 220,
                "cost": 13200,
                "dept": "all"
            },
            {
                "name": "System-Wide Database Optimization",
                "date": "Aug 15-18",
                "type": "it",
                "hours": 210,
                "cost": 12600,
                "dept": "all",
                "upcoming": True
            },
            {
                "name": "Fall Transit Service Fleet Integration",
                "date": "Oct 10-14",
                "type": "market",
                "hours": 305,
                "cost": 18300,
                "dept": "all",
                "upcoming": True
            },
            {
                "name": "Annual Security Compliance Review",
                "date": "Nov 14-17",
                "type": "operations",
                "hours": 175,
                "cost": 10500,
                "dept": "all",
                "upcoming": True
            }
        ]
    else:
        # year == 2025: only show events occurring after the data starts (July 2025 onwards)
        return [
            {
                "name": "System-Wide Server Hardware Upgrade",
                "date": "Jul 18-21",
                "type": "it",
                "hours": 290,
                "cost": 17400,
                "dept": "all"
            },
            {
                "name": "Operations Department Onboarding Sprint",
                "date": "Sep 15-18",
                "type": "operations",
                "hours": 180,
                "cost": 10800,
                "dept": "all"
            },
            {
                "name": "Q4 Transit Demand Surge (2025)",
                "date": "Nov 22-26",
                "type": "market",
                "hours": 350,
                "cost": 21000,
                "dept": "all"
            }
        ]
UNIONS_LIST = ["NC", "TEAMS", "AFSCME", "ATU", "TCU", "UTU"]
UNION_WEIGHTS = {
    "all": 1.0,
    "NC": 0.15,
    "TEAMS": 0.10,
    "AFSCME": 0.25,
    "ATU": 0.30,
    "TCU": 0.12,
    "UTU": 0.08
}

def generate_logs_for_year(year: int) -> List[Dict[str, Any]]:
    logs = []
    for dept_idx, dept_name in enumerate(DEPARTMENTS_LIST):
        for log_idx in range(3):
            h = hashlib.md5(f"{dept_name}-{year}-{log_idx}".encode('utf-8')).hexdigest()
            val = int(h[:6], 16)
            
            emp = EMPLOYEE_NAMES[(dept_idx * 3 + log_idx) % len(EMPLOYEE_NAMES)]
            cause = LOG_CAUSES[val % len(LOG_CAUSES)]
            
            month = 1 + (val % 6) if year == 2026 else 1 + (val % 12)
            day = 1 + (val % 28)
            date_str = f"{year}-{month:02d}-{day:02d}"
            
            hours = 6 + (val % 15)
            cost = hours * 60
            status = "Approved" if (val % 10 != 0) else "Pending"
            
            logs.append({
                "employee": emp,
                "department": dept_name,
                "date": date_str,
                "hours": hours,
                "cause": f"{dept_name.title()} {cause}",
                "cost": cost,
                "status": status,
                "union": UNIONS_LIST[val % len(UNIONS_LIST)]
            })
            
    # generate 10 unassigned logs (represents null records)
    for idx in range(10):
        h = hashlib.md5(f"unassigned-{year}-{idx}".encode('utf-8')).hexdigest()
        val = int(h[:6], 16)
        
        emp = EMPLOYEE_NAMES[(len(DEPARTMENTS_LIST) * 3 + idx) % len(EMPLOYEE_NAMES)]
        cause = LOG_CAUSES[val % len(LOG_CAUSES)]
        
        month = 1 + (val % 6) if year == 2026 else 1 + (val % 12)
        day = 1 + (val % 28)
        date_str = f"{year}-{month:02d}-{day:02d}"
        
        hours = 6 + (val % 15)
        cost = hours * 60
        status = "Approved" if (val % 10 != 0) else "Pending"
        
        logs.append({
            "employee": emp,
            "department": "Unassigned",
            "date": date_str,
            "hours": hours,
            "cause": f"Unassigned {cause}",
            "cost": cost,
            "status": status,
            "union": UNIONS_LIST[val % len(UNIONS_LIST)]
        })
    return logs
import json
import os

def load_vacancies_json() -> List[Dict[str, Any]]:
    json_path = os.path.join(os.path.dirname(__file__), "vacancy_data.json")
    if not os.path.exists(json_path):
        return []
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    records = []
    for row in data:
        period = row["Snapshot Period"]
        parts = period.split("-")
        month_abbr = parts[0].title() # "APR" -> "Apr"
        year = 2000 + int(parts[1])  # 26 -> 2026
        
        records.append({
            "period": period,
            "month": month_abbr,
            "year": year,
            "department": row["Charging Dept Name"],
            "union": row["Union"],
            "positions": int(row["Budgeted Positions"]),
            "net_vacancies": int(row["Net Vacancy Overfill"])
        })
    return records

def load_vacancies_bigquery():
    query = """
    select `Snapshot Period` as `period`,
            initcap(substring(`Snapshot Period`, 1, 3)) as `month`,
            (2000 + cast(substring(`Snapshot Period`, 5, 6) as int)) as `year`,
            `Charging Dept Name` as `department`,
            `Union` as `union`,
            sum(`Sum of Budgeted Positions`) as `positions`,
            sum(`Sum of Net Vacancy_Overfill`) as `net_vacancies`
        from `its9210.FTE_vacancy_data.FTE Vacancy`
        group by `Snapshot Period`, `Charging Dept Name`, `Union`
    """

    query_job = bq_client.query(query)
    results = [dict(row) for row in query_job]
    return results

# Global variable holding memory database of JSON rows
try:
    VACANCY_RECORDS = load_vacancies_bigquery()
except Exception as e:
    print(f"Failed to load from BigQuery: {e}")
    VACANCY_RECORDS = []


# Master "all" totals (100%)
GLOBAL_DATA_2026 = {
    "departments": {
        "all": {
            "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            "otHours": [1200, 1150, 1380, 1940, 1642, 1720, 1450, 1300, 1550, 1800, 2100, 1950],
            "vacancies": [28, 30, 34, 42, 45, 41, 38, 35, 39, 44, 48, 43],
            "otCost": [72000, 69000, 82800, 116400, 98520, 103200, 87000, 78000, 93000, 108000, 126000, 117000],
            "drivers": {
                "understaffing": 624,  # 38%
                "outages": 361,        # 22%
                "seasonality": 295,    # 18%
                "backlog": 246,       # 15%
                "others": 116          # 7%
            },
            "primaryDriver": "Staff Vacancies",
            "driverSubtext": "Accounting for 38% of total hours"
        }
    }
}

DEPT_BASELINES = {
    "all": {"totalHeadcount": 650, "standardHours": 84000, "standardPay": 3360000}
}

# Populate dynamic departments
for dept_name in DEPARTMENTS_LIST:
    GLOBAL_DATA_2026["departments"][dept_name] = generate_dept_data(dept_name, GLOBAL_DATA_2026["departments"]["all"])
    DEPT_BASELINES[dept_name] = generate_dept_baseline(dept_name)

# Populate 2026 logs and events
GLOBAL_DATA_2026["events"] = generate_global_events(2026)

GLOBAL_DATA_2026["logs"] = generate_logs_for_year(2026)

# Sort 2026 events chronologically based on month and start day
def event_sort_key(e):
    m_name = e["date"].split()[0]
    days = e["date"].split()[1].split("-")[0]
    return (MONTH_NAMES.index(m_name), int(days))

GLOBAL_DATA_2026["events"].sort(key=event_sort_key)


# ----------------------------------------------------
# 2. HISTORICAL DATA GENERATION (Prior Years 2025/2024)
# ----------------------------------------------------

HISTORICAL_DATA = {
    2026: copy.deepcopy(GLOBAL_DATA_2026)
}

def init_historical_data():
    for year in [2025, 2024]:
        factor = 0.91 if year == 2025 else 0.81
        depts_copy = copy.deepcopy(GLOBAL_DATA_2026["departments"])
        
        hours_multipliers = (
            [1.15, 0.85, 0.95, 1.25, 0.75, 1.10, 0.90, 1.05, 1.25, 0.80, 0.95, 1.05]
            if year == 2025 else
            [0.80, 1.20, 0.75, 1.10, 1.25, 0.85, 1.05, 0.95, 0.70, 1.25, 0.90, 1.20]
        )
        vac_multipliers = (
            [0.85, 1.15, 1.20, 0.80, 1.10, 0.95, 1.05, 1.25, 0.75, 1.15, 0.90, 0.95]
            if year == 2025 else
            [1.20, 0.75, 0.90, 1.15, 0.80, 1.10, 1.25, 0.85, 1.00, 0.70, 1.20, 1.05]
        )
        
        # Scale departments
        for dept in depts_copy:
            d = depts_copy[dept]
            d["otHours"] = [
                None if v is None else int(round(v * factor * hours_multipliers[idx]))
                for idx, v in enumerate(d["otHours"])
            ]
            d["otCost"] = [
                None if v is None else int(round(v * factor * hours_multipliers[idx]))
                for idx, v in enumerate(d["otCost"])
            ]
            d["vacancies"] = [
                None if v is None else max(0, int(round(v * (factor + 0.05) * vac_multipliers[idx])))
                for idx, v in enumerate(d["vacancies"])
            ]
            for k in d["drivers"]:
                d["drivers"][k] = int(round(d["drivers"][k] * factor))
                
        # Scale logs
        logs_copy = generate_logs_for_year(year)
        
        # Generate events for prior year
        events_copy = generate_global_events(year)
        events_copy.sort(key=event_sort_key)
        
        HISTORICAL_DATA[year] = {
            "departments": depts_copy,
            "events": events_copy,
            "logs": logs_copy
        }

init_historical_data()

# ----------------------------------------------------
# 3. HELPER UTILITIES
# ----------------------------------------------------

def get_timeframe_slice(timeframe: str, year: int) -> Dict[str, Any]:
    if timeframe == "q1":
        return {"start": 0, "end": 3, "label": "Q1"}
    elif timeframe == "q2":
        return {"start": 3, "end": 6, "label": "Q2"}
    elif timeframe == "q3":
        return {"start": 6, "end": 9, "label": "Q3"}
    elif timeframe == "q4":
        return {"start": 9, "end": 12, "label": "Q4"}
    elif timeframe == "h1":
        return {"start": 0, "end": 6, "label": "H1"}
    elif timeframe == "h2":
        return {"start": 6, "end": 12, "label": "H2"}
    elif timeframe == "ytd":
        end_month = 6 if year == 2026 else 12
        return {"start": 0, "end": end_month, "label": "YTD"}
    else:  # full
        return {"start": 0, "end": 12, "label": "Full Year"}

# ----------------------------------------------------
# 4. CHAT BOT RESPONSE CONFIGURATION
# ----------------------------------------------------

BOT_RESPONSES = {
    "greetings": {
        "thought": "[init] Initializing Overtime AI Core...\n[data] Loading YTD 2026 datasets (100 log entries, 45 corporate events, 30 department profiles)\n[match] Indexing correlations between 'job_vacancies' and 'ot_hours'\n[success] Models calibrated. Ready to serve.",
        "content": """### Welcome to the Overtime Analysis Agent! 👋

I have ingested all operational logs, job vacancy posts, and IT/event schedules. Here is a high-level audit of the top departments for **YTD 2026**:

| Department | Total OT Hours | Est. Cost | Key Core Driver |
| :--- | :---: | :---: | :--- |
| **Operations Strategic Initiative** | 361 hrs | $21,623 | Staff Vacancies |
| **Central Operations, Transit Service** | 359 hrs | $21,568 | Staff Vacancies |
| **Exec. Office, Admin & Development** | 353 hrs | $21,188 | System Downtime |
| **Bus Division Maintenance** | 343 hrs | $20,593 | System Downtime |

*Notice the severe **Operations Strategic Initiative staff shortage** and the **Bus Division Maintenance outage peak**.* 

How can I help you analyze these spikes today? Feel free to click any of the **suggested questions below** or type your own!""",
        "action": None
    },
    "spike": {
        "thought": "[query] SELECT * FROM events JOIN logs ON events.date_range = logs.date WHERE month = 'April'\n[calc] April overall OT = 1,940 hours (Peak Month, +40.5% over Mar average)\n[correlate] Overlapping system migrations, audits, and operational demands across multiple key departments\n[action] Triggering dashboard reset: Department => 'all', Table Search => 'April'",
        "content": """In **April 2026**, our overall overtime hours peaked at **1,940 hours** (the highest month of the entire year). 

If you filter the dashboard to **All Departments** and search the logs for **"April"**, you can see the matching records. This surge was driven by overlapping system migrations, compliance reviews, and elevated operational demands across multiple key departments while managing open vacancies.

**Suggested Strategy**: We should implement a *temporary worker buffer* in early April next year to prevent paying standard staff 1.5x time-and-a-half overtime rates, which cost us an extra **$32,400** in April alone.""",
        "action": {
            "setDepartment": "all",
            "searchTable": "April",
            "toggleDrivers": {
                "seasonality": True,
                "understaffing": True
            }
        }
    },
    "vacancy": {
        "thought": "[query] SELECT correlation(ot_hours, job_vacancies) FROM logs WHERE department = 'OPERATIONS STRATEGIC INITIATIVE'\n[calc] Pearson Correlation Coefficient R = 0.94 (Extremely Strong Positive Correlation)\n[calc] OPERATIONS STRATEGIC INITIATIVE vacancy average: 8 open postings. Overtime cost = $21,623\n[action] Triggering dashboard navigation: Department => 'OPERATIONS STRATEGIC INITIATIVE', Toggle Vacancy => ON",
        "content": """If you isolate the **Operations Strategic Initiative** department and enable both the **Overtime Hours** and **Job Vacancy** series on the trend chart, you can clearly see this correlation.

There is an **extremely strong positive correlation (R = 0.94)** between our open postings and paid overtime. 

### Key Findings:
* **The Core Issue**: Operations Strategic Initiative has been struggling with consistent vacancies.
* **The Financial Impact**: Understaffing is the key driver of this department's overtime spend, costing us **$21,623** in YTD 2026.
* **Vicious Cycle**: Because we are short-staffed, existing workers are averaging high overtime per week, leading to higher burnout risks and subsequent voluntary resignations.

**Hiring Recommendation**: Offering a **$2,500 signing bonus** for the remaining critical postings will cost **$12,500** upfront, but will eliminate compounding overtime labor!""",
        "action": {
            "setDepartment": "OPERATIONS STRATEGIC INITIATIVE",
            "searchTable": "",
            "checkLines": {
                "vacancy": True,
                "hours": True
            },
            "toggleDrivers": {
                "understaffing": True
            }
        }
    },
    "outage": {
        "thought": "[query] SELECT ot_hours, date FROM logs WHERE department = 'BUS DIVISION MAINTENANCE' AND date LIKE '2026-05-%'\n[calc] May Support OT hours = 343 hrs (+112% over baseline average)\n[match] Event database shows 'Bus Division Maintenance System Migration' May 10-14\n[calc] Outage duration = 14 hours. Backlog ticket count spiked\n[action] Triggering dashboard navigation: Department => 'BUS DIVISION MAINTENANCE'",
        "content": """If you select **Bus Division Maintenance** on your dashboard, you will notice an isolated surge in **May 2026** reaching **343 hours**.

The data proves that the **System Migration** was the direct catalyst.

### Outage Impact breakdown:
* **The Event**: The system went down for a total of **14 hours** over a 4-day migration window.
* **The Recovery Cost**: Once the system came online, agents worked overnight shifts to clear the backlog, registering outage-related overtime hours costing us **$20,593** in supplementary labor.

**Contractual Insight**: Since this outage exceeded our vendor SLA threshold of 99.9%, we are entitled to a **$15,000 service credit refund**. I have drafted a claim document that our operations team can submit to the vendor.""",
        "action": {
            "setDepartment": "BUS DIVISION MAINTENANCE",
            "searchTable": "System Migration",
            "toggleDrivers": {
                "outages": True
            }
        }
    },
    "recommendations": {
        "thought": "[aggregate] Analyzing all drivers and ROI vectors...\n[model] Running cost mitigation forecast algorithms\n[success] 3 high-probability strategic maneuvers identified. ROI ratio: 4.2x",
        "content": """Based on my predictive models and the Q2 dataset, here is the **3-Step Overtime Mitigation Strategy** with high ROI:

### 1. Accelerate Operations Strategic Initiative Hiring (ROI: 240%)
* **Action**: Approve an auxiliary budget for regional job fairs and accelerated onboarding programs.
* **Rationale**: Filling just **critical open roles** will immediately lower overtime by 55%, yielding significant monthly savings.

### 2. SLA Penalties for Tech Outages (ROI: 100%)
* **Action**: Formally submit the **SLA Service Credit claim** to our IT vendor for the May 10-14 outage in Bus Division Maintenance.
* **Rationale**: The outage cost us significant overtime recovery. We can reclaim credit directly from the vendor's billing department.

### 3. Support Cross-Training Pool
* **Action**: Cross-train staff across departments to assist during emergency IT outages or delivery bottlenecks.
* **Rationale**: Trained staff can absorb simple ticket tiers or tasks at standard salaries during emergency surges rather than paying high overtime rates.

Would you like me to generate a formal PDF report summarizing these recommendations for the executive board?""",
        "action": {
            "setDepartment": "all",
            "searchTable": "",
            "enableAllDrivers": True
        }
    },
    "fallback": {
        "thought": "[nlp] Query unrecognized. Reverting to general semantic search on dataset\n[match] Searching logs for query patterns",
        "content": """I've analyzed your query against the active overtime records. While I couldn't find a direct correlation mapping, I can confirm that our current **Total Overtime is 1,642 hours** with an estimated cost of **$98,520**.

You can try asking me one of the primary correlations:
* **"Explain the April OT spike"**
* **"How do vacancies affect Logistics?"** (mapped to Operations Strategic Initiative)
* **"What was the impact of the CRM system migration?"** (mapped to Bus Division Maintenance)
* **"What recommendations do you have to lower overtime cost?"**""",
        "action": None
    }
}

# ----------------------------------------------------
# 5. REST ENDPOINTS
# ----------------------------------------------------

@app.post("/api/refresh")
def refresh_bigquery_data():
    global VACANCY_RECORDS
    try:
        VACANCY_RECORDS = load_vacancies_bigquery()
        return {"status": "success", "records_count": len(VACANCY_RECORDS)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh BigQuery: {str(e)}")

@app.get("/api/dashboard")
def get_dashboard(
    department: str = "all",
    year: int = 2026,
    timeframe: str = "ytd",
    union: str = "all"
):
    if year not in HISTORICAL_DATA:
        raise HTTPException(status_code=404, detail="Year data not found")
        
    year_data = HISTORICAL_DATA[year]
    if department not in year_data["departments"]:
        raise HTTPException(status_code=404, detail="Department not found")
        
    dept_data = year_data["departments"][department]
    baseline = DEPT_BASELINES.get(department, DEPT_BASELINES["all"])
    slice_info = get_timeframe_slice(timeframe, year)
    
    union_weight = UNION_WEIGHTS.get(union, 1.0)
    
    # --- VACANCIES COMPUTATION FROM JSON ---
    v_list_full = []
    positions_list_full = []
    for m in MONTH_NAMES:
        matching_records = [
            r for r in VACANCY_RECORDS
            if r["year"] == year and r["month"] == m
        ]
        if department != "all":
            matching_records = [r for r in matching_records if r["department"] == department]
        if union != "all":
            matching_records = [r for r in matching_records if r["union"] == union]
            
        tot_v = sum(r["net_vacancies"] for r in matching_records) if matching_records else 0.0
        tot_pos = sum(r["positions"] for r in matching_records) if matching_records else 0.0
        v_list_full.append(tot_v)
        positions_list_full.append(tot_pos)
        
    v_list = v_list_full[slice_info["start"]:slice_info["end"]]
    if year == 2026:
        v_list = [v for idx, v in enumerate(v_list) if (slice_info["start"] + idx) < 6]

    # Filter overtime hours and costs to match available vacancy data periods
    raw_ot_hours = []
    raw_ot_cost = []
    for idx, m in enumerate(MONTH_NAMES):
        has_v = any(
            r["year"] == year and r["month"] == m and
            (department == "all" or r["department"] == department) and
            (union == "all" or r["union"] == union)
            for r in VACANCY_RECORDS
        )
        if has_v:
            v = v_list_full[idx]
            # Overtime hours perfectly correlate with vacancies: 1.5% base of standard hours + 12 hours per vacancy
            base_ot = baseline["standardHours"] * 0.015
            ot_h = abs(int(round(base_ot + v * 12)))
            raw_ot_hours.append(ot_h)
            raw_ot_cost.append(ot_h * 60) # Overtime is paid at $60/hr rate
        else:
            raw_ot_hours.append(None)
            raw_ot_cost.append(None)

    # Slice arrays
    h_list = raw_ot_hours[slice_info["start"]:slice_info["end"]]
    c_list = raw_ot_cost[slice_info["start"]:slice_info["end"]]
    
    # If 2026, ignore indices >= 6 (predictions area) for static metrics
    if year == 2026:
        # Map indices from timeframe relative to absolute index
        h_list = [v for idx, v in enumerate(h_list) if (slice_info["start"] + idx) < 6]
        c_list = [v for idx, v in enumerate(c_list) if (slice_info["start"] + idx) < 6]
        
    # Standard sum/average calculations with scaling
    total_hours = int(round(sum([h for h in h_list if h is not None]) * union_weight))
    avg_vacancies = int(round(sum([v for v in v_list if v is not None]) / len(v_list))) if v_list else 0
    total_cost = int(round(sum([c for c in c_list if c is not None]) * union_weight))
    
    # Dynamic Trend line calculations (percent rates relative to headcounts and pay metrics)
    
    vacancy_pct = [
        None if v is None or pos == 0 else round((v / pos) * 100, 2)
        for v, pos in zip(v_list_full, positions_list_full)
    ]
    hours_pct = [
        None if h is None else round((h / baseline["standardHours"]) * 100 * union_weight, 2)
        for h in raw_ot_hours
    ]
    pay_pct = [
        None if c is None else round((c / baseline["standardPay"]) * 100 * union_weight, 2)
        for c in raw_ot_cost
    ]
    
    # Check if selected department and union combination has any data at all
    combination_has_data = True
    if department != "all" and union != "all":
        combination_has_data = any(
            r["department"] == department and r["union"] == union
            for r in VACANCY_RECORDS
        )
        
    if not combination_has_data:
        total_hours = 0
        avg_vacancies = 0
        total_cost = 0
        vacancy_pct = [None] * len(v_list_full)
        hours_pct = [None] * len(raw_ot_hours)
        pay_pct = [None] * len(raw_ot_cost)
    
    scaled_drivers = {
        key: int(round(val * union_weight))
        for key, val in dept_data["drivers"].items()
    }
    
    # Return formatted payload
    return {
        "metrics": {
            "totalHours": total_hours,
            "avgVacancies": avg_vacancies,
            "totalCost": total_cost,
            "primaryDriver": dept_data["primaryDriver"],
            "driverSubtext": dept_data["driverSubtext"]
        },
        "trends": {
            "months": dept_data["months"],
            "vacancyRate": vacancy_pct,
            "otHoursRate": hours_pct,
            "otPayRate": pay_pct
        },
        "drivers": scaled_drivers
    }

@app.get("/api/events")
def get_events(department: str = "all", year: int = 2026):
    if year not in HISTORICAL_DATA:
        raise HTTPException(status_code=404, detail="Year data not found")
        
    return HISTORICAL_DATA[year]["events"]

@app.get("/api/logs")
def get_logs(
    department: str = "all",
    year: int = 2026,
    timeframe: str = "ytd",
    union: str = "all",
    search: str = "",
    sortField: str = "date",
    sortOrder: str = "desc",
    page: int = 1,
    rowsPerPage: int = 8
):
    if year not in HISTORICAL_DATA:
        raise HTTPException(status_code=404, detail="Year data not found")
        
    logs = HISTORICAL_DATA[year]["logs"]
    slice_info = get_timeframe_slice(timeframe, year)
    
    # 1. Timeframe filtering
    filtered_logs = []
    for log in logs:
        # Date structure is YYYY-MM-DD
        try:
            parts = log["date"].split("-")
            month_idx = int(parts[1]) - 1
            if month_idx >= slice_info["start"] and month_idx < slice_info["end"]:
                filtered_logs.append(log)
        except Exception:
            pass
            
    # 2. Department filtering (Direct string matching!)
    if department != "all":
        filtered_logs = [l for l in filtered_logs if l["department"] == department]
        
    # 2.5 Union filtering
    if union != "all":
        filtered_logs = [l for l in filtered_logs if l.get("union") == union]
        
    # 3. Search query filtering
    if search.strip():
        q = search.lower()
        filtered_logs = [
            l for l in filtered_logs
            if q in l["employee"].lower() or q in l["cause"].lower() or q in l["department"].lower()
        ]
        
    # 4. Sorting
    reverse = (sortOrder == "desc")
    
    def sort_key(item):
        val = item.get(sortField)
        if isinstance(val, str):
            return val.lower()
        return val if val is not None else 0
        
    filtered_logs.sort(key=sort_key, reverse=reverse)
    
    # 5. Pagination
    total_count = len(filtered_logs)
    total_pages = max(1, math.ceil(total_count / rowsPerPage))
    
    clamped_page = max(1, min(page, total_pages))
    start_idx = (clamped_page - 1) * rowsPerPage
    end_idx = min(start_idx + rowsPerPage, total_count)
    
    paginated_logs = filtered_logs[start_idx:end_idx]
    
    return {
        "logs": paginated_logs,
        "totalCount": total_count,
        "totalPages": total_pages,
        "currentPage": clamped_page,
        "startIndex": start_idx,
        "endIndex": end_idx
    }

@app.get("/api/vacancies-table")
def get_vacancies_table(
    department: str = "all",
    year: int = 2026,
    timeframe: str = "ytd",
    union: str = "all",
    search: str = "",
    sortField: str = "department",
    sortOrder: str = "asc",
    page: int = 1,
    rowsPerPage: int = 8
):
    if year not in HISTORICAL_DATA:
        raise HTTPException(status_code=404, detail="Year data not found")
        
    year_data = HISTORICAL_DATA[year]
    slice_info = get_timeframe_slice(timeframe, year)
    
    # 1. Retrieve records and aggregate vacancies by (department, union) pair
    group_data = {}
    for r in VACANCY_RECORDS:
        if r["year"] != year:
            continue
        if r["department"] is None or r["union"] is None:
            continue
        if department != "all" and r["department"] != department:
            continue
        if union != "all" and r["union"] != union:
            continue
            
        m_idx = MONTH_NAMES.index(r["month"])
        if not (slice_info["start"] <= m_idx < slice_info["end"]):
            continue
        if year == 2026 and m_idx >= 6:
            continue
            
        key = (r["department"], r["union"])
        if key not in group_data:
            group_data[key] = {"vacancies": [], "positions": []}
        group_data[key]["vacancies"].append(r["net_vacancies"])
        group_data[key]["positions"].append(r["positions"])
        
    rows = []
    for (d, u), data_dict in group_data.items():
        vals = data_dict["vacancies"]
        pos_vals = data_dict["positions"]
        avg_vacancies = sum(vals) / len(vals) if vals else 0.0
        avg_positions = sum(pos_vals) / len(pos_vals) if pos_vals else 0.0
        
        net_vacancies = int(round(avg_vacancies))
        budgeted_positions = int(round(avg_positions))
        
        vacancy_pct = (net_vacancies / budgeted_positions * 100) if budgeted_positions > 0 else 0.0
        
        rows.append({
            "department": d,
            "union": u,
            "vacancies": net_vacancies,
            "vacancy_pct": round(vacancy_pct, 1)
        })
            
    # 2. Filter by search query
    if search.strip():
        q = search.lower()
        rows = [
            r for r in rows
            if q in r["department"].lower() or q in r["union"].lower()
        ]
        
    # 3. Sort
    reverse = (sortOrder == "desc")
    def sort_key(item):
        val = item.get(sortField)
        if isinstance(val, str):
            return val.lower()
        if val is None:
            return "" if sortField in ("department", "union") else 0.0
        return val
        
    rows.sort(key=sort_key, reverse=reverse)
    
    # 4. Paginate
    total_count = len(rows)
    total_pages = max(1, math.ceil(total_count / rowsPerPage))
    clamped_page = max(1, min(page, total_pages))
    
    start_idx = (clamped_page - 1) * rowsPerPage
    end_idx = min(start_idx + rowsPerPage, total_count)
    
    paginated_rows = rows[start_idx:end_idx]
    
    return {
        "rows": paginated_rows,
        "totalCount": total_count,
        "totalPages": total_pages,
        "currentPage": clamped_page,
        "startIndex": start_idx,
        "endIndex": end_idx
    }

class ChatPrompt(BaseModel):
    message: str
    year: int = 2026
    timeframe: str = "ytd"

@app.post("/api/chat")
def post_chat(payload: ChatPrompt):
    clean_text = payload.message.lower()
    
    # Identify match category
    key = "fallback"
    if any(k in clean_text for k in ["spike", "april", "massive overtime", "seasonal", "seasonality"]):
        key = "spike"
    elif any(k in clean_text for k in ["vacancy", "vacancies", "shortage", "understaffing"]):
        key = "vacancy"
    elif any(k in clean_text for k in ["outage", "outages", "crm", "system migration", "erp", "system outages"]):
        key = "outage"
    elif any(k in clean_text for k in ["recommend", "recommendation", "hiring strategy", "lower", "backlog"]):
        key = "recommendations"
        
    response_data = copy.deepcopy(BOT_RESPONSES[key])
    
    # Replace active timeframe labels dynamically based on state
    tf_labels = {
        "q1": "Q1", "q2": "Q2", "q3": "Q3", "q4": "Q4",
        "h1": "H1", "h2": "H2", "ytd": "YTD", "full": "Full Year"
    }
    tf_label = tf_labels.get(payload.timeframe, "YTD")
    
    # Replace YTD and 2026 with active values
    response_data["thought"] = response_data["thought"].replace("YTD", tf_label).replace("2026", str(payload.year))
    response_data["content"] = response_data["content"].replace("YTD", tf_label).replace("2026", str(payload.year))
    
    return response_data

import csv
import hashlib
import os

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
    "EXECUTIVE DIRECTOR, RAIL MAINTENANCE",
    "RAIL FLEET SERVICES MAINTENANCE",
    "EXECUTIVE OFFICE, TRANSIT SERVICE DELIVERY",
    "RAIL TRANSIT OPERATIONS",
    "ITS/SPEED & RELIABILITY GROUP"
]

UNIONS_LIST = ["NC", "TEAMS", "AFSCME", "ATU", "TCU", "UTU"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
YEARS = ["25", "26"]

csv_path = "vacancies_sample.csv"

with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    # Write header
    writer.writerow([
        "Snapshot Period",
        "Charging Dept Name",
        "Union",
        "Sum of Budgeted Positions",
        "Sum of Net Vacancy_Overfill"
    ])
    
    for year in YEARS:
        for month in MONTHS:
            snapshot_period = f"{month}-{year}"
            for dept in DEPARTMENTS_LIST:
                for union in UNIONS_LIST:
                    # Generate realistic deterministic values using hashlib
                    h_key = f"{snapshot_period}-{dept}-{union}"
                    h = hashlib.md5(h_key.encode("utf-8")).hexdigest()
                    val = int(h[:6], 16)
                    
                    budgeted_positions = 50 + (val % 350)
                    
                    # Vacancy can be negative (overfill), zero, or positive
                    # Let's skew it so most are positive but a few are negative
                    vacancy_raw = -10 + (val % 55)
                    # Let's scale vacancies based on the department size
                    net_vacancy = int(round(vacancy_raw * (budgeted_positions / 400.0)))
                    if net_vacancy == 0 and (val % 10 < 3):
                        net_vacancy = -int(val % 3) # negative overfill
                        
                    writer.writerow([
                        snapshot_period,
                        dept,
                        union,
                        budgeted_positions,
                        net_vacancy
                    ])

print(f"Generated {csv_path} successfully.")

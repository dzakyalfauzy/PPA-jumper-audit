# Phase 5.4 — Source Data Mapping & Workflow Redesign

## Task 1: Audit and Map the Source Data

### Source Files Inspected
- `Chart PLC Audit Jumper 2026 2.xlsx`
- `FMDS PP Automation - Week 40 2026 .pptx.pdf`

### Audit Findings

1. **Jumper Register (Master Data) is Missing from Source**
   - The Excel workbook does **not** contain a master list of individual jumper records (e.g., Jumper ID, PLC, Description, Auth Status, MOC Status, Due Date).
   - The sheets (`Weekly Jumper`, `AFI (wkly)`, `Forces (wkly)`, `Short Branches (wkly)`, etc.) only contain pre-aggregated, weekly historical counts for each plant area (Kiln, Dryer, Furnace, Converter).
   - Without a master list in the Excel file, we cannot "seed" the Jumper Register database with historical records.

2. **Weekly Plan & Actual Data (Aggregations)**
   - The sheet `Weekly Jumper` contains the weekly Plan vs Actual data for the 12 charts.
   - Example format: Rows labeled `PLAN` and `ACTUAL` with columns for week labels (`wk1('25)`, `wk1('26)`, `wk39`, `wk40`, etc.).
   - Some cells use decimal values (e.g., `0.01` or `0.15`) instead of zero (`0`), likely to render line charts continuously in Excel.

3. **Area Summary**
   - Data for the Area Summary (Dryer–CM, Kiln–CTS, Furnace, Converter) is present in the `PP update All Area (New chart)` sheet as pivot-like summary tables.

4. **Reference Report Matching (PDF Page 2 - Week 40)**
   - The PDF shows individual jumper details in the "Update Jumper Table" and "Remaining Jumper List". These details are **typed directly into the PowerPoint** and are not linked to or derived from the provided Excel workbook.
   - The PDF shows the following baseline values for Week 40:
     - **Dryer–CM:** 6 Jumpers
     - **Kiln–CTS:** 3 Jumpers
     - **Furnace:** 0 Jumpers
     - **Converter:** 0 Jumpers
     - **Remaining Jumper (without MOC):** 3
     - **Total removed WK40:** 0
     - **Total Authorized/MoC 2026:** 3
     - **Remaining PLC:** 4/69

### Source Mapping Document

| Application Field | Source Sheet | Source Range/Column | Transformation | Confidence/Notes |
|---|---|---|---|---|
| **PLC master data** | N/A | N/A | None | **Low**. Not found in Excel. Typed directly into PPT. |
| **Jumper master data** | N/A | N/A | None | **Low**. Descriptions, Statuses, Installed dates are only in PPT. |
| **Plant areas** | `Weekly Jumper` | Row 3+ (KILN, DRYER, FURNACE, CONV) | Mapped to `AREA_ID_LIST` | **High**. |
| **Categories** | `Weekly Jumper` | Header blocks (AFI, Shortbranches, Forces) | Mapped to `CATEGORY_LIST` | **High**. |
| **Weekly Plan/Actual** | `Weekly Jumper` | Rows "PLAN" and "ACTUAL" across week columns | Decimals like `0.01` mapped back to `0` or handled per UI. | **Medium**. Structure is pivot-based. |
| **Area Summary** | `PP update All Area` | Row 6-9, etc. | Direct value mapping | **Medium**. Needs explicit period filtering. |

---

## Task 2: Initial Dataset Recommendation

Since the Excel file **does not** contain the Jumper Register Master Data, we cannot extract an initial dataset from it to seed `state.jumperRegister`.

**Proposed Action:**
Instead of extracting from Excel, we will seed the initial application state using the **exact baseline values from the PDF (Week 40)** as our initial master dataset. This provides the user with a pre-populated Week-40 state that perfectly matches the reference output.

### Proposed Initial State Structure (Based on PDF)

```json
{
  "config": {
    "title": "PPA JUMPER AUDIT WEEK-40",
    "plantArea": "Process Plant Area",
    "reportingYear": 2026,
    "reportingWeek": 40,
    "weekLabels": ["wk39", "wk40", "wk41", "wk42"],
    "totalPlcInScope": 69,
    "identificationYearFilter": 2026
  },
  "areaSummary": [
    { "areaId": "dryer_cm", "jumperCount": 6 },
    { "areaId": "kiln_cts", "jumperCount": 3 },
    { "areaId": "furnace", "jumperCount": 0 },
    { "areaId": "converter", "jumperCount": 0 }
  ],
  "jumperRegister": [
    // Authorized/MoC Jumpers (Total = 3)
    {
      "jumperId": "J-001", "plc": "D3C", "areaId": "dryer_cm", "category": "Shortbranches",
      "description": "Shortbranches installed on PLC D3C, FSL (Flow Switch Low) Feed conv. Dryer 3",
      "installedWeekOrDate": "Wk10 2026", "authorizationStatus": "Authorized", "mocStatus": "Approved/Complete",
      "removalStatus": "No", "dueDateStatus": "confirmed", "dueDate": "Wk51 2026", "identificationYear": 2026, "quantity": 1
    },
    {
      "jumperId": "J-002", "plc": "D3C1", "areaId": "dryer_cm", "category": "Shortbranches",
      "description": "Shortbranches installed on PLC D3C MainFlame On Interlock to TR ESP",
      "installedWeekOrDate": "wk16", "authorizationStatus": "Authorized", "mocStatus": "Approved/Complete",
      "removalStatus": "No", "dueDateStatus": "unconfirmed", "dueDate": null, "identificationYear": 2026, "quantity": 1
    },
    {
      "jumperId": "J-003", "plc": "CMS1", "areaId": "dryer_cm", "category": "Forces",
      "description": "Forces installed on PLC CMS1 Level HiHi Switch Surge Bin - Digital_Alarms",
      "installedWeekOrDate": "Re-installed wk27", "authorizationStatus": "Authorized", "mocStatus": "Approved/Complete",
      "removalStatus": "No", "dueDateStatus": "confirmed", "dueDate": "Wk27 2026", "identificationYear": 2026, "quantity": 1
    },
    // Remaining Jumpers Without MOC (Total = 3)
    {
      "jumperId": "J-004", "plc": "K2C", "areaId": "kiln_cts", "category": "AFI",
      "description": "Conveying Blower opr ready E4AM01 on PLC K2C",
      "installedWeekOrDate": "Wk39 2026", "authorizationStatus": "Not Authorized", "mocStatus": "Not Available",
      "removalStatus": "No", "dueDateStatus": "unconfirmed", "dueDate": null, "identificationYear": 2026, "quantity": 1
    },
    {
      "jumperId": "J-005", "plc": "K2C", "areaId": "kiln_cts", "category": "AFI",
      "description": "Conveying Blower opr ready H21M03 on PLC K2C",
      "installedWeekOrDate": "Wk39 2026", "authorizationStatus": "Not Authorized", "mocStatus": "Not Available",
      "removalStatus": "No", "dueDateStatus": "unconfirmed", "dueDate": null, "identificationYear": 2026, "quantity": 1
    },
    {
      "jumperId": "J-006", "plc": "K2C", "areaId": "kiln_cts", "category": "AFI",
      "description": "Conveying Blower opr ready H21M04 on PLC K2C",
      "installedWeekOrDate": "Wk39 2026", "authorizationStatus": "Not Authorized", "mocStatus": "Not Available",
      "removalStatus": "No", "dueDateStatus": "unconfirmed", "dueDate": null, "identificationYear": 2026, "quantity": 1
    }
  ]
}
```

---

## Task 3: Unresolved Conflicts & Open Questions

1. **Missing Master Data:** The biggest conflict is the total absence of Jumper Register data in the provided Excel file. The application relies heavily on `jumperRegister` to calculate KPIs, but the owner currently calculates KPIs outside of Excel or types them manually into the PPT.
2. **Decimal Values in Charts:** Excel shows values like `0.01` and `0.15` in `Weekly Jumper`. The application currently distinguishes between `null` (empty) and `0`. We must decide if `0.01` should be imported as `0`, or ignored.
3. **MOC/Auth Definitions:** OQ-02 and OQ-03 remain unresolved. We will use `"Authorized"` and `"Approved/Complete"` for the seeded data to match the PDF.
4. **Data Persistence:** Because we are a client-side architecture without a database, refreshing the browser clears all data. If we move from a "First-Use Workflow" to a "Maintenance Workflow", **we must implement LocalStorage persistence** so the user can open the app next week and continue editing the master dataset.

---

## Task 4: UI/UX Redesign Proposal

To support the new "Maintenance Workflow":

1. **Preload Baseline Data:** The application will initialize with the Week 40 baseline (from the JSON above).
2. **Local Persistence:** Implement `localStorage` to save the state automatically whenever `onStateChange` fires. Add a "Reset to Week 40 Baseline" button in case the user wants to start over.
3. **Workflow Change:** Users will open the app, see last week's data, increment the Reporting Week to `41`, edit the Plan/Actual table, edit specific jumper statuses (e.g., change `removalStatus` to `Yes` for resolved jumpers), and add only truly new jumpers.

---

## Stop and Wait for Review

The audit is complete and the mapping limitations are documented. 

**Before I proceed to code the LocalStorage persistence and preload the Week 40 Baseline data**, please review the findings above. Do you approve using the PDF's Week 40 data as the seeded baseline instead of the Excel file?

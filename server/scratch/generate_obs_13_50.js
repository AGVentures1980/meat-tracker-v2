const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const observations = [
    {
        num: "013",
        title: "THE AGGREGATE RECEIVING TRAP",
        headline: "THE AGGREGATE RECEIVING TRAP",
        body: [
            "Counting cartons does not verify protein weight.",
            "Distributors count on busy docks to skip scale checks.",
            "Unverified catch-weights lead to padded invoices.",
            "Fractions of weight lost compound into major EBITDA leaks."
        ],
        bottomStatement: "WE PAY FOR THE PALLET. WE LOSE IN THE BOXES.",
        closingStatement: "Protect margins where they enter the building. Weigh the box.",
        hashtags: ["#SupplyChain", "#EBITDA", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "If you are signing protein delivery sheets by counting boxes instead of weighing them, you are leaving gross margin on the dock.\n\nCatch-weight proteins—like tenderloins, ribeyes, and ribs—are billed to the decimal point. Yet, on a busy Friday morning delivery, the default operational behavior is speed: the clerk counts the boxes, checks them off the invoice, and signs the sheet.\n\n• Counting cartons does not verify actual net weight.\n• Distributors count on busy docks to skip physical scale checks.\n• Unverified catch-weights lead to systematically padded invoices.\n• Minor fractional weight losses compound into major EBITDA leaks.\n\nYour receiving dock is not just a shipping drop-point. It is a cash register that only flows outward. If you do not verify the weight of every box at the moment it crosses the threshold, you are paying for meat you never received."
    },
    {
        num: "014",
        title: "THE BUTCHER BLOCK LEAKAGE",
        headline: "THE BUTCHER BLOCK LEAKAGE",
        body: [
            "Knife skills directly determine yield margins.",
            "Trim variance is treated as kitchen waste rather than non-compliance.",
            "Subjective trimming hides supplier specification drift.",
            "Raw-to-trim yield tracking protects gross profits."
        ],
        bottomStatement: "KNIFE SKILLS DETERMINE GROSS MARGINS.",
        closingStatement: "Trim yield is a fabrication metric, not an unavoidable waste line.",
        hashtags: ["#YieldManagement", "#FoodCost", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Primal trim yield variations are too often accepted as an inevitable kitchen cost of doing business rather than what they actually are: supplier specification drift or butcher block non-compliance. When culinary staff fabricates tenderloins or ribeyes without rigorous scale-based tracking, ounces of premium profit slip directly into the trash bin.\n\n• Sub-optimal trimming behaviors go unnoticed without real-time tracking.\n• Supplier fat-cap variations are accepted without reclamation claims.\n• Subjective cutting styles create massive variance in portion yields.\n• Live fabrication tracking holds both cooks and distributors accountable.\n\nMargin protection is established at the butcher block by linking every primal cut to an active scale log, transforming raw inventory into audited portion yields."
    },
    {
        num: "015",
        title: "THE OVER-PORTIONING ILLUSION",
        headline: "THE OVER-PORTIONING ILLUSION",
        body: [
            "Over-portioning compensates for execution inconsistencies.",
            "Excessive plating is often used to mask service failures.",
            "Visual estimation degrades theoretical cost targets.",
            "Portion governance protects finished-goods EBITDA."
        ],
        bottomStatement: "UNMEASURED PORTIONING MASKS PROCESS DRIFT.",
        closingStatement: "Portion governance stabilizes margins and protects guest experience.",
        hashtags: ["#EBITDA", "#OperationalExcellence", "#HospitalityLeadership", "#RestaurantOperations", "#BRASA"],
        postCopy: "In high-volume restaurant operations, over-portioning is rarely a deliberate act of theft. More often, it is a compensation mechanism for process failure.\n\nWhen service times drag, or food quality is inconsistent, kitchen lines often over-portion premium ingredients to appease guests. It is an expensive operational shortcut that attempts to buy guest satisfaction at the expense of gross margin.\n\n• Over-portioning compensates for execution inconsistencies on the line.\n• Plate overloading is used to mask service latency or product quality issues.\n• Visual portioning by line staff degrades theoretical cost targets shift-by-shift.\n• True consistency is what guests value; portion sizes must be predictable."
    },
    {
        num: "016",
        title: "THE INVENTORY RECONCILIATION BIAS",
        headline: "THE INVENTORY RECONCILIATION BIAS",
        body: [
            "Systems reward paper reconciliation over physical validation.",
            "Count sheets are adjusted to align with theoretical models.",
            "Spreadsheets document historical variance but cannot block it.",
            "Data integrity begins at physical measurement."
        ],
        bottomStatement: "THE SYSTEM REWARDS RECONCILIATION OVER VALIDATION.",
        closingStatement: "Scale-locked inventory tracking establishes verified operational truth.",
        hashtags: ["#Accountability", "#InventoryControl", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "In multi-unit operations, inventory systems often suffer from a fundamental design flaw: they reward reconciliation rather than validation.\n\nWhen food cost variances occur, the operational bias is to align counts with theoretical expectations to avoid red flags. The spreadsheet matches the model, the audit is approved, but the physical margin leak remains uncorrected.\n\n• Theoretical alignment hides daily operational drift from corporate visibility.\n• Software databases record adjusted figures rather than physical reality.\n• Spreadsheets document historical variance but lack the power to prevent it.\n• Scale-locked weight logging provides the unalterable truth required for control."
    },
    {
        num: "017",
        title: "THE LOGISTICS BIAS ON THE DOCK",
        headline: "THE LOGISTICS BIAS ON THE DOCK",
        body: [
            "Docks are governed by speed and box count.",
            "Receiving is a financial transaction, not a shipping receipt.",
            "Unverified weights shift margin risk to the operator.",
            "Verification at the gate secures raw asset values."
        ],
        bottomStatement: "DOCKS ARE FINANCIAL CONTROL GATES.",
        closingStatement: "Verify weight and specification before signing the invoice.",
        hashtags: ["#SupplyChain", "#EBITDA", "#Logistics", "#RestaurantOperations", "#BRASA"],
        postCopy: "Receiving docks are traditionally managed for speed and box counts rather than weight accuracy and specification compliance. Re-signing a supplier invoice without weighing each box is a high-risk financial transaction that transfers all delivery variance directly to your food cost percentage.\n\n• Docks prioritize unloading speed over invoice accuracy.\n• Box counts are checked while actual net weights are ignored.\n• Unverified catch-weights lead to systematic supplier over-billing.\n• Inbound telemetry blocks short-shipment leakage before storage.\n\nEBITDA protection begins on the dock. Re-frame receiving as a financial transaction and enforce weight verification for every high-value box."
    },
    {
        num: "018",
        title: "THE REARVIEW P&L REVIEW",
        headline: "THE REARVIEW P&L REVIEW",
        body: [
            "Monthly financial statements act as operational autopsies.",
            "P&L reviews occur weeks after margins have leaked.",
            "EBITDA decay compounds during visibility delays.",
            "Margin protection requires real-time telemetry."
        ],
        bottomStatement: "MANAGING BY HISTORY IS A FINANCIAL AUTOPSY.",
        closingStatement: "Correct operational drift today; do not audit it next month.",
        hashtags: ["#EBITDA", "#HospitalityLeadership", "#Finance", "#RestaurantOperations", "#BRASA"],
        postCopy: "Reviewing last month's food cost performance in a P&L meeting is an operational autopsy. By the time leadership identifies a 2.5% protein variance, weeks of margin have already vanished. You cannot recover profit from food that has already been prepped, cooked, and consumed.\n\n• Monthly reporting creates a multi-week visibility lag.\n• Food cost anomalies are detected long after they occur.\n• Retrospective audits document losses instead of stopping them.\n• EBITDA protection requires active telemetry at the point of execution.\n\nProtecting margins requires real-time data flow from the kitchen floor, allowing operators to correct drift before it hits the general ledger."
    },
    {
        num: "019",
        title: "THE SUPERSAVER DISTRIBUTOR TRAP",
        headline: "THE SUPERSAVER DISTRIBUTOR TRAP",
        body: [
            "Low cost-per-pound contracts hide yield degradation.",
            "Discounted proteins often feature excess fat-caps or purge.",
            "Purchasing savings are lost during kitchen fabrication.",
            "Yield management determines true raw food costs."
        ],
        bottomStatement: "DISCOUNTED PRICE IS NOT CHEAP COST.",
        closingStatement: "True raw cost is determined on the butcher block, not the invoice.",
        hashtags: ["#YieldManagement", "#Procurement", "#FoodCost", "#RestaurantOperations", "#BRASA"],
        postCopy: "Purchasing departments often celebrate low cost-per-pound protein contracts without factoring in yield degradation. Buying raw meat with heavy fat-caps or high moisture content seems like a procurement win, but those savings disappear during kitchen trimming and portioning.\n\n• Bulk discounts frequently hide sub-standard yields.\n• Excessive fat and purge are paid for at prime protein rates.\n• Low-spec cuts require additional fabrication labor and trim loss.\n• Yield telemetry exposes the actual cost per usable ounce.\n\nTrue procurement efficiency is measured by verified kitchen yields. Ensure purchasing decisions are based on net portion yields rather than invoice list prices."
    },
    {
        num: "020",
        title: "THE COMPLIANCE DECAY CURVE",
        headline: "THE COMPLIANCE DECAY CURVE",
        body: [
            "Manual checklists lose execution compliance within weeks.",
            "Process adherence degrades without systematic warning gates.",
            "Operations drift back to habits of convenience.",
            "Locked terminals programmatically enforce execution standards."
        ],
        bottomStatement: "PROCESS STANDARDS REQUIRE PROGRAMMATIC ENFORCEMENT.",
        closingStatement: "Static checklists fail; scale-locked workflows protect margins.",
        hashtags: ["#Accountability", "#OperationalExcellence", "#Leadership", "#RestaurantOperations", "#BRASA"],
        postCopy: "Static checklists and operating manuals lose compliance within weeks of roll-out. Without continuous oversight, kitchen staff naturally drifts toward habits of convenience, leaving receiving docks and butcher blocks exposed to margin leakage.\n\n• Written procedures lack active enforcement mechanisms.\n• Operational compliance decays as rush periods occur.\n• Verbal coaching provides temporary, inconsistent correction.\n• Systematically locked terminals block operations when standards are bypassed.\n\nEBITDA protection requires hard-coded process standards that cannot be avoided, locking compliance directly into the physical workspace."
    },
    {
        num: "021",
        title: "THE WATER WEIGHT SCANDAL",
        headline: "THE WATER WEIGHT SCANDAL",
        body: [
            "Distributors inflate weight through moisture retention.",
            "Paying prime protein rates for water purge destroys EBITDA.",
            "Dock scales must verify net weight post-defrost.",
            "Telemetry verifies the actual protein delivered."
        ],
        bottomStatement: "DO NOT PAY PRIME PROTEIN RATES FOR WATER.",
        closingStatement: "Verify net dry weights to stop supplier moisture padding.",
        hashtags: ["#SupplyChain", "#EBITDA", "#FoodCost", "#RestaurantOperations", "#BRASA"],
        postCopy: "Many high-volume operators pay prime protein rates for water due to supplier moisture padding. Seafood and beef shipments are frequently packed with excess glaze or moisture retention chemicals, which turn into unusable purge during defrosting.\n\n• Excess moisture retention inflates supplier delivery weights.\n• Standard dock checks accept wet weight as actual protein weight.\n• Retrospective audits miss purge loss occurring in the prep kitchen.\n• Calibrated scale telemetry isolates net dry weight from delivery weights.\n\nProtecting margins requires verifying net dry weights at the dock and prep stations, ensuring you pay only for consumable protein assets."
    },
    {
        num: "022",
        title: "THE OVERRIDE WITHOUT CONSEQUENCE",
        headline: "THE OVERRIDE WITHOUT CONSEQUENCE",
        body: [
            "Warning alerts are bypassed if overrides lack friction.",
            "Accountability requires scale-locked proof and justification.",
            "Unmonitored manager overrides mask operational breakdowns.",
            "Override reporting is the core of process governance."
        ],
        bottomStatement: "A CONTROL GATE IS ONLY AS STRONG AS ITS FRICTION.",
        closingStatement: "Require visual verification for every manager override.",
        hashtags: ["#Accountability", "#OperationalExcellence", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "A warning alert system is useless if it can be bypassed without consequence. When managers override weight warnings or portion discrepancies with a single tap, the control gate is reduced to passive background noise.\n\n• Fast-paced shifts lead to default warning overrides.\n• Unjustified overrides hide inventory and receiving leaks.\n• Accountability requires scale-locked visual evidence and comments.\n• Override reporting isolates compliance gaps by unit and shift.\n\nOperational governance requires putting friction back into the override process, ensuring every deviation from standard is logged and justified."
    },
    {
        num: "023",
        title: "THE EXCEL COMFORT ZONE",
        headline: "THE EXCEL COMFORT ZONE",
        body: [
            "Aggregated spreadsheet summaries mask unit-level yield drift.",
            "Excel files present clean grids that hide physical chaos.",
            "Data aggregation smoothes out critical variance anomalies.",
            "EBITDA protection requires raw, unadjusted scale telemetry."
        ],
        bottomStatement: "SPREADSHEETS SMOOTH OUT CRITICAL OPERATIONS CHAOS.",
        closingStatement: "Move from aggregated spreadsheets to immutable scale logs.",
        hashtags: ["#EBITDA", "#Finance", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Corporate directors often manage from the safety of the Excel comfort zone, relying on aggregated reports that smooth out unit-level operational drift. A clean monthly spreadsheet can mask significant daily variances at the dock and prep blocks.\n\n• Aggregated figures hide extreme store-level food cost spikes.\n• Spreadsheets are easily manipulated to show expected results.\n• Counting inventory on paper lacks physical audit trails.\n• Protecting margins requires live, direct telemetry from kitchen scales.\n\nBreak free from retrospective spreadsheets. Establish direct, unmanipulated telemetry from the point of execution to get the real operational truth."
    },
    {
        num: "024",
        title: "THE MYTH OF THE INDEPENDENT CHEF",
        headline: "THE MYTH OF THE INDEPENDENT CHEF",
        body: [
            "Subjective kitchen execution is an expensive operational luxury.",
            "Culinary standards must be governed by physical telemetry.",
            "Artistry belongs in recipe design, not portion weight.",
            "Standardized portioning protects raw material EBITDA."
        ],
        bottomStatement: "ARTISTRY IS FOR RECIPES. MEASUREMENT IS FOR MARGINS.",
        closingStatement: "Subjective portioning is a high-cost luxury; enforce physical limits.",
        hashtags: ["#HospitalityLeadership", "#OperationalExcellence", "#FoodCost", "#RestaurantOperations", "#BRASA"],
        postCopy: "Subjective portioning in high-volume operations is an expensive operational luxury. While culinary artistry belongs in menu design and recipe creation, portion sizes must be strictly governed by physical measurement, not chef intuition.\n\n• Subjective plate portioning creates massive food cost variance.\n• Cooks bypass scales during busy rushes to maintain speed.\n• Guest experience is compromised by inconsistent plate presentations.\n• Interactive scale gates enforce portion consistency on every plate.\n\nProtecting EBITDA requires removing portion sizes from human estimation and locking them to calibrated scales at the point of plating."
    },
    {
        num: "025",
        title: "THE CATCH-WEIGHT LEAKAGE",
        headline: "THE CATCH-WEIGHT LEAKAGE",
        body: [
            "Paying average invoice weights leads to over-billing.",
            "Distributors count on average weights to conceal shortages.",
            "Inbound catch-weight variance directly erodes gross margins.",
            "Dock scale verification captures actual delivery weights."
        ],
        bottomStatement: "AVERAGE INVOICE WEIGHTS HIDE SYSTEMATIC SUPPLIER SHORTFALLS.",
        closingStatement: "Stop paying estimated invoices; pay only for verified weights.",
        hashtags: ["#SupplyChain", "#EBITDA", "#FoodCost", "#RestaurantOperations", "#BRASA"],
        postCopy: "Paying supplier invoices based on estimated or average catch-weights is a major source of margin erosion. Distributors consistently round up weights on invoices, counting on restaurant receiving teams to sign for boxes without weighing them.\n\n• Billed weights regularly exceed actual delivery weights.\n• Average catch-weights hide systematic supplier billing errors.\n• Paper logs lack the accuracy needed to challenge invoice amounts.\n• Dock-scale telemetry automates the supplier credit request process.\n\nSecure your margins by weighing every inbound catch-weight primal box, ensuring you pay only for the physical meat delivered to your dock."
    },
    {
        num: "026",
        title: "THE DRIFT COMPONENT IN LABOR",
        headline: "THE DRIFT COMPONENT IN LABOR",
        body: [
            "Sloppy prep procedures waste both food and labor.",
            "Inefficient butcher blocks degrade yields and slow throughput.",
            "Yield telemetry training improves kitchen productivity.",
            "Standardized workflows reduce labor and ingredient costs."
        ],
        bottomStatement: "YIELD DRIFT WASTES BOTH INGREDIENTS AND LABOR HOURS.",
        closingStatement: "Standardize fabrication workflows to optimize food and labor yield.",
        hashtags: ["#LaborManagement", "#EBITDA", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Operational drift at the prep table is a double loss, wasting both raw ingredients and kitchen labor hours. Inefficient, unstandardized cutting procedures slow down prep speeds while causing significant yield loss.\n\n• Poor fabrication habits increase prep times and waste.\n• Lack of training leads to inconsistent portion quality.\n• Yield telemetry identifies prep bottlenecks and underperforming cutters.\n• Calibrated portion guides improve chef throughput and yield consistency.\n\nMaximize your EBITDA by tracking prep speeds alongside fabrication yields, optimizing the productivity of both your staff and your ingredients."
    },
    {
        num: "027",
        title: "THE SOVEREIGN SCALE PRINCIPLE",
        headline: "THE SOVEREIGN SCALE PRINCIPLE",
        body: [
            "Every high-value protein must pass through a calibrated scale.",
            "Unmeasured ingredients represent unmanaged EBITDA risk.",
            "Scale-locked controls eliminate portion size estimation.",
            "The scale is the ultimate operational authority."
        ],
        bottomStatement: "THE SCALE IS THE ULTIMATE OPERATIONAL AUTHORITY.",
        closingStatement: "Establish scale-locked checkpoints at every transition point.",
        hashtags: ["#OperationalExcellence", "#Accountability", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "Any high-value protein portion sent to the kitchen line without passing through a calibrated digital scale represents unmanaged margin risk. The scale must be established as the ultimate authority on the kitchen floor, leaving no room for human estimation.\n\n• Ounce discrepancies at plating add up to significant weekly costs.\n• Kitchen staff bypass portion scales to maintain speed.\n• Guest satisfaction suffers from inconsistent portion sizes.\n• Calibrated digital scales enforce portion weight limits.\n\nProtect your food cost percentage by enforcing the Sovereign Scale Principle, ensuring every portion is verified before it leaves the kitchen."
    },
    {
        num: "028",
        title: "THE PURGE COEFFICIENT",
        headline: "THE PURGE COEFFICIENT",
        body: [
            "Cooler temperature variance accelerates moisture purge.",
            "Improper meat storage destroy product yields before prep.",
            "Temperature telemetry isolates storage loss from prep errors.",
            "Consistent cold chains protect protein weight and quality."
        ],
        bottomStatement: "STORAGE ENVIROMENT DIRECTLY INFLUENCES YIELD.",
        closingStatement: "Track cooler temperature variance to prevent moisture loss.",
        hashtags: ["#SupplyChain", "#EBITDA", "#YieldManagement", "#RestaurantOperations", "#BRASA"],
        postCopy: "Temperature variance in storage coolers accelerates protein moisture purge, causing yield loss before prep work even begins. When raw meat is stored in inconsistent conditions, it loses weight through evaporation and purge.\n\n• Fluctuating cooler temperatures increase meat moisture loss.\n• Improper primal rotation leads to excessive purge weight loss.\n• Storage purge loss is often misidentified as butcher block error.\n• Continuous temperature telemetry protects protein weight and quality.\n\nMaintain raw yield integrity by verifying cold chain consistency in your coolers, protecting your proteins from storage weight loss."
    },
    {
        num: "029",
        title: "THE COLLUSION RISK AT THE DOCK",
        headline: "THE COLLUSION RISK AT THE DOCK",
        body: [
            "Paper receiving logs rely on unverified human trust.",
            "Clerks and drivers can easily manipulate handwritten sheets.",
            "Immutable scale logs remove receiving dock collusion risks.",
            "Digital audit trails secure inbound raw materials."
        ],
        bottomStatement: "PAPER RECEIVING LOGS LACK DATA INTEGRITY.",
        closingStatement: "Replace hand-written receiving logs with automated digital records.",
        hashtags: ["#Security", "#Accountability", "#SupplyChain", "#RestaurantOperations", "#BRASA"],
        postCopy: "Paper-based receiving processes are highly vulnerable to manipulation, relying entirely on the unchecked trust of a single clerk and the distributor's driver. Handwritten logs allow short-shipped products to be accepted and paid for without verification.\n\n• handwritten invoices lack proof of actual delivery weights.\n• Receiving checks are easily falsified during busy delivery times.\n• Supplier delivery shortages go unnoticed without scale validation.\n• Automated digital scale logs create an unalterable audit trail.\n• Digital receiving records ensure billing accuracy for every box.\n\nSecure your supply chain by removing manual entry from the dock, using scale-locked digital records to verify every invoice."
    },
    {
        num: "030",
        title: "THE SPECIFICATION DRIFT",
        headline: "THE SPECIFICATION DRIFT",
        body: [
            "Supplier portion sizes drift toward their margins, not yours.",
            "Packers increase fat caps and moisture to boost margins.",
            "Ongoing yield telemetry identifies supplier specification drift.",
            "Verify product spec compliance to recover supplier credits."
        ],
        bottomStatement: "SUPPLIERS DRIFT TOWARD THEIR MARGINS, NOT YOURS.",
        closingStatement: "Use yield telemetry to audit and enforce supplier compliance.",
        hashtags: ["#SupplyChain", "#Procurement", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "Over time, protein packers slip in sub-primal cuts with heavier fat caps or irregular muscle density. Ongoing yield telemetry identifies supplier specification drift before the contract ends.\n\n• Protein packers consistently test specification tolerances.\n• Excess fat and trim weight are invoiced at prime meat prices.\n• Retrospective food cost checks fail to isolate supplier errors.\n• Kitchen yield logs provide the proof needed to enforce specifications.\n\nAudit supplier specifications at the prep table using yield telemetry, protecting your kitchen from paying premium prices for excess fat and trim."
    },
    {
        num: "031",
        title: "THE THEORETICAL INVENTORY ILLUSION",
        headline: "THE THEORETICAL INVENTORY ILLUSION",
        body: [
            "Theoretical food cost models assume perfect kitchen execution.",
            "Aggregated usage reports mask physical variance sources.",
            "Real-time scale logs separate yield loss from theft.",
            "Telemetry replaces theoretical estimates with physical facts."
        ],
        bottomStatement: "THEORETICAL MODELS ASSUME PERFECT EXECUTION.",
        closingStatement: "Replace theoretical cost estimates with actual physical telemetry.",
        hashtags: ["#EBITDA", "#InventoryControl", "#Finance", "#RestaurantOperations", "#BRASA"],
        postCopy: "Managing by theoretical food cost models assumes perfect kitchen execution, masking the actual sources of variance on the floor. Without physical telemetry, operators can only guess whether food cost spikes are caused by receiving errors, prep waste, or sales theft.\n\n• Theoretical inventory targets hide real operational variances.\n• End-of-period physical counts mask daily yield fluctuations.\n• Theft and fabrication errors are mixed in the same cost lines.\n• Interactive scale logs isolate and measure actual physical loss.\n\nStop guessing where your margins are leaking. Use real-time scale telemetry to isolate receiving, prep, and sales variances."
    },
    {
        num: "032",
        title: "THE VIP PORTION SPIKE",
        headline: "THE VIP PORTION SPIKE",
        body: [
            "Kitchen staff over-portions premium items for VIP service.",
            "Peak-shift over-portioning creates significant cost spikes.",
            "Consistent portion weight standards protect plate margins.",
            "Interactive scale gates enforce portion compliance on every shift."
        ],
        bottomStatement: "VIP SERVICE SHOULD NOT COMPROMISE OPERATIONAL STANDARDS.",
        closingStatement: "Enforce portion weight standards on every plate, regardless of guest.",
        hashtags: ["#OperationalExcellence", "#EBITDA", "#FoodCost", "#RestaurantOperations", "#BRASA"],
        postCopy: "Kitchen teams often over-portion premium proteins for VIP tables or during high-volume shifts, creating unaccounted-for food cost spikes. While guest satisfaction is critical, it must be achieved through consistency, not unmeasured portions.\n\n• Carver teams increase portion sizes for special guests.\n• Peak-shift rush periods lead to loose portion control.\n• Visual estimation at the carve station erodes plate margins.\n• Scale-locked portion gates enforce portion compliance on every plate.\n\nMaintain food cost stability by requiring portion weight verification for all plates, protecting your margins on every shift."
    },
    {
        num: "033",
        title: "THE OVER-PURCHASING CYCLE",
        headline: "THE OVER-PURCHASING CYCLE",
        body: [
            "Underestimating trim loss leads to emergency ordering.",
            "Inaccurate yield calculations result in excess working capital.",
            "Over-ordering raw protein increases food waste risks.",
            "Precise yield metrics stabilize the kitchen supply chain."
        ],
        bottomStatement: "INACCURATE YIELD ESTIMATES LEAD TO CAPITAL TIE-UPS.",
        closingStatement: "Use historical yield telemetry to stabilize purchasing patterns.",
        hashtags: ["#SupplyChain", "#EBITDA", "#Procurement", "#RestaurantOperations", "#BRASA"],
        postCopy: "Underestimating trim loss forces kitchen managers to over-order raw protein to prevent shortages, tying up capital in inventory and increasing waste risks. Inaccurate yield calculations create a cycle of emergency orders and high shipping costs.\n\n• Kitchen managers over-order to compensate for unknown yields.\n• Excess inventory increases the risk of shelf-life expiration.\n• Emergency deliveries disrupt dock operations and increase freight costs.\n• Yield telemetry provides the data needed for precise ordering.\n\nBreak the cycle of over-purchasing by using actual kitchen yield data to calculate raw ingredient requirements."
    },
    {
        num: "034",
        title: "THE MOISTURE LOSS IN COOKING",
        headline: "THE MOISTURE LOSS IN COOKING",
        body: [
            "Grill station discipline determines final plate weight.",
            "Inconsistent cooking temperatures accelerate protein shrinkage.",
            "Time-temperature standards protect product juiciness and yield.",
            "Grill station telemetry tracks finished portion weight."
        ],
        bottomStatement: "GRILL STATION DISCIPLINE DETERMINES PRODUCT SHRINKAGE.",
        closingStatement: "Standardize grill temperatures to protect finished portion yields.",
        hashtags: ["#OperationalExcellence", "#YieldManagement", "#KitchenOps", "#RestaurantOperations", "#BRASA"],
        postCopy: "Grill station discipline directly determines final plate weight, with inconsistent cooking temperatures causing unnecessary protein shrinkage. Overcooking premium steaks by even a few degrees drys out the meat while reducing finished yields.\n\n• Loose temperature controls increase cook shrinkage loss.\n• Over-cooked meats result in customer rejects and waste.\n• Standardized time-temperature rules protect product juiciness.\n• Cook weight telemetry identifies temperature control issues.\n\nProtect your portion yields at the grill station by enforcing temperature standards, keeping the moisture in your proteins and the profits in your pockets."
    },
    {
        num: "035",
        title: "THE TRACEABILITY MANDATE",
        headline: "THE TRACEABILITY MANDATE",
        body: [
            "GS1-128 barcode tracing is a margin control asset.",
            "Tracing barcodes verifies protein yields by supplier lot.",
            "Regulatory compliance tools help isolate operational leaks.",
            "Link inventory tracking to physical scale logs."
        ],
        bottomStatement: "TRACEABILITY IS NOT JUST FOR COMPLIANCE.",
        closingStatement: "Link barcode data to scale logs to track lot yields.",
        hashtags: ["#SupplyChain", "#EBITDA", "#Technology", "#RestaurantOperations", "#BRASA"],
        postCopy: "Implementing GS1-128 barcode tracing is often viewed as a regulatory burden, but it is actually a powerful tool for margin control. Scanning barcodes at the dock and prep stations allows operators to link yield metrics back to specific supplier lots.\n\n• Barcode scanning automates receiving data collection.\n• Lot yield tracking identifies underperforming supplier shipments.\n• Traceability records protect kitchens from batch quality errors.\n• Scale-locked barcode data ensures accuracy in inventory audits.\n\nUse your traceability systems to protect margins, turning a compliance cost into a source of operational intelligence."
    },
    {
        num: "036",
        title: "THE BUTCHER CALIBRATION GAP",
        headline: "THE BUTCHER CALIBRATION GAP",
        body: [
            "Individual butchers have different yield footprints.",
            "Without yield tracking, operators cannot locate line leaks.",
            "Performance scorecards isolate training needs at prep.",
            "Standardized cutting styles protect gross margin metrics."
        ],
        bottomStatement: "INDIVIDUAL CUTTERS HAVE INDIVIDUAL MARGIN IMPACTS.",
        closingStatement: "Track individual yield metrics to isolate training opportunities.",
        hashtags: ["#Training", "#Accountability", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "Without individual yield tracking, high-volume operators cannot identify which butchers are trimming away margins at the prep table. Individual cutting styles create significant differences in trim weight and portion yields.\n\n• Yield variance is often blamed on general meat quality.\n• Underperforming cutters escape notice without individual logs.\n• Performance scorecards isolate training needs at the prep table.\n• Yield tracking encourages friendly competition and standardizes style.\n\nCalibrate your butcher team by tracking individual fabrication yields, ensuring every knife operator protects your protein margins."
    },
    {
        num: "037",
        title: "THE COLD CHAIN EXPOSURE",
        headline: "THE COLD CHAIN EXPOSURE",
        body: [
            "Temperature breaches on the dock destroy protein yields.",
            "Leaving deliveries on warm docks accelerates moisture purge.",
            "Inbound temperature verification is a margin control gate.",
            "Continuous cold chain tracking protects raw food margins."
        ],
        bottomStatement: "TEMPERATURE BREACHES ON THE DOCK ACCELERATE YIELD LOSS.",
        closingStatement: "Verify inbound temperatures at receiving to prevent moisture purge.",
        hashtags: ["#SupplyChain", "#EBITDA", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Leaving protein deliveries on warm docks before cooler storage accelerates moisture purge and spoilage, causing yield loss before prep work even begins. Inbound temperature verification is a margin protection control.\n\n• Warm dock environments accelerate raw meat moisture purge.\n• Delayed cooler storage reduces raw protein shelf life.\n• Manual temperature checks are easily skipped during rush times.\n• Automated temp sensors verify cold chain compliance at receiving.\n\nProtect your protein assets by enforcing temperature checks at receiving, blocking warm deliveries before they hit your coolers."
    },
    {
        num: "038",
        title: "THE INVOICE DISCREPANCY PARADOX",
        headline: "THE INVOICE DISCREPANCY PARADOX",
        body: [
            "Accounting departments pay invoices without checking weights.",
            "Unchecked invoices lead to systematic distributor over-billing.",
            "Dock scale telemetry automates credit request creation.",
            "Verify physical delivery weights to protect cash flow."
        ],
        bottomStatement: "UNCHECKED INVOICES ARE DIRECT CASH FLOW LEAKAGE.",
        closingStatement: "Link dock scales to accounts payable to automate credit claims.",
        hashtags: ["#Finance", "#EBITDA", "#AccountsPayable", "#RestaurantOperations", "#BRASA"],
        postCopy: "Most corporate accounting departments pay supplier invoices based on printed weights, without verifying what actually arrived on the dock. Paying unchecked invoices leads to systematic supplier over-billing, eroding gross margins.\n\n• Accounts payable processes printed invoices automatically.\n• Inbound receiving weight errors go unnoticed by accounting.\n• Scale-locked weight logging provides the proof needed for credits.\n• Automated credit requests turn scale checks into immediate cash flow.\n\nStop paying for product you did not receive. Link dock scales to accounts payable to automate credit requests and protect cash flow."
    },
    {
        num: "039",
        title: "THE FAT CAP TAX",
        headline: "THE FAT CAP TAX",
        body: [
            "Distributors consistently package meats at fat tolerance limits.",
            "Paying premium meat prices for fat is operational failure.",
            "Primal trim yields expose supplier fat-cap padding.",
            "Enforce contract fat specifications to recover margins."
        ],
        bottomStatement: "DO NOT PAY PREMIUM PROTEIN PRICES FOR EXCESS FAT.",
        closingStatement: "Track trim weights to audit and enforce supplier fat limits.",
        hashtags: ["#Procurement", "#YieldManagement", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "Supplier specifications allow a fat cap tolerance. Packers consistently hit the maximum limit of that tolerance, forcing kitchens to pay beef prices for fat. Yield telemetry exposes this tax.\n\n• Packers maximize fat cap thicknesses to increase their profits.\n• Excess fat must be trimmed off, reducing usable portion yields.\n• Standard dock checks miss internal fat cap variations.\n• Butcher block yield tracking audits supplier specification compliance.\n\nStop paying premium prices for fat. Track trim weights to audit supplier specifications and enforce contract fat limits."
    },
    {
        num: "040",
        title: "THE TRIPLE-POINT RECONCILIATION",
        headline: "THE TRIPLE-POINT RECONCILIATION",
        body: [
            "Reconcile dock receiving, prep yield, and POS sales.",
            "Connecting these points creates a closed chain of custody.",
            "Isolating variance sources prevents finger-pointing.",
            "Unified telemetry makes margin leaks impossible to hide."
        ],
        bottomStatement: "CLOSED-LOOP TELEMETRY SECURES CHAIN OF CUSTODY.",
        closingStatement: "Link dock, prep, and sales logs to eliminate margin blindspots.",
        hashtags: ["#EBITDA", "#Accountability", "#Finance", "#RestaurantOperations", "#BRASA"],
        postCopy: "Reconciling inbound invoice weight against butcher yield and guest sales creates a closed-loop chain of custody that makes margin leakage impossible to hide. Linking these three transaction points allows operators to pinpoint exactly where variance occurs.\n\n• Separate data systems create blindspots between dock and plate.\n• Inventory systems miss variances occurring between kitchen stations.\n• Triple-Point Reconciliation isolates receiving, prep, and portion leaks.\n• Scale-locked digital audit trails ensure data consistency.\n\nSecure your margins by linking dock scales, prep scales, and POS sales logs, creating an unalterable operational truth layer."
    },
    {
        num: "041",
        title: "THE MANUAL ENTRY OVERHEAD",
        headline: "THE MANUAL ENTRY OVERHEAD",
        body: [
            "Manual data entry on kitchen computers creates typing errors.",
            "Clerks are paid to execute operations, not type data.",
            "Automated scale integration removes administrative overhead.",
            "Direct data transmission secures operational data integrity."
        ],
        bottomStatement: "MANUAL DATA ENTRY WASTES LABOR AND DEGRADES ACCURACY.",
        closingStatement: "Remove keyboard entry from the kitchen; automate scale logs.",
        hashtags: ["#Technology", "#EBITDA", "#LaborManagement", "#RestaurantOperations", "#BRASA"],
        postCopy: "Manual data entry on kitchen computers creates typing errors and wastes labor hours. Automated scale and barcode integration removes administrative overhead and secures data integrity.\n\n• Clerks skip data entry tasks during busy rush periods.\n• Typing errors lead to incorrect inventory and cost reports.\n• Administrative work takes managers away from floor supervision.\n• Cellular scale integration automates data collection at execution.\n\nOptimize kitchen labor by removing manual data entry, using automated scale logs to capture clean operational data."
    },
    {
        num: "042",
        title: "THE DECAY OF TRADITIONAL STANDARDS",
        headline: "THE DECAY OF TRADITIONAL STANDARDS",
        body: [
            "Static recipe binders and training sheets lose compliance.",
            "recipe sheets do not prevent daily operational drift.",
            "Interactive terminals guide butchers through specs.",
            "Reinforcing standards at prep protects yield consistency."
        ],
        bottomStatement: "STATIC BINDERS DO NOT PREVENT DAILY DRIFT.",
        closingStatement: "Use interactive scale terminals to guide and verify prep standards.",
        hashtags: ["#Training", "#OperationalExcellence", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "Static recipe binders and training sheets do not prevent daily operational drift. Interactive scale terminals guide butchers through portion specs, reinforcing standards at every cut.\n\n• Written training manuals are rarely reviewed by busy staff.\n• Prep styles drift over time without continuous feedback.\n• Visual guides on scale terminals show portion targets dynamically.\n• Real-time feedback reinforces specifications at the prep table.\n\nEnforce your brand standards by replacing paper recipe guides with interactive scale screens, securing consistency for every portion."
    },
    {
        num: "043",
        title: "THE PILOT AS DIAGNOSTIC TOOL",
        headline: "THE PILOT AS DIAGNOSTIC TOOL",
        body: [
            "Do not commit to hardware rollouts without store baselines.",
            "A silent baseline captures natural operational variance.",
            "Pilot assessments expose exactly where EBITDA leaks.",
            "Use diagnostic data to calculate hardware investment returns."
        ],
        bottomStatement: "MEASURE BASLELINE VARIANCE BEFORE COMMITTING CAPITAL.",
        closingStatement: "Use a 30-day assessment to build a data-driven rollout plan.",
        hashtags: ["#Finance", "#EBITDA", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Committing capital to enterprise-wide hardware deployments without store-level diagnostic data is a high-risk gamble. A silent 30-day baseline pilot captures the true natural operational variance before staff modifies behavior.\n\n• Rollouts fail without store-level alignment and proof.\n• Silent baseline weeks capture the actual size of the margin leak.\n• Diagnostic reports identify high-value recovery opportunities.\n• Pilot data provides the financial justification for rollouts.\n\nVerify the return on investment before deploying hardware. Use a structured 30-day pilot to build a data-driven expansion plan."
    },
    {
        num: "044",
        title: "THE CONTRACT INTEGRITY VERIFICATION",
        headline: "THE CONTRACT INTEGRITY VERIFICATION",
        body: [
            "Corporate purchasing negotiates pricing based on yields.",
            "Purchasing agreements require real-time validation at dock.",
            "Supplier delivery quality tiers must be physically audited.",
            "Dock-scale telemetry verifies that deliveries match contracts."
        ],
        bottomStatement: "PURCHASING AGREEMENTS REQUIRE DOCK-LEVEL VERIFICATION.",
        closingStatement: "Verify that physical deliveries match corporate pricing tiers.",
        hashtags: ["#Procurement", "#SupplyChain", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "Corporate purchasing departments spend months negotiating protein pricing agreements based on specific quality tiers. However, without dock-level verification, operators have no way of knowing whether the physical meat delivered matches the contract.\n\n• Packers substitute lower-spec cuts to manage their inventory.\n• Unverified quality tiers lead to paying premium prices for low-spec cuts.\n• Paper logs do not verify fat-cap or yield specifications.\n• Dock-scale telemetry provides the proof needed to verify contracts.\n\nEnsure purchasing contracts are honored. Use dock-scale telemetry to verify that what was delivered is what was negotiated."
    },
    {
        num: "045",
        title: "THE SUPERVISOR OVERRIDE CORRELATION",
        headline: "THE SUPERVISOR OVERRIDE CORRELATION",
        body: [
            "Tracking manager override codes identifies compliance decay.",
            "High override frequencies indicate operational bypasses.",
            "Default overrides hide receiving and portion leaks.",
            "Override analytics highlight training and process gaps."
        ],
        bottomStatement: "HIGH OVERRIDE FREQUENCIES INDICATE PROCESS DRIFT.",
        closingStatement: "Monitor override analytics to identify stores bypassing controls.",
        hashtags: ["#Accountability", "#OperationalExcellence", "#EBITDA", "#RestaurantOperations", "#BRASA"],
        postCopy: "Tracking manager override codes identifies stores where operators bypass control gates instead of addressing operational issues. Override reporting enforces corporate compliance.\n\n• High override counts suggest staff is ignoring warning gates.\n• Bypassed checks allow short-weight deliveries to be accepted.\n• Override reporting isolates compliance issues by store and manager.\n• Accountability metrics encourage managers to enforce standards.\n\nEnforce your operational control gates by monitoring manager override patterns, ensuring your team is correcting problems instead of hiding them."
    },
    {
        num: "046",
        title: "THE PORTION VARIANCE COST",
        headline: "THE PORTION VARIANCE COST",
        body: [
            "Uneven portion cuts lead to inconsistent cooking rates.",
            "Visual estimation at prep causes portion weight variances.",
            "Precision portion scales ensure every plate meets weight specs.",
            "Consistent steak thickness is as critical as weight."
        ],
        bottomStatement: "STEAK THICKNESS IS AS CRITICAL AS PORTION WEIGHT.",
        closingStatement: "Standardize portion cuts to ensure consistent cooking and yield.",
        hashtags: ["#OperationalExcellence", "#FoodCost", "#YieldManagement", "#RestaurantOperations", "#BRASA"],
        postCopy: "Inconsistent portion thickness leads to uneven cooking rates, kitchen waste, and guest dissatisfaction. Precision portion scales ensure every plate meets operational quality and weight specs.\n\n• Visual cutting styles create inconsistent steak shapes.\n• Inconsistent cuts cook at different speeds on the line.\n• Overcooked or undercooked portions are rejected by guests.\n• Precision portion scales ensure every cut is identical.\n\nStabilize kitchen execution and guest experience by standardizing portion thickness at the prep block."
    },
    {
        num: "047",
        title: "THE WASTE LOG EXPOSURE",
        headline: "THE WASTE LOG EXPOSURE",
        body: [
            "Self-reported waste logs are systematically incomplete.",
            "Kitchen staff rarely logs every dropped portion or bad cut.",
            "Calibrated weight checks capture actual kitchen loss.",
            "True waste metrics require scale-locked reconciliation."
        ],
        bottomStatement: "SELF-REPORTED WASTE LOGS HIDE ACTUAL LOSS.",
        closingStatement: "Replace manual waste logs with scale-locked weight reconciliations.",
        hashtags: ["#Accountability", "#EBITDA", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Kitchen staff rarely logs every dropped portion or incorrect cut. Calibrated weight reconciliation captures the true difference between prep output and sales, exposing unlogged loss.\n\n• Manual waste logging is skipped during busy shift rushes.\n• Unlogged kitchen waste hides operational and portion issues.\n• Self-reported data is highly prone to human error and omission.\n• Scale-locked weight checks measure actual kitchen loss.\n\nExpose hidden waste in your kitchen. Use scale-locked reconciliations to capture the actual variance between prep and sales."
    },
    {
        num: "048",
        title: "THE DISTRIBUTOR ADJUSTMENT CREDIT",
        headline: "THE DISTRIBUTOR ADJUSTMENT CREDIT",
        body: [
            "Suppliers count on receiving teams to overlook shortfalls.",
            "Unverified delivery weights are invoice margins lost.",
            "Scale-locked weight logs provide proof for credits.",
            "Automated weight audits recover supplier credits."
        ],
        bottomStatement: "SHORT-SHIPMENTS ARE A DISTRIBUTOR PROFIT CENTER.",
        closingStatement: "Verify every box weight at delivery to claim distributor credits.",
        hashtags: ["#SupplyChain", "#EBITDA", "#Finance", "#RestaurantOperations", "#BRASA"],
        postCopy: "Suppliers count on receiving teams to overlook minor weight discrepancies. Scale-locked weight logging provides the auditable proof needed to claim credits.\n\n• Short-weight boxes add up to significant supplier over-billing.\n• handwritten invoices lack the proof needed to claim credits.\n• Distributors process adjustments only when presented with data.\n• Scale-locked weight logs automate credit request creation.\n\nProtect your cash flow. Verify every inbound box weight on a calibrated dock scale to claim your distributor credits."
    },
    {
        num: "049",
        title: "THE REGIONAL DRIFT ANOMALY",
        headline: "THE REGIONAL DRIFT ANOMALY",
        body: [
            "Compare yield performance between regions to find drift.",
            "Operating standards drift differently across regional units.",
            "Audit regional supply chain yields to locate local variances.",
            "Regional performance metrics establish best practice models."
        ],
        bottomStatement: "OPERATING STANDARDS DRIFT DIFFERENTLY ACROSS REGIONS.",
        closingStatement: "Compare regional yield performance to identify best practices.",
        hashtags: ["#Leadership", "#Accountability", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Operating standards drift differently across regions, with local management styles and distributor networks creating unique yield patterns. Comparing regional yield performance allows operators to locate local variances and supply chain issues.\n\n• Regional yield variations hide underperforming store clusters.\n• Local distributors deliver different average fat-cap specs.\n• Standard financial audits fail to isolate regional operational drift.\n• Regional yield metrics highlight training and supply chain needs.\n\nAlign your regional operations by comparing yield performance across territories, establishing clear operational best practices."
    },
    {
        num: "050",
        title: "THE EBITDA PROTECTION MINDSET",
        headline: "THE EBITDA PROTECTION MINDSET",
        body: [
            "Profitability is protected ounce by ounce, shift by shift.",
            "Operations do not lose margins in single massive events.",
            "EBITDA protection requires daily physical verification.",
            "Telemetry is the foundation of operational discipline."
        ],
        bottomStatement: "PROFITABILITY IS PROTECTED ONE OUNCE AT A TIME.",
        closingStatement: "EBITDA protection is a daily operational discipline, not a monthly audit.",
        hashtags: ["#EBITDA", "#Leadership", "#OperationalExcellence", "#RestaurantOperations", "#BRASA"],
        postCopy: "Real restaurant leadership understands that high-volume operations do not lose profitability in single massive events. EBITDA protection is a discipline of physical verification practiced at every shift.\n\n• Profitability leaks out in ounces, not in truckloads.\n• Monthly spreadsheet reviews are too late to stop the bleed.\n• Long-term success requires daily scale-locked controls.\n• Operational telemetry is the foundation of kitchen discipline.\n\nEmbrace the EBITDA Protection Mindset, enforcing physical verification at every receiving dock and prep station."
    }
];

function getHtmlTemplate(num, title, bodyPoints, bottomStatement, closingStatement) {
    const bulletPointsHtml = bodyPoints.map(point => `      <div class="bullet-point">${point}</div>`).join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BRASA FIELD OBSERVATION #${num}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1080px;
      height: 1080px;
      background-color: #000000;
      color: #ffffff;
      padding: 80px 75px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Header styling */
    .header-block {
      font-size: 24px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #ffffff;
      margin-bottom: 25px;
    }

    /* Title styling */
    .title-block {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 50px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.15;
      margin-bottom: 25px;
      color: #ffffff;
    }

    /* Divider line */
    .gold-divider {
      width: 100%;
      height: 2px;
      background-color: #C8A44D;
      margin-bottom: 50px;
    }

    /* Body section */
    .body-section {
      display: flex;
      flex-direction: column;
      gap: 32px;
      flex-grow: 1;
      margin-bottom: 45px;
    }
    .bullet-point {
      font-size: 28px;
      line-height: 1.45;
      color: #ffffff;
      padding-left: 20px;
      position: relative;
      font-weight: 400;
    }
    .bullet-point::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #ffffff;
    }

    /* Insight Box */
    .insight-box {
      border: 3px solid #C8A44D;
      background-color: transparent;
      padding: 30px 40px;
      text-align: center;
      margin-bottom: 45px;
    }
    .insight-text {
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 1px;
      line-height: 1.35;
      text-transform: uppercase;
      color: #ffffff;
    }

    /* Closing Statement */
    .closing-statement {
      font-size: 29px;
      font-weight: 500;
      text-align: center;
      line-height: 1.4;
      color: #ffffff;
      margin-bottom: 50px;
    }

    /* Footer styling */
    .footer-divider {
      width: 100%;
      height: 1.5px;
      background-color: #C8A44D;
      margin-bottom: 20px;
    }
    .footer-block {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 22px;
      color: #ffffff;
      font-weight: 400;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>

  <div>
    <div class="header-block">BRASA FIELD OBSERVATION #${num}</div>
    <div class="title-block">${title}</div>
    <div class="gold-divider"></div>
    
    <div class="body-section">
\n${bulletPointsHtml}
    </div>
  </div>

  <div>
    <div class="insight-box">
      <div class="insight-text">
        ${bottomStatement}
      </div>
    </div>

    <div class="closing-statement">
      ${closingStatement}
    </div>

    <div class="footer-divider"></div>
    <div class="footer-block">
      <div>Alexandre Garcia | Multi-Unit Restaurant Operations</div>
      <div>BRASA Meat Intelligence™ Framework</div>
    </div>
  </div>

</body>
</html>`;
}

async function main() {
    console.log('Starting Puppeteer browser to render BRASA Field Observations #013-#050...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        const observationsRootDir = path.join(__dirname, '../../linkedin_assets/BRASA FIELD OBSERVATIONS');
        if (!fs.existsSync(observationsRootDir)) {
            fs.mkdirSync(observationsRootDir, { recursive: true });
        }

        for (const obs of observations) {
            const safeTitle = obs.title.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            const folderName = `#${obs.num}_${safeTitle}`;
            const obsFolder = path.join(observationsRootDir, folderName);
            
            console.log(`Processing Observation #${obs.num}: ${obs.title}...`);
            if (!fs.existsSync(obsFolder)) {
                fs.mkdirSync(obsFolder, { recursive: true });
            }

            // 1. Generate post.md
            const postContent = `# BRASA FIELD OBSERVATION #${obs.num}\n` +
                `**Title:** ${obs.title}\n\n` +
                `### LinkedIn Post Copy:\n` +
                `\`\`\`text\n` +
                `BRASA FIELD OBSERVATION #${obs.num}\n\n` +
                `THE CORNERSTONE: ${obs.title}\n\n` +
                `${obs.postCopy}\n\n` +
                `"${obs.bottomStatement}"\n\n` +
                `${obs.closingStatement}\n\n` +
                `${obs.hashtags.join(' ')}\n` +
                `\`\`\`\n\n` +
                `### Hashtags Only:\n` +
                `${obs.hashtags.join(' ')}\n`;
            
            fs.writeFileSync(path.join(obsFolder, 'post.md'), postContent, 'utf8');

            // 2. Generate card_copy.md
            const cardCopyContent = `# Card Copy for Observation #${obs.num}\n\n` +
                `*   **Header**: BRASA FIELD OBSERVATION #${obs.num}\n` +
                `*   **Title**: ${obs.title}\n` +
                `*   **Body Points**:\n` +
                obs.body.map(pt => `    *   ${pt}`).join('\n') + '\n' +
                `*   **Center Box Statement**: ${obs.bottomStatement}\n` +
                `*   **Closing Statement**: ${obs.closingStatement}\n`;
            
            fs.writeFileSync(path.join(obsFolder, 'card_copy.md'), cardCopyContent, 'utf8');

            // 3. Generate image_prompt.md
            const imagePromptContent = `# Image Prompt for Observation #${obs.num}\n\n` +
                `A boardroom-grade, high-fidelity LinkedIn card representing BRASA Field Observation #${obs.num}.\n\n` +
                `## Layout Specs\n` +
                `*   **Dimensions**: 1080 x 1080 px (rendered at 2160 x 2160 px for high resolution)\n` +
                `*   **Palette**: Dark theme. Pure black (#000000) background. Gold accents (#C8A44D) for divider lines and boxes. Premium white (#FFFFFF) typography.\n` +
                `*   **Typography**:\n` +
                `    *   Header and body copy in clean, minimalist sans-serif (Inter).\n` +
                `    *   Title in serif typeface (Cormorant Garamond), uppercase, bold.\n` +
                `*   **Visual Elements**:\n` +
                `    *   Top: Header ("BRASA FIELD OBSERVATION #${obs.num}") in small uppercase Inter, followed by Title in large Cormorant Garamond, underlined by a 2px horizontal gold divider.\n` +
                `    *   Middle: Sans-serif bullet points separated by generous line-height spacing.\n` +
                `    *   Lower Middle: A center box outlined in a 3px gold border containing the bold uppercase statement: "${obs.bottomStatement}".\n` +
                `    *   Lower: A centered, medium-weight white closing statement.\n` +
                `    *   Bottom: A 1.5px gold divider line, followed by the BRASA corporate footer:\n` +
                `        *   Left: "Alexandre Garcia | Multi-Unit Restaurant Operations"\n` +
                `        *   Right: "BRASA Meat Intelligence™ Framework"\n`;
            
            fs.writeFileSync(path.join(obsFolder, 'image_prompt.md'), imagePromptContent, 'utf8');

            // 4. Render HTML template and capture screenshot as final_card.png
            const htmlContent = getHtmlTemplate(
                obs.num,
                obs.title,
                obs.body,
                obs.bottomStatement,
                obs.closingStatement
            );

            await page.setContent(htmlContent);
            await new Promise(resolve => setTimeout(resolve, 1200)); // wait for fonts

            await page.setViewport({
                width: 1080,
                height: 1080,
                deviceScaleFactor: 2 // High Resolution: 2160 x 2160 px output
            });

            const pngPath = path.join(obsFolder, 'final_card.png');
            await page.screenshot({
                path: pngPath,
                type: 'png'
            });
            console.log(`- Saved files and rendered card for #${obs.num}`);
        }

        console.log('SUCCESS: All observations (#013-#050) have been generated successfully!');
    } catch (err) {
        console.error('CRITICAL ERROR in rendering main loop:', err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();

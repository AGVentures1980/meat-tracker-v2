const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const observations = [
    {
        num: "006",
        folderName: "#006_THE_COST_OF_WAITING",
        title: "THE COST OF WAITING",
        headline: "THE COST OF WAITING",
        body: [
            "Operational drift happens today.",
            "Reports arrive weeks later.",
            "Corrections happen months later.",
            "Profitability suffers in the gap."
        ],
        bottomStatement: "THE MOST EXPENSIVE LOSS IS OFTEN THE ONE LEADERSHIP CANNOT SEE.",
        closingStatement: "Every day of delayed visibility compounds the loss.",
        hashtags: [
            "#RestaurantOperations",
            "#OperationalExcellence",
            "#HospitalityLeadership",
            "#SupplyChain",
            "#EBITDA",
            "#Accountability",
            "#BRASA"
        ],
        postCopy: "Yesterday's report cannot protect today's margin.\n\nIn high-volume multi-unit operations, latency is a silent EBITDA killer.\n\n• Operational drift happens in real time—on the dock, at the butcher block, on the plate line.\n• Excel inventory reports arrive weeks after the close.\n• Administrative course corrections are implemented months later.\n\nBy the time you identify a food cost spike in your monthly operating review, the cash has already evaporated. You cannot retrospectively audit a steak that has already been eaten.\n\nTo protect EBITDA, operational visibility must move at the speed of execution."
    },
    {
        num: "007",
        folderName: "#007_THE_INVISIBLE_OWNER",
        title: "THE INVISIBLE OWNER",
        headline: "THE INVISIBLE OWNER",
        body: [
            "Every metric has a number.",
            "Very few have an owner.",
            "What nobody owns rarely improves.",
            "Accountability drives performance."
        ],
        bottomStatement: "IF EVERYONE OWNS IT, NO ONE OWNS IT.",
        closingStatement: "Accountability is the bridge between visibility and performance.",
        hashtags: [
            "#Leadership",
            "#Accountability",
            "#RestaurantOperations",
            "#HospitalityLeadership",
            "#OperationalExcellence",
            "#BRASA"
        ],
        postCopy: "If everyone is responsible, no one is.\n\nEvery multi-unit operator tracks metrics: Food Cost %, Lbs/Guest, and Yield variance. But tracking is not the same as owning.\n\n• Every metric has a number on a dashboard.\n• Very few metrics have an assigned operational owner.\n• What nobody owns is left to drift.\n• True accountability requires personal responsibility at the moment of execution.\n\nWe do not lack data. We lack ownership.\n\nTo drive performance, every control gate—from receiving dock weight verification to prep block yields—must be tied to a specific name, a specific shift, and a specific action."
    },
    {
        num: "008",
        folderName: "#008_MONEY_ENTERS_THROUGH_THE_FRONT_DOOR",
        title: "MONEY ENTERS THROUGH THE FRONT DOOR",
        headline: "MONEY ENTERS THROUGH THE FRONT DOOR",
        body: [
            "Revenue enters through the dining room.",
            "Margin leaks through operational gaps.",
            "Receiving.",
            "Yield.",
            "Portioning."
        ],
        bottomStatement: "EBITDA LEAKS THROUGH THE BACK DOOR.",
        closingStatement: "Revenue enters through the front door. Profit leaves through the back door.",
        hashtags: [
            "#EBITDA",
            "#FoodCost",
            "#RestaurantOperations",
            "#HospitalityLeadership",
            "#OperationalExcellence",
            "#BRASA"
        ],
        postCopy: "Revenue is won in the dining room, but EBITDA is protected in the back of the house.\n\nToo many operators focus 90% of their energy on increasing guest counts and dining room throughput. Yet, their profitability leaks from the inside out.\n\n• Revenue enters through the front door.\n• Margins evaporate through unmonitored operational gaps.\n• Inbound catch-weight drift at the receiving dock.\n• Fabrication losses at the butcher table.\n• Over-portioning on the carve line.\n\nYou do not solve a food cost crisis by selling more. You solve it by locking down the physical chain of custody."
    },
    {
        num: "009",
        folderName: "#009_THE_COST_OF_INCONSISTENCY",
        title: "THE COST OF INCONSISTENCY",
        headline: "THE COST OF INCONSISTENCY",
        body: [
            "Inconsistent cuts at the butcher station.",
            "Unverified weights at the receiving dock.",
            "Subjective portioning on the carve line.",
            "Operational decisions based on convenience rather than standards.",
            "Small deviations repeated thousands of times."
        ],
        bottomStatement: "INCONSISTENCY IS EXPENSIVE.",
        closingStatement: "WHAT IS NOT STANDARDIZED CANNOT BE SCALED.",
        hashtags: [
            "#Training",
            "#RestaurantOperations",
            "#Leadership",
            "#HospitalityLeadership",
            "#OperationalExcellence",
            "#BRASA"
        ],
        postCopy: "The greatest threat to your margin is not dishonesty. It is inconsistency.\n\nIn high-volume multi-unit operations, profitability leaks through system variances, not individual malfeasance.\n\n• Inconsistent fabrication yields at the butcher block.\n• Unverified weights accepted at the receiving dock.\n• Subjective portioning tolerances on the carve line.\n• Operational choices governed by convenience rather than specification.\n\nEvery small deviation from the operating standard, repeated thousands of times across multiple locations, degrades the network's aggregate EBITDA.\n\nInconsistency is a systems design failure, not a training failure. To protect margins, operational controls must be programmatically locked at the moment of execution."
    },
    {
        num: "010",
        folderName: "#010_THE_0_5_OZ_PROBLEM",
        title: 'THE <span style="color: #C8A44D;">0.5 OZ</span> PROBLEM',
        headline: "THE 0.5 OZ PROBLEM",
        body: [
            "Nobody loses money one pound at a time.",
            "Losses begin in fractions.",
            "Half an ounce.",
            "One plate at a time."
        ],
        bottomStatement: "SMALL VARIANCES CREATE BIG LOSSES.",
        closingStatement: "Margin protection is a game of fractions played daily.",
        hashtags: [
            "#FoodCost",
            "#YieldManagement",
            "#RestaurantOperations",
            "#HospitalityLeadership",
            "#EBITDA",
            "#BRASA"
        ],
        postCopy: "Nobody loses profitability one pound at a time. The leak begins in fractions.\n\nIn a high-volume steakhouse, an extra half-ounce of premium beef per plate seems negligible to a carver on a busy Friday night. But at scale, fractions compound into material financial exposure.\n\n• Small variances occur one plate at a time.\n• Over a week, a 0.5 oz error scales into hundreds of pounds.\n• Across 50 locations, it translates to hundreds of thousands of dollars in lost EBITDA.\n\nMargin protection is a game of fractions played daily. If you do not control the ounces, you cannot protect the millions."
    },
    {
        num: "011",
        folderName: "#011_DATA_VS_INTELLIGENCE",
        title: "DATA VS INTELLIGENCE",
        headline: "DATA VS INTELLIGENCE",
        body: [
            "Data explains what happened.",
            "Intelligence explains why.",
            "Action determines results.",
            "Visibility drives correction."
        ],
        bottomStatement: "DATA ALONE DOES NOT IMPROVE PERFORMANCE.",
        closingStatement: "Data explains what happened. Intelligence dictates what to do next.",
        hashtags: [
            "#DataDriven",
            "#OperationalExcellence",
            "#Leadership",
            "#RestaurantOperations",
            "#HospitalityLeadership",
            "#BRASA"
        ],
        postCopy: "We are drowning in data but starving for intelligence.\n\nA standard restaurant dashboard compiles numbers. It tells you what happened after the shift is over. But data alone changes nothing.\n\n• Data explains what happened.\n• Intelligence explains why it happened and who is responsible.\n• Decisive action determines the final financial result.\n• Real-time visibility drives immediate correction.\n\nStop looking at passive metrics. Implement programmatically locked validation gates that force operational correction at the moment of execution."
    },
    {
        num: "012",
        folderName: "#012_THE_LEADERSHIP_VISIBILITY_GAP",
        title: "THE LEADERSHIP VISIBILITY GAP",
        headline: "THE LEADERSHIP VISIBILITY GAP",
        body: [
            "Operations move faster than reporting.",
            "Variance compounds silently.",
            "Leaders act after the damage.",
            "Visibility must accelerate."
        ],
        bottomStatement: "YOU CANNOT CORRECT WHAT YOU CANNOT SEE.",
        closingStatement: "Operational reality moves faster than leadership visibility.",
        hashtags: [
            "#Leadership",
            "#Accountability",
            "#OperationalExcellence",
            "#RestaurantOperations",
            "#HospitalityLeadership",
            "#BRASA"
        ],
        postCopy: "Operations move at the speed of the kitchen. Reporting moves at the speed of accounting.\n\nWhen your leadership visibility is delayed, you are managing in the rearview mirror.\n\n• Fast-paced restaurant operations drift hourly.\n• Variances compound silently under the cover of manual logs.\n• Corporate leaders act weeks after the damage is done.\n• To protect margins, visibility must accelerate.\n\nIf you cannot see the drift at the moment it happens, you cannot correct it. Close the gap between execution and corporate visibility."
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
    console.log('Initializing Puppeteer browser for batch observation renders...');
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
        
        // Output directories setup
        const observationsRootDir = path.join(__dirname, '../../linkedin_assets/BRASA FIELD OBSERVATIONS');
        if (!fs.existsSync(observationsRootDir)) {
            fs.mkdirSync(observationsRootDir, { recursive: true });
        }

        for (const obs of observations) {
            console.log(`Processing Observation #${obs.num}: ${obs.title}...`);
            const obsFolder = path.join(observationsRootDir, obs.folderName);
            if (!fs.existsSync(obsFolder)) {
                fs.mkdirSync(obsFolder, { recursive: true });
            }

            // 1. Generate HTML file (Editable)
            const htmlContent = getHtmlTemplate(
                obs.num, 
                obs.title, 
                obs.body, 
                obs.bottomStatement, 
                obs.closingStatement
            );
            const htmlPath = path.join(obsFolder, `observation_${obs.num}.html`);
            fs.writeFileSync(htmlPath, htmlContent, 'utf8');
            console.log(`- HTML editable file created: ${htmlPath}`);

            // 2. Render to PNG using Puppeteer
            await page.setContent(htmlContent);
            
            // Wait for Web Fonts to load
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Set high-fidelity square dimensions (1080 x 1080)
            await page.setViewport({
                width: 1080,
                height: 1080,
                deviceScaleFactor: 2 // High resolution rendering (2160 x 2160 output)
            });

            const pngPath = path.join(obsFolder, `observation_${obs.num}.png`);
            await page.screenshot({
                path: pngPath,
                type: 'png'
            });
            console.log(`- PNG card screenshot rendered: ${pngPath}`);

            // 3. Generate Markdown file containing title, text, hashtags
            const cleanTitle = obs.title.replace(/<[^>]*>/g, '');
            const mdContent = `# BRASA FIELD OBSERVATION #${obs.num}\n` +
                `**Title:** ${cleanTitle}\n\n` +
                `### LinkedIn Post Copy:\n` +
                `\`\`\`text\n` +
                `BRASA FIELD OBSERVATION #${obs.num}\n\n` +
                `THE CORNERSTONE: ${cleanTitle}\n\n` +
                `${obs.postCopy}\n\n` +
                `"${obs.bottomStatement}"\n\n` +
                `${obs.closingStatement}\n\n` +
                `${obs.hashtags.join(' ')}\n` +
                `\`\`\`\n\n` +
                `### Hashtags Only:\n` +
                `${obs.hashtags.join(' ')}\n`;
                
            const mdPath = path.join(obsFolder, `post_${obs.num}.md`);
            fs.writeFileSync(mdPath, mdContent, 'utf8');
            console.log(`- Post markdown file created: ${mdPath}`);
        }

        console.log('SUCCESS: All 7 observations have been generated successfully!');
    } catch (err) {
        console.error('CRITICAL ERROR in rendering loop:', err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

main();

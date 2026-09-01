const fs = require('fs');
const path = require('path');

const rootDir = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP';
const docsDir = path.join(rootDir, 'docs');
const hqDir = path.join(docsDir, 'hq');

const folders = [
  '01_EXECUTIVE',
  '02_PRODUCT',
  '03_ENGINEERING',
  '04_PLATFORM',
  '05_AI',
  '06_GOVERNANCE',
  '07_OBSERVATIONS',
  '08_SALES',
  '09_CUSTOMERS',
  '10_PILOTS',
  '11_INVESTORS',
  '12_MARKETING',
  '13_OPERATIONS',
  '14_SECURITY',
  '15_RESEARCH',
  '16_ARCHIVE'
];

// Reorganization Map
// Key: Source absolute path, Value: Destination folder name
const fileMappings = {
  // Root level documents
  [path.join(rootDir, 'AGV_VENTURES_CONTEXT_SYNC.md')]: '01_EXECUTIVE',
  [path.join(rootDir, 'AGV_VENTURES_IP_MANUAL.md')]: '14_SECURITY',
  [path.join(rootDir, 'AGV_VENTURES_ONBOARDING_CHECKLIST.md')]: '13_OPERATIONS',
  [path.join(rootDir, 'AGV_VENTURES_PITCH_DECK.md')]: '11_INVESTORS',
  [path.join(rootDir, 'PITCH_GUIDE_CARLOS.md')]: '11_INVESTORS',
  [path.join(rootDir, 'pitch_rodrigo_metrics.md')]: '11_INVESTORS',
  [path.join(rootDir, 'RUNBOOK_PRODUCTION_INCIDENT.md')]: '13_OPERATIONS',
  [path.join(rootDir, 'EULA.md')]: '14_SECURITY',
  [path.join(rootDir, 'COPYRIGHT.txt')]: '14_SECURITY',
  [path.join(rootDir, 'Restaurantes_Brasil_KDP_FORMATADO.pdf')]: '15_RESEARCH',
  [path.join(rootDir, 'We_Are_Open_KDP_FORMATADO.pdf')]: '15_RESEARCH',
  [path.join(rootDir, 'Livro_Completo.txt')]: '15_RESEARCH',

  // docs root level documents
  [path.join(docsDir, 'ARCHITECTURE.md')]: '03_ENGINEERING',
  [path.join(docsDir, 'DEPLOYMENT_REALITY.md')]: '04_PLATFORM',
  [path.join(docsDir, 'ENTERPRISE_POSITIONING.md')]: '08_SALES',
  [path.join(docsDir, 'FOUNDER_KNOWLEDGE_MAP.md')]: '06_GOVERNANCE',
  [path.join(docsDir, 'GOVERNANCE_INVARIANTS.md')]: '06_GOVERNANCE',
  [path.join(docsDir, 'LIABILITY_AND_IP.md')]: '14_SECURITY',
  [path.join(docsDir, 'MOCK_DATA_REGISTRY.md')]: '06_GOVERNANCE',
  [path.join(docsDir, 'TELEMETRY_LIFECYCLE.md')]: '06_GOVERNANCE',
  [path.join(docsDir, 'TdB_COMMERCIAL_AGREEMENT_DRAFT.md')]: '09_CUSTOMERS',
  [path.join(docsDir, 'checklist-loja-pronta.html')]: '10_PILOTS',
  [path.join(docsDir, 'manual-operacional.html')]: '13_OPERATIONS',
  [path.join(docsDir, 'onboarding-sop.html')]: '13_OPERATIONS',
  [path.join(docsDir, 'plano-de-ondas.html')]: '10_PILOTS',
  [path.join(docsDir, 'sla.html')]: '13_OPERATIONS',

  // docs/hq level documents
  [path.join(hqDir, 'AI_ROLE_SEGMENTATION.md')]: '05_AI',
  [path.join(hqDir, 'ALBERTO_MEETING_FLOW.md')]: '08_SALES',
  [path.join(hqDir, 'BRASA_EXECUTIVE_CONTENT_SYSTEM.md')]: '07_OBSERVATIONS',
  [path.join(hqDir, 'BRASA_LINKEDIN_CONTENT_STANDARD.md')]: '07_OBSERVATIONS',
  [path.join(hqDir, 'BRASA_REPOSITIONING_INITIATIVE.md')]: '10_PILOTS',
  [path.join(hqDir, 'CEO_10_MINUTE_CONVERSATION.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'CEO_5_SLIDE_BOARDROOM_DECK.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'CEO_EXECUTIVE_COMMUNICATION_SUITE_SUMMARY.html')]: '01_EXECUTIVE',
  [path.join(hqDir, 'CEO_EXECUTIVE_COMMUNICATION_SUITE_SUMMARY.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'CEO_FIRST_MEETING_NOTES.html')]: '01_EXECUTIVE',
  [path.join(hqDir, 'CEO_FIRST_MEETING_NOTES.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'CEO_QA_PLAYBOOK.md')]: '10_PILOTS',
  [path.join(hqDir, 'DEAL_STRATEGY_SYSTEM.md')]: '08_SALES',
  [path.join(hqDir, 'ENTERPRISE_READINESS.md')]: '10_PILOTS',
  [path.join(hqDir, 'ENTERPRISE_SALES_OPERATING_SYSTEM.md')]: '08_SALES',
  [path.join(hqDir, 'EVIDENCE_ENGINE.md')]: '03_ENGINEERING',
  [path.join(hqDir, 'EXECUTIVE_5_SLIDE_DECK.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'EXECUTIVE_OBJECTION_MAP.md')]: '08_SALES',
  [path.join(hqDir, 'EXECUTIVE_ONE_PAGER.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'EXECUTIVE_OPERATIONS_HUB.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'FIRST_EVIDENCE_ACQUISITION_PLAN.md')]: '10_PILOTS',
  [path.join(hqDir, 'FIRST_PILOT_EXECUTION_PLAYBOOK.md')]: '10_PILOTS',
  [path.join(hqDir, 'FOUNDER_DEPENDENCY.md')]: '06_GOVERNANCE',
  [path.join(hqDir, 'GOVERNANCE_LANGUAGE.md')]: '06_GOVERNANCE',
  [path.join(hqDir, 'MASTER_CONTEXT.md')]: '02_PRODUCT',
  [path.join(hqDir, 'NORTH_STAR.md')]: '01_EXECUTIVE',
  [path.join(hqDir, 'PILOT_DATA_CLASSIFICATION_NOTES.md')]: '03_ENGINEERING',
  [path.join(hqDir, 'PILOT_DEPLOYMENT_FLOW.md')]: '10_PILOTS',
  [path.join(hqDir, 'PILOT_ECONOMICS_FRAMEWORK.md')]: '10_PILOTS',
  [path.join(hqDir, 'PILOT_PLAYBOOK.md')]: '10_PILOTS',
  [path.join(hqDir, 'PILOT_READINESS_BLOCKER_REMEDIATION_PLAN.md')]: '10_PILOTS',
  [path.join(hqDir, 'PILOT_READINESS_REASSESSMENT.md')]: '10_PILOTS',
  [path.join(hqDir, 'POST_REMEDIATION_RANDOMNESS_AUDIT.md')]: '03_ENGINEERING',
  [path.join(hqDir, 'PRE_IMPLEMENTATION_STORE_AUDIT.md')]: '10_PILOTS',
  [path.join(hqDir, 'PRE_REMEDIATION_BASELINE.md')]: '10_PILOTS',
  [path.join(hqDir, 'SALES_MEMORY.md')]: '08_SALES',
  [path.join(hqDir, 'TELEMETRY_ARCHITECTURE_VISUAL.md')]: '03_ENGINEERING',
  [path.join(hqDir, 'VALUE_DISCOVERY_ANALYSIS.md')]: '08_SALES',
  [path.join(hqDir, 'WE_ARE_OPEN_EXECUTIVE_EDITION_EXECUTIVE_CASE_LIBRARY.md')]: '09_CUSTOMERS',
  [path.join(hqDir, 'WE_ARE_OPEN_EXECUTIVE_EDITION_KNOWLEDGE_MAP.md')]: '09_CUSTOMERS',
  [path.join(hqDir, 'alexandre-garcia-portfolio.html')]: '01_EXECUTIVE',
  [path.join(hqDir, 'brasa-executive-one-pager-final-pt.html')]: '01_EXECUTIVE',
  [path.join(hqDir, 'brasa-executive-one-pager-final.html')]: '01_EXECUTIVE',
  [path.join(hqDir, 'brasa-executive-one-pager.html')]: '01_EXECUTIVE',
  [path.join(hqDir, 'brasa_observation_004.html')]: '07_OBSERVATIONS',
  [path.join(hqDir, 'brasa_observation_005.html')]: '07_OBSERVATIONS'
};

// Main Execution
async function run() {
  console.log('Starting BRASA Documentation Reorganization...');

  // 1. Create Target Folders
  for (const folder of folders) {
    const targetPath = path.join(docsDir, folder);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`Created folder: ${folder}`);
    }
  }

  const reports = [];

  // 2. Move files
  for (const [srcPath, folder] of Object.entries(fileMappings)) {
    if (fs.existsSync(srcPath)) {
      const filename = path.basename(srcPath);
      const destPath = path.join(docsDir, folder, filename);
      
      try {
        fs.renameSync(srcPath, destPath);
        reports.push({
          file: filename,
          from: path.relative(rootDir, srcPath),
          to: path.relative(rootDir, destPath),
          status: 'SUCCESS'
        });
        console.log(`Moved ${filename} -> docs/${folder}/`);
      } catch (err) {
        reports.push({
          file: filename,
          from: path.relative(rootDir, srcPath),
          to: path.relative(rootDir, destPath),
          status: 'ERROR',
          error: err.message
        });
        console.error(`Error moving ${filename}:`, err.message);
      }
    } else {
      console.log(`File not found, skipping: ${path.basename(srcPath)}`);
    }
  }

  // 3. Reorganize Livro directory if it exists
  const livroSrc = path.join(rootDir, 'Livro');
  const livroDest = path.join(docsDir, '15_RESEARCH', 'Livro');
  if (fs.existsSync(livroSrc)) {
    try {
      fs.renameSync(livroSrc, livroDest);
      reports.push({
        file: 'Livro (Directory)',
        from: 'Livro',
        to: 'docs/15_RESEARCH/Livro',
        status: 'SUCCESS'
      });
      console.log('Moved Livro directory -> docs/15_RESEARCH/Livro');
    } catch (err) {
      console.error('Error moving Livro directory:', err.message);
    }
  }

  const docxSrc = path.join(rootDir, 'Livro Completo..docx');
  const docxDest = path.join(docsDir, '15_RESEARCH', 'Livro Completo..docx');
  if (fs.existsSync(docxSrc)) {
    try {
      fs.renameSync(docxSrc, docxDest);
      reports.push({
        file: 'Livro Completo..docx',
        from: 'Livro Completo..docx',
        to: 'docs/15_RESEARCH/Livro Completo..docx',
        status: 'SUCCESS'
      });
    } catch (err) {
      console.error(err);
    }
  }

  // 4. Remove empty hq folder
  if (fs.existsSync(hqDir)) {
    const files = fs.readdirSync(hqDir);
    if (files.length === 0) {
      fs.rmdirSync(hqDir);
      console.log('Removed empty hq/ directory.');
    } else {
      console.log(`Warning: hq/ directory is not empty. Files remaining: ${files.join(', ')}`);
    }
  }

  // 5. Generate Reorganization Report
  const reportPath = path.join(docsDir, 'MIGRATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2));
  console.log(`Migration report written to ${reportPath}`);
}

run().catch(console.error);

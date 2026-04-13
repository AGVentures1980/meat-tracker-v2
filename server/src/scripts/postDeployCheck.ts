import axios from 'axios';

async function runExtendedCheck() {
  const targetAPI = process.env.API_URL;
  const tokenGuard = process.env.TEST_AUTH_TOKEN;
  
  if (!targetAPI || !tokenGuard) {
      console.error("🚨 [SRE Telemetry FATAL] API/Auth missing. Telemetry requer inputs explícitos.");
      process.exit(1);
  }

  console.log(`🚀 [SRE] Post-Deploy Telemetry Boundary: ${targetAPI}`);

  try {
    const bootStamp = Date.now();
    const healthReq = await axios.get(`${targetAPI}/api/health`, { timeout: 3000 });
    const elapsedHealth = Date.now() - bootStamp;
    
    if (healthReq.status !== 200) throw new Error(`Health status aberrante: ${healthReq.status}`);
    console.log(`   ✅ Healthcheck Telemetria OK. Ping Raw (${elapsedHealth}ms).`);

    const readS = await axios.get(`${targetAPI}/api/store/settings`, { headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 });
    const standardBoolean = !!readS.data.serves_lamb_chops_rodizio;
    
    console.log(`   * Assinalando mutação no BD estrito...`);
    const ptM = Date.now();
    const mutT = await axios.put(`${targetAPI}/api/store/settings`, { serves_lamb_chops_rodizio: !standardBoolean }, { headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 });
    if(mutT.status !== 200) throw new Error("Mutation Failure Route");
    const diffT = Date.now() - ptM;

    const crossR = await axios.get(`${targetAPI}/api/store/settings`, { headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 });
    if (!!crossR.data.serves_lamb_chops_rodizio === standardBoolean) throw new Error("Persistência morta. Mutation request vazou.");

    const ptR = Date.now();
    const mutR = await axios.put(`${targetAPI}/api/store/settings`, { serves_lamb_chops_rodizio: standardBoolean }, { headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 });
    if(mutR.status !== 200) throw new Error("Revert Failure");
    const diffR = Date.now() - ptR;

    const finalizeCheck = await axios.get(`${targetAPI}/api/store/settings`, { headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 });
    if (!!finalizeCheck.data.serves_lamb_chops_rodizio !== standardBoolean) throw new Error("Rollback interno da Engine Vazou.");

    console.log(`   ✅ Transação OK E2E. PUT(+${diffT}ms) / REVERT(+${diffR}ms).`);
    console.log("🎉 [SRE] Observabilidade atesta: Produção online interativa.");
    process.exit(0);

  } catch (error: any) {
    console.error("🚨 [SRE TELEMETRY CRASH]");
    console.error(`Message Block: ${error.message}`);
    console.error(`O sistema de Deploy empurrou instabilidade HTTP. Sincronize Runbook de Rollback.`);
    process.exit(1);
  }
}

runExtendedCheck();

import axios from 'axios';

async function performSmokeTestValidation() {
  const targetAPI = process.env.API_URL;
  const tokenGuard = process.env.TEST_AUTH_TOKEN;

  if (!targetAPI || !tokenGuard) {
      console.error("🚨 [SRE] CI Error: Credenciais de Smoke Test não configuradas.");
      process.exit(1);
  }
  
  console.log(`🚀 [SRE] Start E2E Deployment Validation on API Root -> ${targetAPI}`);

  try {
    const healthFetch = await axios.get(`${targetAPI}/api/health`, { timeout: 3000 });
    if (healthFetch.status !== 200) throw new Error("Healthcheck Engine Crash");

    const getStore = await axios.get(`${targetAPI}/api/store/settings`, { 
        headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 
    });
    
    // Smoke Test Put Ping 
    const baseVal = !!getStore.data.serves_lamb_chops_rodizio;
    await axios.put(`${targetAPI}/api/store/settings`, { serves_lamb_chops_rodizio: !baseVal }, 
        { headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 }
    );
    
    // Revert Ping
    await axios.put(`${targetAPI}/api/store/settings`, { serves_lamb_chops_rodizio: baseVal }, 
        { headers: { Authorization: `Bearer ${tokenGuard}` }, timeout: 5000 }
    );

    console.log("🎉 [SRE Gateway] Smoke Tests Certified. Operacionalidade atestada em Banco Pós-Deploy.");
    process.exit(0);
  } catch (err: any) {
    console.error("🚨 [SRE ERROR] Pipeline falhou validações no Smoke Test pós-transação.");
    console.error(err.message);
    process.exit(1);
  }
}

performSmokeTestValidation();

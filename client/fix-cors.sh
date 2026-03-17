git checkout main
perl -pi -e "s/const res = await fetch\('/const res = await fetch\(\\\`\\\${API_URL}/" src/pages/admin/ContractsVault.tsx
perl -pi -e "s/const res = await fetch\(\\\`/const res = await fetch\(\\\`\\\${API_URL}/" src/pages/admin/ContractsVault.tsx

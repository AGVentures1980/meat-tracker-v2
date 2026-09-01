# BRASA Brand Pulse™

Social Reputation & Review Intelligence OS for Multi-Unit Restaurants.

## Local Development Configuration

This application is configured to run on port **3001** to avoid collisions with other running parallel applications (e.g. Parallel30 on port 3000).

- **Local Address:** `http://localhost:3001`
- **Database:** PostgreSQL (`postgresql://localhost:5432/brasa_brand_pulse`)
- **Default Port:** `3001` (configured via `package.json` scripts and `.env` variables)

### Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Initialization:**
   Sync the schema to PostgreSQL:
   ```bash
   npx prisma db push
   ```

3. **Seeding Demo Data:**
   Seed the database with organizations, locations, users, and reviews:
   ```bash
   npx prisma db seed
   ```

4. **Run Security Tests:**
   Verify tenant isolation boundaries:
   ```bash
   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-tenant-isolation.ts
   ```

5. **Start Dev Server:**
   Starts the app locally on port `3001`:
   ```bash
   npm run dev
   ```

### Demo User Accounts

- **Role:** Corporate Administrator
- **Email:** `admin@brasabrandpulse.com`
- **Password:** `password123`

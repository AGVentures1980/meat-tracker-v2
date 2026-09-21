// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Tenant Decommission Planner Service (Read-Only)

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DecommissionPlanResult {
  runId: string;
  companyId: string;
  companyName: string;
  subdomain: string;
  isProtected: boolean;
  status: 'DRY_RUN_READY' | 'BLOCKED_PROTECTED_TENANT' | 'COMPANY_NOT_FOUND' | 'BLOCKED_FK_CONSTRAINTS';
  planHash: string;
  generatedAt: string;
  summary: {
    totalOwnedRows: number;
    storesCount: number;
    directUsersCount: number;
    legacyUsersCount: number;
    productsCount: number;
    preparationsCount: number;
    aliasesCount: number;
    auditLogsCount: number;
    ordersCount: number;
    protectedTenantRowsAffected: number;
    globalTaxonomyRowsAffected: number;
    masterUserRowsAffected: number;
  };
  modelCounts: Record<string, number>;
  blockers: string[];
}

export class TenantDecommissionPlanner {
  private static PROTECTED_SUBDOMAINS = ['chima', 'outback', 'hardrock'];
  private static PROTECTED_COMPANY_IDS = [
    '4e7b4b3d-5e5a-418a-8694-d232c8444eb6', // Chima
    'ea32ec07-c64b-4670-88ec-849cabd7170f', // Hard Rock
    'd04d5015-44a9-4bdd-9021-b8bd28caad9b'  // Bloomin'
  ];

  public static async createPlan(companyId: string): Promise<DecommissionPlanResult> {
    const runId = `dec_run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const generatedAt = new Date().toISOString();

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return {
        runId,
        companyId,
        companyName: 'UNKNOWN',
        subdomain: 'UNKNOWN',
        isProtected: false,
        status: 'COMPANY_NOT_FOUND',
        planHash: '',
        generatedAt,
        summary: {
          totalOwnedRows: 0,
          storesCount: 0,
          directUsersCount: 0,
          legacyUsersCount: 0,
          productsCount: 0,
          preparationsCount: 0,
          aliasesCount: 0,
          auditLogsCount: 0,
          ordersCount: 0,
          protectedTenantRowsAffected: 0,
          globalTaxonomyRowsAffected: 0,
          masterUserRowsAffected: 0
        },
        modelCounts: {},
        blockers: [`Company ID '${companyId}' not found in production database`]
      };
    }

    const isProtected = this.PROTECTED_COMPANY_IDS.includes(company.id) || 
                        (company.subdomain && this.PROTECTED_SUBDOMAINS.includes(company.subdomain.toLowerCase()));

    if (isProtected) {
      return {
        runId,
        companyId: company.id,
        companyName: company.name,
        subdomain: company.subdomain || 'N/A',
        isProtected: true,
        status: 'BLOCKED_PROTECTED_TENANT',
        planHash: '',
        generatedAt,
        summary: {
          totalOwnedRows: 0,
          storesCount: 0,
          directUsersCount: 0,
          legacyUsersCount: 0,
          productsCount: 0,
          preparationsCount: 0,
          aliasesCount: 0,
          auditLogsCount: 0,
          ordersCount: 0,
          protectedTenantRowsAffected: 0,
          globalTaxonomyRowsAffected: 0,
          masterUserRowsAffected: 0
        },
        modelCounts: {},
        blockers: [`Company '${company.name}' (${company.id}) is a PROTECTED ARCHETYPE and cannot be decommissioned.`]
      };
    }

    const stores = await prisma.store.findMany({ where: { company_id: company.id }, select: { id: true } });
    const storeIds = stores.map(s => s.id);

    const directUsers = await prisma.user.count({ where: { company_id: company.id } });
    const legacyUsers = storeIds.length ? await prisma.user.count({ where: { company_id: null, store_id: { in: storeIds } } }) : 0;
    const prodCount = await prisma.companyProduct.count({ where: { company_id: company.id } });
    const prepCount = await prisma.companyProductPreparation.count({ where: { company_id: company.id } });
    const entCount = await prisma.organizationProductEntitlement.count({ where: { company_id: company.id } });
    const pubRegCount = await prisma.publicLocationRegistry.count({ where: { company_id: company.id } });
    const auditLogCount = await prisma.auditLog.count({ where: { company_id: company.id } });
    const outletCount = await prisma.outlet.count({ where: { company_id: company.id } });

    const orderCount = storeIds.length ? await prisma.order.count({ where: { store_id: { in: storeIds } } }) : 0;
    const invCount = storeIds.length ? await prisma.inventoryRecord.count({ where: { store_id: { in: storeIds } } }) : 0;
    const purCount = storeIds.length ? await prisma.purchaseRecord.count({ where: { store_id: { in: storeIds } } }) : 0;
    const repCount = storeIds.length ? await prisma.report.count({ where: { store_id: { in: storeIds } } }) : 0;
    const aliasCount = storeIds.length ? await prisma.productAlias.count({ where: { store_id: { in: storeIds } } }) : 0;

    const totalOwnedRows = 1 + stores.length + outletCount + directUsers + legacyUsers + entCount + prodCount + prepCount + pubRegCount + auditLogCount + orderCount + invCount + purCount + repCount + aliasCount;

    const modelCounts: Record<string, number> = {
      Company: 1,
      Store: stores.length,
      Outlet: outletCount,
      User_Direct: directUsers,
      User_LegacyStore: legacyUsers,
      OrganizationProductEntitlement: entCount,
      CompanyProduct: prodCount,
      CompanyProductPreparation: prepCount,
      PublicLocationRegistry: pubRegCount,
      AuditLog: auditLogCount,
      Order: orderCount,
      InventoryRecord: invCount,
      PurchaseRecord: purCount,
      Report: repCount,
      ProductAlias: aliasCount
    };

    const blockers: string[] = [];
    if (prodCount > 0 || stores.length > 0) {
      blockers.push(`FK Restriction: Direct DELETE FROM "Company" will fail. Scripted cascade cleanup required.`);
    }
    if (legacyUsers > 0) {
      blockers.push(`Unlinked Users: ${legacyUsers} store users have company_id = null. User cleanup required.`);
    }

    const payloadToHash = JSON.stringify({ companyId: company.id, totalOwnedRows, modelCounts, generatedAt });
    const planHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    return {
      runId,
      companyId: company.id,
      companyName: company.name,
      subdomain: company.subdomain || 'N/A',
      isProtected: false,
      status: 'DRY_RUN_READY',
      planHash,
      generatedAt,
      summary: {
        totalOwnedRows,
        storesCount: stores.length,
        directUsersCount: directUsers,
        legacyUsersCount: legacyUsers,
        productsCount: prodCount,
        preparationsCount: prepCount,
        aliasesCount: aliasCount,
        auditLogsCount: auditLogCount,
        ordersCount: orderCount,
        protectedTenantRowsAffected: 0,
        globalTaxonomyRowsAffected: 0,
        masterUserRowsAffected: 0
      },
      modelCounts,
      blockers
    };
  }
}

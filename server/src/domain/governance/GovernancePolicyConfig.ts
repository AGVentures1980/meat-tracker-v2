// server/src/domain/governance/GovernancePolicyConfig.ts

export const GovernancePolicyConfig = {
  version: '1.0.0',
  thresholds: {
    unaccountedLoss: {
      absoluteLbsCritical: 10.0,
      percentageWarning: 0.75,
      percentageRestricted: 1.5,
      percentageCritical: 2.5
    }
  }
};

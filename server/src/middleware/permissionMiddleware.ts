import { Request, Response, NextFunction } from 'express';

// Permission levels per role
const WRITE_PERMISSIONS: Record<string, string[]> = {
  admin:               ['*'],                          // everything
  corporate_director:  ['user_management', 'config'],
  regional_director:   ['user_management_regional'],
  property_manager:    ['consumption_log', 'forecast', 'user_management_property', 'override_approval'],
  executive_chef:      ['prep_log', 'yield_event', 'receiving_confirmation'],
  outlet_manager:      ['consumption_log', 'forecast_submission', 'outlet_override'],
  kitchen_operator:    ['scan_event', 'weight_entry', 'prep_record'],
  director:            ['*'],                          // legacy — preserve
  manager:             ['consumption_log', 'forecast', 'override_approval'],
  viewer:              [],                             // read only
  read_only_viewer:    [],                             // read only
  area_manager:        ['consumption_log', 'override_approval'],
  partner:             ['config'],
};

// Middleware factory
export function requirePermission(resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;
    if (!userRole) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No role found in user token' });
    }

    const allowed = WRITE_PERMISSIONS[userRole] || [];
    
    if (allowed.includes('*') || allowed.includes(resource)) {
      return next();
    }
    
    return res.status(403).json({
      error: 'PERMISSION_DENIED',
      message: `Role '${userRole}' cannot write to resource '${resource}'`
    });
  };
}

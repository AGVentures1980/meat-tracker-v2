export class AuthContextMissingError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'AuthContextMissingError';
    }
}

export const getUserId = (user: any): string => {
    const id = user?.id ?? user?.userId;
    if (!id) throw new AuthContextMissingError(401, 'USER_ID_MISSING');
    return id;
};

export const requireTenant = (user: any): string => {
    const companyId = user?.companyId ?? user?.company_id;
    if (!companyId) throw new AuthContextMissingError(403, 'TENANT_CONTEXT_MISSING');
    return companyId;
};

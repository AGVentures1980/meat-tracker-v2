// Copyright (c) 2023-2026 AGV VENTURES / Alexandre Garcia. All rights reserved.
// BRASA Meat Intelligence™ — Secure Credential Setup & Onboarding Service

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const UNUSABLE_SENTINEL_PREFIX = 'UNUSABLE_PRE_ACTIVATION_CREDENTIAL_SENTINEL:';

export interface SetupTokenResult {
    rawToken: string;
    tokenHash: string;
    expiresAt: Date;
}

export class CredentialSetupService {
    /**
     * Generates a cryptographically random, per-user, high-entropy, unexposed, unrecoverable 
     * password hash sentinel for newly provisioned tenant users in pre-activation state.
     */
    static generatePreActivationSentinel(): string {
        const randomEntropy = crypto.randomBytes(32).toString('hex');
        return `${UNUSABLE_SENTINEL_PREFIX}${randomEntropy}`;
    }

    /**
     * Checks if a user's stored password hash is an unusable pre-activation sentinel.
     */
    static isPreActivationCredential(passwordHash?: string | null): boolean {
        if (!passwordHash) return true;
        if (passwordHash.startsWith(UNUSABLE_SENTINEL_PREFIX)) return true;
        if (passwordHash.startsWith('UNUSABLE_')) return true;
        return false;
    }

    /**
     * Generates a 256-bit cryptographically secure one-time onboarding token for a user.
     * The raw token is returned ONCE to the caller and MUST NEVER be logged or persisted in plain text.
     * Only the SHA-256 token hash is saved in the database.
     */
    static async generateSetupToken(userId: string, expiresInMinutes: number = 15): Promise<SetupTokenResult> {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        // Delete any pre-existing tokens for this user
        await prisma.passwordResetToken.deleteMany({
            where: { user_id: userId }
        });

        await prisma.passwordResetToken.create({
            data: {
                user_id: userId,
                token_hash: tokenHash,
                expires_at: expiresAt
            }
        });

        return { rawToken, tokenHash, expiresAt };
    }

    /**
     * Completes secure credential onboarding for a user using a valid one-time token.
     * Enforces enterprise password strength (>= 12 chars), hashes password with bcrypt (cost 12),
     * updates user state, and consumes the token (single-use).
     */
    static async completeCredentialSetup(
        rawToken: string, 
        newPassword: string, 
        expectedUserId?: string
    ): Promise<{ success: boolean; userId: string }> {
        if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
            throw new Error('INVALID_TOKEN: Secure token is required');
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 12) {
            throw new Error('PASSWORD_POLICY_VIOLATION: Enterprise policy requires passwords to be at least 12 characters');
        }

        const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
        const resetLog = await prisma.passwordResetToken.findUnique({
            where: { token_hash: tokenHash }
        });

        if (!resetLog) {
            throw new Error('INVALID_OR_EXPIRED_TOKEN: Secure onboarding token is invalid or has already been used');
        }

        if (expectedUserId && resetLog.user_id !== expectedUserId) {
            throw new Error('TOKEN_USER_MISMATCH: Provided onboarding token is not authorized for this account');
        }

        if (new Date() > new Date(resetLog.expires_at)) {
            await prisma.passwordResetToken.delete({ where: { token_hash: tokenHash } });
            throw new Error('TOKEN_EXPIRED: Secure onboarding token has expired. A new invitation is required');
        }

        // Token is valid! Hash new password with enterprise cost factor 12
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: resetLog.user_id },
            data: {
                password_hash: hashedPassword,
                last_password_change: new Date(),
                force_change: false,
                token_version: { increment: 1 }
            }
        });

        // Single-use enforcement: consume token immediately
        await prisma.passwordResetToken.delete({ where: { token_hash: tokenHash } });

        return { success: true, userId: resetLog.user_id };
    }
}

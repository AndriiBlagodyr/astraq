import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateReviewAccessBody,
  ReviewAccess,
  ReviewAccessCredentials,
  ReviewAccessList,
} from '@astraq/shared';
import { generatePassword, hashPassword } from '../auth/password';
import { accessState } from '../auth/review-access';
import { env } from '../common/env';
import {
  ReviewAccessRepository,
  type ReviewAccessRow,
} from './review-access.repository';

const iso = (date: Date | null) => date?.toISOString() ?? null;

function present(row: ReviewAccessRow, now: Date): ReviewAccess {
  return {
    id: row.userId,
    email: row.email,
    company: row.company,
    note: row.note,
    state: accessState(row, now),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: iso(row.revokedAt),
    createdAt: row.createdAt.toISOString(),
    sharedCredentials: row.sharedCredentials,
    mustChangePassword: row.mustChangePassword,
    passwordChangedAt: iso(row.passwordChangedAt),
    lastSignInAt: iso(row.lastSignInAt),
  };
}

/** An end date has to be ahead: one in the past would close on creation. */
function futureDate(value: string, now: Date): Date {
  const date = new Date(value);
  if (date <= now) {
    throw new BadRequestException('The end date must be in the future');
  }
  return date;
}

/**
 * Review accounts (ROADMAP "Review access" side track, item 1): sign-ins an
 * admin makes for a company, each with an end date. The password is made
 * here, returned once, and stored only as a hash.
 */
@Injectable()
export class ReviewAccessService {
  constructor(private readonly access: ReviewAccessRepository) {}

  async list(): Promise<ReviewAccessList> {
    const now = new Date();
    const rows = await this.access.list();
    return { accounts: rows.map((row) => present(row, now)) };
  }

  async create(
    body: CreateReviewAccessBody,
    adminId: string,
  ): Promise<ReviewAccessCredentials> {
    const now = new Date();
    const expiresAt = futureDate(body.expiresAt, now);
    // A review account must never be an admin, and "admin" is an email.
    if (env.ADMIN_EMAILS.includes(body.email)) {
      throw new BadRequestException(
        "An admin's email can't be a review account",
      );
    }

    const password = generatePassword();
    const row = await this.access.create({
      email: body.email,
      passwordHash: await hashPassword(password),
      company: body.company,
      note: body.note || null,
      expiresAt,
      sharedCredentials: body.sharedCredentials,
      createdBy: adminId,
    });
    return { account: present(row, now), password };
  }

  async setExpiry(
    id: string,
    expiresAt: string,
    adminId: string,
  ): Promise<ReviewAccess> {
    const now = new Date();
    const row = await this.access.setExpiry(
      id,
      futureDate(expiresAt, now),
      adminId,
    );
    return present(row, now);
  }

  async revoke(id: string, adminId: string): Promise<ReviewAccess> {
    const now = new Date();
    return present(await this.access.revoke(id, adminId, now), now);
  }

  async resetPassword(
    id: string,
    adminId: string,
  ): Promise<ReviewAccessCredentials> {
    const now = new Date();
    const password = generatePassword();
    const row = await this.access.resetPassword(
      id,
      await hashPassword(password),
      adminId,
      now,
    );
    return { account: present(row, now), password };
  }
}

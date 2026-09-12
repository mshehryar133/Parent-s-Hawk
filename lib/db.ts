import { neon } from '@neondatabase/serverless';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  countryCode: string;
  password: string;
  role: 'parent' | 'child';
  createdAt: string;
  parentId?: string;
}

export interface OTP {
  id: number;
  phone: string;
  code: string;
  expiresAt: number;
  verified: boolean;
}

const DATABASE_URL = process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Missing NEON_DATABASE_URL environment variable');
}

const sql = neon(DATABASE_URL);
let initPromise: Promise<void> | null = null;

async function ensureDB() {
  if (!initPromise) initPromise = initDB();
  await initPromise;
}

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      country_code TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'parent',
      parent_id TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      verified BOOLEAN DEFAULT FALSE
    )
  `;
}

export async function getUsers(): Promise<User[]> {
  await ensureDB();
  const rows = await sql`
    SELECT id, first_name AS "firstName", last_name AS "lastName",
           phone, country_code AS "countryCode", password, role,
           parent_id AS "parentId", created_at AS "createdAt"
    FROM users
  `;
  return rows.map((r: any) => ({ ...r, role: r.role || 'parent' }));
}

export async function getUserByPhone(phone: string, countryCode: string): Promise<User | null> {
  await ensureDB();
  const rows = await sql`
    SELECT id, first_name AS "firstName", last_name AS "lastName",
           phone, country_code AS "countryCode", password, role,
           parent_id AS "parentId", created_at AS "createdAt"
    FROM users
    WHERE phone = ${phone} AND country_code = ${countryCode}
  `;
  return (rows[0] as any) || null;
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  await ensureDB();
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const createdAt = new Date().toISOString();
  await sql`
    INSERT INTO users (id, first_name, last_name, phone, country_code, password, role, parent_id, created_at)
    VALUES (${id}, ${user.firstName}, ${user.lastName}, ${user.phone}, ${user.countryCode}, ${user.password}, ${user.role || 'parent'}, ${user.parentId || null}, ${createdAt})
  `;
  return { ...user, id, createdAt, role: user.role || 'parent' };
}

export async function getOTPs(): Promise<OTP[]> {
  await ensureDB();
  const rows = await sql`SELECT id, phone, code, expires_at AS "expiresAt", verified FROM otps`;
  return rows as OTP[];
}

export async function saveOTP(phone: string, countryCode: string, code: string): Promise<void> {
  await ensureDB();
  await sql`
    INSERT INTO otps (phone, code, expires_at, verified)
    VALUES (${`${countryCode} ${phone}`}, ${code}, ${Date.now() + 5 * 60 * 1000}, FALSE)
  `;
}

export async function verifyOTP(phone: string, countryCode: string, code: string): Promise<boolean> {
  await ensureDB();
  const rows = await sql`
    SELECT id, expires_at FROM otps
    WHERE phone = ${`${countryCode} ${phone}`} AND code = ${code} AND verified = FALSE
  `;
  const row = rows[0] as any;
  if (!row) return false;
  if (Date.now() > Number(row.expires_at)) return false;
  await sql`UPDATE otps SET verified = TRUE WHERE id = ${row.id}`;
  return true;
}

export async function isOTPVerified(phone: string, countryCode: string): Promise<boolean> {
  await ensureDB();
  const rows = await sql`
    SELECT id FROM otps WHERE phone = ${`${countryCode} ${phone}`} AND verified = TRUE
  `;
  return (rows as any[]).length > 0;
}

export async function clearOTP(phone: string, countryCode: string): Promise<void> {
  await ensureDB();
  await sql`DELETE FROM otps WHERE phone = ${`${countryCode} ${phone}`}`;
}

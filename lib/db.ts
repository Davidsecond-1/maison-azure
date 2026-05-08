import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(process.env.DATABASE_URL);

// Helper to generate booking reference
export function generateReference(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = 'MA-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to calculate booking total
export function calculateBookingTotal(
  checkIn: string,
  checkOut: string,
  nightlyRate: number,
  cleaningFee: number,
  weeklyDiscount: number = 10,
  monthlyDiscount: number = 20
): { nights: number; subtotal: number; total: number; effectiveRate: number } {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  let effectiveRate = nightlyRate;
  if (nights >= 30) effectiveRate = nightlyRate * (1 - monthlyDiscount / 100);
  else if (nights >= 7) effectiveRate = nightlyRate * (1 - weeklyDiscount / 100);
  
  const subtotal = Math.round(nights * effectiveRate);
  const total = subtotal + cleaningFee;
  
  return { nights, subtotal, total, effectiveRate: Math.round(effectiveRate) };
}

// Get setting value
export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql`SELECT value FROM site_settings WHERE key = ${key}`;
  return rows.length > 0 ? rows[0].value : null;
}

// Get all settings as object
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await sql`SELECT key, value FROM site_settings`;
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

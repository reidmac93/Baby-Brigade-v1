import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}


export async function updateAllBirthWeeks() {
  await db.execute(sql`
    ALTER TABLE babies 
    ADD COLUMN IF NOT EXISTS birth_week DATE;

    UPDATE babies 
    SET birth_week = date_trunc('week', birth_date)
    WHERE birth_week IS NULL;

    ALTER TABLE babies
    ALTER COLUMN birth_week SET NOT NULL;
  `);
  console.log('Added and populated birth_week column');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// DECIMAL columns come back as strings by default; the UI wants numbers.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => parseFloat(v));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

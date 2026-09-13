import fs from 'fs';
import path from 'path';
import { pool } from './db.js';

async function seed() {
  try {
    const sqlPath = path.resolve(process.cwd(), '../database/run_all.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Seeding database with run_all.sql...');
    await pool.query(sql);
    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seed();

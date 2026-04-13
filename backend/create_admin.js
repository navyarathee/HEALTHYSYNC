const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '/Users/navyarathee/HEALTHYSNC/backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  const email = 'admin@healthsync.com';
  const password = 'admin123';
  
  try {
    const hashed = await bcrypt.hash(password, 10);
    const res = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
      [email, hashed, 'ADMIN']
    );
    
    if (res.rows.length > 0) {
      const userId = res.rows[0].id;
      await pool.query(
        'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
        [userId, 'System Administrator']
      );
      console.log(`✅ Admin created: ${email} / ${password}`);
    } else {
      console.log(`ℹ️ Admin account ${email} already exists.`);
    }
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();

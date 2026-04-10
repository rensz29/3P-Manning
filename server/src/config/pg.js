const { Pool } = require('pg');

const PG_URI =
  process.env.PG_URI ||
  'postgresql://postgres:password@localhost:5432/your_db';

let pool;

const connect = async () => {
  pool = new Pool({
    connectionString: PG_URI,
  });

  // Test connection immediately
  try {
    const client = await pool.connect();

    console.log(`✅ PostgreSQL connected: ${client.host}`);

    client.release();
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    throw err;
  }

  // Optional: pool-level error listener
  pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
  });
};

const disconnect = async () => {
  if (pool) {
    await pool.end();
    console.log('PostgreSQL connection closed.');
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('PostgreSQL not connected. Call connect() first.');
  }
  return pool;
};

module.exports = {
  connect,
  disconnect,
  getPool,
};
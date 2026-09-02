const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

async function getContainerStates() {
  const dbResult = await pool.query('SELECT container_id, intentional_stop FROM container_states');
  const statesMap = {};
  dbResult.rows.forEach(row => {
    statesMap[row.container_id] = row.intentional_stop;
  });
  return statesMap;
}

async function setIntentionalStop(containerId, containerName, isIntentional) {
  const query = `
    INSERT INTO container_states (container_id, container_name, intentional_stop, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (container_id) 
    DO UPDATE SET intentional_stop = $3, updated_at = NOW();
  `;
  await pool.query(query, [containerId, containerName, isIntentional]);
}

module.exports = {
  getContainerStates,
  setIntentionalStop
};
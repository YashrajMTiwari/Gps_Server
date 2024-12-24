const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const port = 3000;

// PostgreSQL connection
const pool = new Pool({
  user: 'root',          // Replace with your PostgreSQL username
  host: 'localhost',     // Should be localhost if PostgreSQL is on the same machine
  database: 'devicedata', // Make sure this database exists
  password: 'root',      // Replace with your password
  port: 5432,            // Default port for PostgreSQL
});
app.use(cors());
app.use(express.json());

app.post('/location', async (req, res) => {
  const { device_id, latitude, longitude } = req.body;

  try {
    const query = `
      INSERT INTO device_location (deviceid, latitude, longitude)
      VALUES ($1, $2, $3)
      ON CONFLICT (deviceid)
      DO UPDATE SET latitude = $2, longitude = $3
    `;

    await pool.query(query, [device_id, latitude, longitude]);
    res.status(200).send({ message: 'Location data updated successfully' });
  } catch (err) {
    console.error('Error storing location data:', err.stack);
    res.status(500).send({ error: 'Failed to store location data' });
  }
});

app.get('/location/:device_id', async (req, res) => {
  const { device_id } = req.params;

  try {
    const query = `
      SELECT deviceid, latitude, longitude 
      FROM device_location
      WHERE deviceid = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [device_id]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).send({ error: 'Device not found' });
    }
  } catch (err) {
    console.error('Error fetching location data:', err.stack);
    res.status(500).send({ error: 'Failed to fetch location data' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

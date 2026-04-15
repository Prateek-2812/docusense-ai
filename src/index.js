require('dotenv').config();
const express = require('express');
const routes = require('./routes/api');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Mount API routes
app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

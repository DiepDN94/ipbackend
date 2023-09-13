const express = require('express');
const app = express();
const PORT = 4000;
const cors = require('cors');

app.use(cors())

app.get('/health-check', (req, res) => {
  res.send('Healthy');
});

app.get('/', (req, res) => {
    res.send('Hello World')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

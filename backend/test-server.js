console.log('Test server starting...');
const express = require('express');
console.log('Express loaded successfully');
const app = express();
const PORT = 3001;

app.get('/test', (req, res) => {
  res.json({ message: 'Test server is working!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

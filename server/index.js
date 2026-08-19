const path = require('path');
const express = require('express');
const cors = require('cors');
const { port } = require('./config');
const entriesRouter = require('./routes/entries');
const scheduler = require('./scheduler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api', entriesRouter);

app.listen(port, () => {
  console.log(`SAP shift allowance tracker running at http://localhost:${port}`);
  scheduler.start();
});

const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.post('/log', (req, res) => {
  console.log("\n\n=== CLIENT ERROR ===");
  console.log(req.body.message);
  console.log(req.body.stack);
  console.log("====================\n\n");
  res.sendStatus(200);
});
app.listen(4000, () => console.log("Log server running on 4000"));

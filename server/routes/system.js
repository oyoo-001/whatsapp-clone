const express = require("express");
const router = express.Router();

router.get("/version", (req, res) => {
  res.json({
    minVersion: "1.0.8",
    downloadUrl: "https://t.me/tuchatapp",
  });
});

module.exports = router;

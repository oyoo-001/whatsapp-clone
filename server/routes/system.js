const express = require("express");
const router = express.Router();

router.get("/version", (req, res) => {
  res.json({
    minVersion: "1.0.7",
    downloadUrl: "https://tuconnect.onrender.com/download-latest-apk",
  });
});

module.exports = router;

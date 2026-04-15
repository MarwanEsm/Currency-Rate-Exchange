const {onRequest} = require("firebase-functions/v2/https");

// Health check endpoint for deployment validation.
exports.health = onRequest((request, response) => {
  response.status(200).json({status: "ok"});
});

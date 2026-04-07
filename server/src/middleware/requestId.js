const { v4: uuidv4 } = require("uuid");

/**
 * Attaches a unique request ID to every request for traceability.
 * Honours X-Request-Id header if provided by the client / load balancer.
 */
const requestId = (req, res, next) => {
  req.id = req.headers["x-request-id"] || uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
};

module.exports = { requestId };

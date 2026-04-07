const { AppError } = require("../utils/errors");

const notFound = (req, _res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
};

module.exports = { notFound };

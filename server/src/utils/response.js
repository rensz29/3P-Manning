/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {object} data   - Payload to return
 * @param {number} status - HTTP status (default 200)
 * @param {object} meta   - Optional pagination / meta info
 */
const sendSuccess = (res, data, status = 200, meta = {}) => {
  const body = { status: "success", data };
  if (Object.keys(meta).length) body.meta = meta;
  res.status(status).json(body);
};

/**
 * Send a paginated list response.
 */
const sendPaginated = (res, items, { page, limit, total }) => {
  sendSuccess(
    res,
    items,
    200,
    {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  );
};

module.exports = { sendSuccess, sendPaginated };

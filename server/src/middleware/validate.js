/**
 * Returns an Express middleware that validates req.body (or req.query / req.params)
 * against the provided Zod schema.
 *
 * Usage:
 *   router.post("/", validate(createUserSchema), controller.create)
 *   router.get("/", validate(listQuerySchema, "query"), controller.list)
 */
const validate = (schema, source = "body") => (req, _res, next) => {
  // ZodError is thrown synchronously — the global error handler picks it up
  req[source] = schema.parse(req[source]);
  next();
};

module.exports = { validate };

const { z } = require("zod");

const createUserSchema = z.object({
  name:  z.string().min(1).max(100).trim(),
  email: z.string().email(),
  role:  z.enum(["admin", "member"]).default("member"),
});

const updateUserSchema = createUserSchema.partial();

const listQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  role:  z.enum(["admin", "member"]).optional(),
});

module.exports = { createUserSchema, updateUserSchema, listQuerySchema };

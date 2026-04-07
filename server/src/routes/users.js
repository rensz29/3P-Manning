const router = require("express").Router();
const controller = require("../controllers/usersController");
const { validate } = require("../middleware/validate");
const { createUserSchema, updateUserSchema, listQuerySchema } = require("../models/userSchema");

router
  .route("/")
  .get(validate(listQuerySchema, "query"), controller.list)
  .post(validate(createUserSchema), controller.create);

router
  .route("/:id")
  .get(controller.getOne)
  .patch(validate(updateUserSchema), controller.update)
  .delete(controller.remove);

module.exports = router;

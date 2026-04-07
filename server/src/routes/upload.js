const router = require("express").Router();
const { validate } = require("../middleware/validate.js");
const { z } = require("zod");
const { catchAsync, AppError } = require("../utils/errors.js");
const { sendSuccess, sendPaginated } = require("../utils/response.js");
const dressings = require('../models/scheduleDressingSchema.js');
const savoury = require('../models/scheduleSavourySchema.js');

// const listSchema = z.object({
//   lineID:  z.string().min(1).max(200).trim(),
//   SKU_Running: z.string().min(1).max(200).trim(),
//   CL_Destination_Desc: z.string().min(1).max(200).trim(),
//   CL_Destination:z.number().int().nonnegative().default(0),
//   ESM_HT_Level:z.number().int().nonnegative().default(0),
// });

// ── Handlers ──────────────────────────────────────────────────────────────────

router.post("/", catchAsync(async (req, res) => {
  const { format, records} = req.body
  console.log(records)
  if(format == 'dressings'){
    dressings.insertMany(records);
  }else{
    savoury.insertMany(records);
  }
  sendSuccess(res, "Highbyte", 201);
}));

module.exports = router;

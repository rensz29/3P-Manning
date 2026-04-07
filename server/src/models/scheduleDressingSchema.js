const mongoose = require('mongoose');

const scheduleDressingSchema = new mongoose.Schema(
  {
    section: {
        type: String,
        required: true
    },
    machine: {
        type: String,
        required: true
    },
    sku: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: String,
        default: null
    },
    day_name: {
        type: String,
        required: true
    },
    shift: {
        type: Number,
        required: true
    },
    qty: {
        type: Number,
        required: true
    },
    variant: {
        type: String,   
        default:""
    },
    total_cs: {
        type: Number,
        default: null
    },
    batches: {
        type: Number,
        default: null
    },
  },
  {
    timestamps: false // since you're manually handling lastUpdated
  }
);

module.exports = mongoose.model('ScheduleDressing', scheduleDressingSchema, 'scheduleDressing');
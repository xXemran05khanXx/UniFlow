const mongoose = require('mongoose');

const divisionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // "A", "A1", "B", "B2"
  semester: { type: Number, required: true }, // 8
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  
  // If this is a lab batch (A1), parentDivision will be "A"
  // If this is a main division (A), parentDivision will be null
  parentDivision: { type: mongoose.Schema.Types.ObjectId, ref: 'Division', default: null },
  
  type: { 
    type: String, 
    enum: ['theory', 'lab'], 
    required: true 
  },
  
  maxSeats: { type: Number, default: 25 } // As you mentioned for labs
});

module.exports = mongoose.model('Division', divisionSchema);
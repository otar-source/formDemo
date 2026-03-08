const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  serialNumber: Number,
  identificationNumber: String,
  description: String,
  wllSwl: String,
  lastExamDate: Date,
  manufactureDate: Date,
  nextExamDate: Date,
  testDetails: String,
  statusCode: String,       // ND, SDR, NF, OBS
  safeToUse: String         // 'YES' or 'NO'
});

const certificateSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  status: { type: String, enum: ['draft', 'active'], default: 'draft' },
  certificateNo: String,
  dateOfExamination: Date,
  dateOfReport: Date,
  colourCode: String,
  employerName: String,
  employerAddress: String,
  premisesAddress: String,
  equipment: [equipmentSchema],
  reportReason: String,      // A, B, C, D, E
  defectSheetAttached: Boolean,
  relevantStandard: String,
  inspectorName: String,
  inspectorQual: String,
  inspectorSignature: String,   // data URL from canvas
  checkedByName: String,
  checkedByQual: String,
  checkedBySignature: String,   // data URL
  pdfPath: String,               // relative path to PDF file
  qrCodeData: String             // optional, base64 of QR
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
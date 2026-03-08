const Certificate = require('../models/Certificate');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const generatePDF = require('../utils/pdfGenerator');

// Create a new certificate (POST)
exports.createCertificate = async (req, res) => {
  try {
    const formData = req.body;

    // Generate a unique ID
    const uuid = uuidv4();
    const verificationUrl = `${req.protocol}://${req.get('host')}/verify/${uuid}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(verificationUrl);

    // Prepare data for DB
    const certData = {
      uuid,
      status: 'active', // directly active, no draft
      ...formData,
      equipment: formData.equipment.map((eq, index) => ({
        ...eq,
        sn: (index + 1).toString() // ensure serial numbers are set
      }))
    };

    // Save to MongoDB
    const certificate = new Certificate(certData);
    await certificate.save();

    // Return info to client (PDF will be generated on demand)
    res.json({
      success: true,
      qrImage: qrDataUrl,
      pdfUrl: `/api/certificates/${uuid}/pdf`,
      verifyUrl: verificationUrl,
      uuid
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get certificate data (JSON) – used by verification page
exports.getCertificate = async (req, res) => {
  try {
    const { uuid } = req.params;
    const cert = await Certificate.findOne({ uuid, status: 'active' });
    if (!cert) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }
    res.json({ success: true, data: cert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Download PDF
exports.downloadPDF = async (req, res) => {
  try {
    const { uuid } = req.params;
    const cert = await Certificate.findOne({ uuid, status: 'active' });
    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Generate QR code for the verification URL
    const verificationUrl = `${req.protocol}://${req.get('host')}/verify/${uuid}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl);

    // Generate PDF buffer (pass true to return buffer instead of saving)
    const pdfBuffer = await generatePDF(cert, qrDataUrl, true);

    // Send as downloadable PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${uuid}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};
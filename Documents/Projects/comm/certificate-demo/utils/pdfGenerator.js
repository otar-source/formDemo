const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Helper to convert image to base64
function getBase64Image(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Image not found: ${filePath}`);
      return '';
    }
    const image = fs.readFileSync(filePath);
    return `data:image/${path.extname(filePath).substring(1)};base64,${image.toString('base64')}`;
  } catch (err) {
    console.warn(`Error reading image ${filePath}:`, err.message);
    return '';
  }
}

async function generatePDF(certData, qrDataUrl, returnBuffer = false) {
  // Define image paths with your actual filenames
  const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.png');
  const isoPath = path.join(__dirname, '..', 'public', 'images', 'iso.png');
  const iadcPath = path.join(__dirname, '..', 'public', 'images', 'dit.png');      // IADC DIT
  const leeaPath = path.join(__dirname, '..', 'public', 'images', 'lefa.png');     // LEEA
  const nigeriaPath = path.join(__dirname, '..', 'public', 'images', 'gov.png');   // Nigerian Government Seal
  const labourPath = path.join(__dirname, '..', 'public', 'images', 'labour-employment.png'); // keep if you have it

  // Load images as base64
  const logoBase64 = getBase64Image(logoPath);
  const isoBase64 = getBase64Image(isoPath);
  const iadcBase64 = getBase64Image(iadcPath);
  const leeaBase64 = getBase64Image(leeaPath);
  const nigeriaBase64 = getBase64Image(nigeriaPath);
  const labourBase64 = getBase64Image(labourPath);

  const html = buildHTML(certData, qrDataUrl, logoBase64, isoBase64, iadcBase64, leeaBase64, nigeriaBase64, labourBase64);

  // Launch Puppeteer with Render-compatible arguments
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
  });

  await browser.close();

  if (returnBuffer) {
    return pdfBuffer;
  } else {
    // Original behavior: save to file (not used on Render)
    const outputPath = path.join(__dirname, '..', 'certificates', `${certData.uuid}.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);
    return outputPath;
  }
}

function buildHTML(certData, qrDataUrl, logoBase64, isoBase64, iadcBase64, leeaBase64, nigeriaBase64, labourBase64) {
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : '';

  const checkedReason = certData.overallReasons && certData.overallReasons.length > 0 ? certData.overallReasons[0] : 'B';

  const equipmentRows = certData.equipment.map(eq => `
    <tr>
      <td>${eq.sn}</td>
      <td>${eq.identificationNumber}</td>
      <td>${eq.description}</td>
      <td>${eq.wllSwl}</td>
      <td>${formatDate(eq.lastExamDate)}</td>
      <td>${eq.manufactureDate ? formatDate(eq.manufactureDate) : '-'}</td>
      <td>${formatDate(eq.nextExamDate)}</td>
      <td>${eq.reason}</td>
      <td>${eq.testDetails || ''}</td>
      <td>${eq.statusCode}</td>
      <td>${eq.safeToUse}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Same CSS as before – keep it identical to ensure proper layout */
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      background: #fff;
      line-height: 1.3;
      width: 100%;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .logo-section { width: 120px; }
    .company-logo { max-width: 100px; max-height: 60px; object-fit: contain; }
    .title-section { text-align: center; flex: 1; }
    .title-section h1 { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin: 0; }
    .subtitle { font-size: 10pt; font-style: italic; }
    .header-spacer { width: 120px; }

    .header-fields { border: 1px solid #000; padding: 8px; margin-bottom: 12px; }
    .header-row {
      display: flex;
      justify-content: space-between;
      flex-wrap: nowrap;
      gap: 15px;
    }
    .header-row > div {
      flex: 1 1 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dual-column { display: flex; border: 1px solid #000; margin-bottom: 12px; }
    .employer-box, .premises-box { flex: 1; padding: 8px; border-right: 1px solid #000; }
    .premises-box { border-right: none; }
    .field-label { font-weight: bold; font-size: 10pt; }

    .status-legend { border: 1px solid #000; padding: 5px 10px; margin-bottom: 12px; }
    .status-codes { display: flex; gap: 20px; font-size: 10pt; flex-wrap: wrap; }

    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 12px 0; }
    th, td { border: 1px solid #000; padding: 5px; text-align: center; vertical-align: middle; }
    th { background: #e0e0e0; }

    .reason-section { border: 1px solid #000; padding: 8px 12px; margin-bottom: 12px; }
    .reason-options { display: flex; gap: 20px; font-size: 10pt; flex-wrap: wrap; }

    .additional-info { display: flex; border: 1px solid #000; margin-bottom: 12px; }
    .defect-section, .standard-section {
      flex: 1; padding: 8px; border-right: 1px solid #000;
      display: flex; align-items: center; gap: 15px; flex-wrap: wrap;
    }
    .standard-section { border-right: none; }

    .signatures-section {
      display: flex; border: 1px solid #000;
      margin-bottom: 40px;
    }
    .inspector-box, .checked-by-box {
      flex: 1; padding: 10px; border-right: 1px solid #000;
    }
    .checked-by-box { border-right: none; }
    .signature-img { max-width: 200px; max-height: 60px; border: 1px solid #aaa; margin: 5px 0; }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #000;
      padding-top: 10px;
      margin-top: 10px;
      width: 100%;
    }
    .qr { width: 100px; }
    .qr img { width: 100px; height: 100px; }
    .logos-row {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .logos-row img { max-height: 40px; max-width: 80px; object-fit: contain; }
    .missing-image { color: #999; font-style: italic; border: 1px dashed #aaa; padding: 2px 4px; }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="logo-section">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Company Logo" class="company-logo">` : '<span class="missing-image">[Logo]</span>'}
    </div>
    <div class="title-section">
      <h1>Report Of Thorough Examination</h1>
      <div class="subtitle">This report meets the requirements of schedule 1 of regulation 10 of LOLER 1998</div>
    </div>
    <div class="header-spacer"></div>
  </div>

  <div class="header-fields">
    <div class="header-row">
      <div><strong>Certificate No:</strong> ${certData.certificateNo}</div>
      <div><strong>Date of Examination:</strong> ${formatDate(certData.dateOfExamination)}</div>
      <div><strong>Date of Report:</strong> ${formatDate(certData.dateOfReport)}</div>
      <div><strong>Colour code:</strong> ${certData.colourCode || ''}</div>
    </div>
  </div>

  <div class="dual-column">
    <div class="employer-box">
      <div class="field-label">Name & Address of the employer:</div>
      <div>${certData.employerNameAddress.replace(/\n/g, '<br>')}</div>
    </div>
    <div class="premises-box">
      <div class="field-label">Address of the premises:</div>
      <div>${certData.premisesAddress.replace(/\n/g, '<br>')}</div>
    </div>
  </div>

  <div class="status-legend">
    <div class="field-label">Status Codes:</div>
    <div class="status-codes">
      <span>ND – No Defect</span>
      <span>SDR – See Defect Report</span>
      <span>NF – Not Found</span>
      <span>OBS – Observation</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>S/N</th><th>Identification Number</th><th>Description</th><th>WLL or SWL</th>
        <th>Last Exam Date</th><th>Manufacture Date</th><th>Next Exam Date</th>
        <th>Reason</th><th>Test Details</th><th>Status</th><th>Safe to Use</th>
      </tr>
    </thead>
    <tbody>
      ${equipmentRows}
    </tbody>
  </table>

  <div class="reason-section">
    <div class="field-label">Reason for Examination</div>
    <div class="reason-options">
      <span>Installation: A ${checkedReason === 'A' ? '✓' : ''}</span>
      <span>6 Monthly: B ${checkedReason === 'B' ? '✓' : ''}</span>
      <span>12 Monthly: C ${checkedReason === 'C' ? '✓' : ''}</span>
      <span>Written Scheme: D ${checkedReason === 'D' ? '✓' : ''}</span>
      <span>Exceptional Circumstance: E ${checkedReason === 'E' ? '✓' : ''}</span>
    </div>
  </div>

  <div class="additional-info">
    <div class="defect-section">
      <span class="field-label">Defect sheet attached?</span>
      <span>${certData.defectSheetAttached ? 'Yes' : 'No'}</span>
    </div>
    <div class="standard-section">
      <span class="field-label">Relevant standard</span>
      <span>${certData.relevantStandard}</span>
    </div>
  </div>

  <div class="signatures-section">
    <div class="inspector-box">
      <div class="field-label">Inspector's Name/Qualification</div>
      <div><strong>${certData.inspectorName}</strong></div>
      <div><img class="signature-img" src="${certData.inspectorSignature}" alt="Inspector Signature" onerror="this.style.display='none'; this.parentNode.innerHTML += '<span class=\\'missing-image\\'>[Signature missing]</span>';"></div>
      <div>${certData.inspectorQual.replace(/\n/g, '<br>')}</div>
    </div>
    <div class="checked-by-box">
      <div class="field-label">Checked by Name/Qualification</div>
      <div><strong>${certData.checkedByName}</strong></div>
      <div><img class="signature-img" src="${certData.checkedBySignature}" alt="Checked Signature" onerror="this.style.display='none'; this.parentNode.innerHTML += '<span class=\\'missing-image\\'>[Signature missing]</span>';"></div>
      <div>${certData.checkedByQual.replace(/\n/g, '<br>')}</div>
    </div>
  </div>

  <div class="footer">
    <div class="qr">
      <img src="${qrDataUrl}" alt="QR Code">
    </div>
    <div class="logos-row">
      ${isoBase64 ? `<img src="${isoBase64}" alt="ISO 9001:2015">` : '<span class="missing-image">[ISO]</span>'}
      ${iadcBase64 ? `<img src="${iadcBase64}" alt="IADC DIT">` : '<span class="missing-image">[IADC]</span>'}
      ${leeaBase64 ? `<img src="${leeaBase64}" alt="LEEA">` : '<span class="missing-image">[LEEA]</span>'}
      ${nigeriaBase64 ? `<img src="${nigeriaBase64}" alt="Nigerian Government Seal">` : '<span class="missing-image">[Nigeria]</span>'}
      ${labourBase64 ? `<img src="${labourBase64}" alt="Federal Ministry of Labour & Employment">` : '<span class="missing-image">[Labour]</span>'}
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = generatePDF;
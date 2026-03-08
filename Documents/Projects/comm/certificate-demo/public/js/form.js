// Store signature data URLs
let inspectorDataURL = null;
let checkedDataURL = null;

window.onload = function() {
  // File upload handlers
  document.getElementById('inspectorFile').addEventListener('change', function(e) {
    handleFileUpload(e, 'inspectorPreview', 'inspectorSignature');
  });
  document.getElementById('checkedFile').addEventListener('change', function(e) {
    handleFileUpload(e, 'checkedPreview', 'checkedSignature');
  });

  // Make overall reason checkboxes behave like radio (only one checked)
  const reasonCheckboxes = document.querySelectorAll('input[name="reasonExam"]');
  reasonCheckboxes.forEach(cb => {
    cb.addEventListener('change', function() {
      if (this.checked) {
        reasonCheckboxes.forEach(other => {
          if (other !== this) other.checked = false;
        });
      }
    });
  });

  // Add initial equipment row
  addEquipmentRow();

  // Add row button
  document.getElementById('addRow').addEventListener('click', addEquipmentRow);

  // Remove row (delegation)
  document.getElementById('equipmentRows').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-row')) {
      e.target.closest('tr').remove();
      renumberRows();
    }
  });

  // Form submission
  document.getElementById('certForm').addEventListener('submit', submitForm);
};

// Convert uploaded file to data URL and set preview
function handleFileUpload(event, previewId, hiddenId) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataURL = e.target.result;
    const previewDiv = document.getElementById(previewId);
    previewDiv.innerHTML = `<img src="${dataURL}" alt="Signature">`;
    document.getElementById(hiddenId).value = dataURL;
  };
  reader.readAsDataURL(file);
}

// Renumber S/N fields after add/remove
function renumberRows() {
  const rows = document.querySelectorAll('#equipmentRows tr');
  rows.forEach((row, index) => {
    const snSpan = row.querySelector('.sn-display');
    const snInput = row.querySelector('.sn-input');
    if (snSpan) snSpan.textContent = index + 1;
    if (snInput) snInput.value = index + 1;
  });
}

function addEquipmentRow() {
  const tbody = document.getElementById('equipmentRows');
  const newRow = document.createElement('tr');
  newRow.className = 'equipment-row';
  newRow.innerHTML = `
    <td><span class="sn-display"></span><input type="hidden" name="sn[]" class="sn-input"></td>
    <td><input type="text" name="identNo[]" required></td>
    <td><textarea name="description[]" rows="2" required></textarea></td>
    <td><input type="text" name="wll[]" size="4" required></td>
    <td><input type="date" name="lastExamDate[]" required></td>
    <td><input type="date" name="manufactureDate[]"></td>
    <td><input type="date" name="nextExamDate[]" required></td>
    <td>
      <select name="reason[]" required>
        <option value="A">A</option>
        <option value="B" selected>B</option>
        <option value="C">C</option>
        <option value="D">D</option>
        <option value="E">E</option>
      </select>
    </td>
    <td><input type="text" name="testDetails[]" value="Nil" size="6"></td>
    <td>
      <select name="status[]" required>
        <option value="ND" selected>ND</option>
        <option value="SDR">SDR</option>
        <option value="NF">NF</option>
        <option value="OBS">OBS</option>
      </select>
    </td>
    <td>
      <select name="safeToUse[]" required>
        <option value="YES" selected>YES</option>
        <option value="NO">NO</option>
      </select>
    </td>
    <td><button type="button" class="remove-row">×</button></td>
  `;
  tbody.appendChild(newRow);
  renumberRows();
}

async function submitForm(e) {
  e.preventDefault();

  // Validate file uploads
  const inspectorFile = document.getElementById('inspectorFile').files[0];
  const checkedFile = document.getElementById('checkedFile').files[0];
  if (!inspectorFile || !checkedFile) {
    alert('Please upload both signature images');
    return;
  }

  // Collect equipment data
  const equipment = [];
  const rows = document.querySelectorAll('#equipmentRows tr');
  rows.forEach((row) => {
    const inputs = row.querySelectorAll('input:not([type=hidden]), textarea, select');
    // Order: identNo, description, wll, lastExamDate, manufactureDate, nextExamDate, reason, testDetails, status, safeToUse
    const sn = row.querySelector('.sn-input').value;
    equipment.push({
      sn,
      identificationNumber: inputs[0].value,
      description: inputs[1].value,
      wllSwl: inputs[2].value,
      lastExamDate: inputs[3].value,
      manufactureDate: inputs[4].value || null,
      nextExamDate: inputs[5].value,
      reason: inputs[6].value,
      testDetails: inputs[7].value,
      statusCode: inputs[8].value,
      safeToUse: inputs[9].value
    });
  });

  // Collect overall reason checkboxes (only the checked one, if any)
  const overallReasons = [];
  document.querySelectorAll('input[name="reasonExam"]:checked').forEach(cb => {
    overallReasons.push(cb.value);
  });

  // Get signature data URLs from hidden fields
  const inspectorSignature = document.getElementById('inspectorSignature').value;
  const checkedSignature = document.getElementById('checkedSignature').value;

  // Build payload
  const formData = {
    certificateNo: document.querySelector('input[name="certificateNo"]').value,
    dateOfExamination: document.querySelector('input[name="dateOfExamination"]').value,
    dateOfReport: document.querySelector('input[name="dateOfReport"]').value,
    colourCode: document.querySelector('input[name="colourCode"]').value,
    employerNameAddress: document.querySelector('textarea[name="employerNameAddress"]').value,
    premisesAddress: document.querySelector('textarea[name="premisesAddress"]').value,
    equipment,
    overallReasons,
    defectSheetAttached: document.querySelector('input[name="defectSheetAttached"]:checked').value === 'true',
    relevantStandard: document.querySelector('input[name="relevantStandard"]').value,
    inspectorName: document.querySelector('input[name="inspectorName"]').value,
    inspectorQual: document.querySelector('textarea[name="inspectorQual"]').value,
    inspectorSignature,
    checkedByName: document.querySelector('input[name="checkedByName"]').value,
    checkedByQual: document.querySelector('textarea[name="checkedByQual"]').value,
    checkedBySignature: checkedSignature
  };

  // Send to backend
  const response = await fetch('/api/certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  const result = await response.json();
  if (result.success) {
    document.getElementById('qrImage').src = result.qrImage;
    document.getElementById('pdfLink').href = result.pdfUrl;
    document.getElementById('verifyLink').href = result.verifyUrl;
    document.getElementById('result').style.display = 'block';
  } else {
    alert('Error: ' + result.error);
  }
}
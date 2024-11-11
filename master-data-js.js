
//Date generator
const now = new Date();
now.setHours(now.getUTCHours() - 8);

// Load and populate filter options
function loadFilterOptions() {
    openDB().then(db => {
        const transaction = db.transaction(['inspections'], 'readonly');
        const store = transaction.objectStore('inspections');
        const request = store.getAll();

        request.onsuccess = function(event) {
            const inspections = event.target.result;

            // Get unique values for each filter
            const models = [...new Set(inspections.map(i => i.model))];
            const partNumbers = [...new Set(inspections.map(i => i.part_number))];
            const partTypes = [...new Set(inspections.map(i => i.part_type))];
            const defects = [...new Set(inspections.map(i => i.defect).filter(Boolean))];
            const vendors = [...new Set(inspections.map(i => i.vendor))];

            // Populate filter dropdowns
            populateSelect('modelFilter', models);
            populateSelect('partNumberFilter', partNumbers);
            populateSelect('partTypeFilter', partTypes);
            populateSelect('defectFilter', defects);
            populateSelect('vendorFilter', vendors);
        };
    });
}

function populateSelect(elementId, options) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">All</option>';
    options.forEach(option => {
        if (option) {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            select.appendChild(optElement);
        }
    });
}

// Load inspection data with filters
function loadInspectionData() {
    //const dateRange = $('#daterange').data('daterangepicker');
    const filters = {
        startDate: document.getElementById("dateFromFilterMaster").value,
        endDate: document.getElementById("dateToFilterMaster").value,
        model: document.getElementById('modelFilter').value,
        partNumber: document.getElementById('partNumberFilter').value,
        partType: document.getElementById('partTypeFilter').value,
        defect: document.getElementById('defectFilter').value,
        vendor: document.getElementById('vendorFilter').value,
        serialNumber: document.getElementById('serialNumberFilter').value
    };

    openDB().then(db => {
        const transaction = db.transaction(['inspections'], 'readonly');
        const store = transaction.objectStore('inspections');
        const request = store.getAll();

        request.onsuccess = function(event) {
            let inspections = event.target.result;

            // Apply filters only if they have values
            inspections = inspections.filter(inspection => {
                // Only apply date filter if both dates are set
                const dateFilter = filters.startDate && filters.endDate ? 
                    (new Date(inspection.date) >= new Date(filters.startDate) &&
                     new Date(inspection.date) <= new Date(filters.endDate)) : true;

                     return dateFilter &&
                     (!filters.model || inspection.model === filters.model) &&
                     (!filters.partNumber || inspection.part_number === filters.partNumber) &&
                     (!filters.partType || inspection.part_type === filters.partType) &&
                     (!filters.defect || inspection.defect === filters.defect) &&
                     (!filters.vendor || inspection.vendor === filters.vendor) &&
                     (!filters.serialNumber || inspection.serial_number.includes(filters.serialNumber));
            });

            updateTable(inspections);
        };
    });
}

function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('dateFromFilterMaster').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('dateToFilterMaster').value = today.toISOString().split('T')[0];
}

// Update table with filtered data
function updateTable(inspections) {
    const tbody = document.querySelector('#masterDataTable tbody');
    tbody.innerHTML = '';

    inspections.forEach(inspection => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${inspection.date}</td>
            <td>${inspection.time}</td>
            <td>${inspection.part_number}</td>
            <td>${inspection.model}</td>
            <td>${inspection.line}</td>
            <td>${inspection.vendor}</td>
            <td>${inspection.part_type}</td>
            <td>${inspection.serial_number}</td>
            <td>${inspection.status}</td>
            <td>${inspection.defect || ''}</td>
            <td>${inspection.part || ''}</td>
            <td>${inspection.area || ''}</td>
            <td>${inspection.photo ? '<a href="#" onclick="showImageModal(event, \'' + inspection.photo + '\')">View Image</a>' : ''}</td>
            <td>${inspection.defect2 || ''}</td>
            <td>${inspection.part2 || ''}</td>
            <td>${inspection.area2 || ''}</td>
            <td>${inspection.photo2 ? '<a href="#" onclick="showImageModal2(event, \'' + inspection.photo2 + '\')">View Image</a>' : ''}</td>
        `;
    });
}

// Function to show image in modal when link is clicked
function showImageModal(event, imageData) {
    event.preventDefault();
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const img = document.createElement('img');
    img.src = imageData;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;
    
    modal.onclick = () => modal.remove();
    modal.appendChild(img);
    document.body.appendChild(modal);
}

// Function 2 to show image in modal when link is clicked
function showImageModal2(event, imageData2) {
    event.preventDefault();
    const modal2 = document.createElement('div');
    modal2.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const img2 = document.createElement('img');
    img2.src = imageData2;
    img2.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;
    
    // Corrigir erro de digitação na criação do elemento
    img2.onerror = () => {
        console.error('Erro ao carregar a imagem');
        modal2.innerHTML = '<p style="color: white;">Erro ao carregar a imagem</p>';
    };
    
    modal2.onclick = () => modal2.remove();
    modal2.appendChild(img2);
    document.body.appendChild(modal2);
}

// Export to Excel
function exportToExcel() {
    const table = document.getElementById('masterDataTable');
    const ws = XLSX.utils.table_to_sheet(table);

    // Apply formatting
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = {c: C, r: R};
            const cell_ref = XLSX.utils.encode_cell(cell_address);

            if (!ws[cell_ref]) continue;

            // Add cell styling
            ws[cell_ref].s = {
                font: { name: "Arial" },
                alignment: { vertical: "center", horizontal: "center" },
                border: {
                    top: { style: "medium" },
                    bottom: { style: "medium" },
                    left: { style: "medium" },
                    right: { style: "medium" }
                }
            };

            // Header styling
            if (R === 0) {
                ws[cell_ref].s.font.bold = true;
                ws[cell_ref].s.fill = { fgColor: { rgb: "#c5d7fc" } };
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inspection Data");

    // Auto-size columns
    const cols = [];
    for (let i = 0; i <= range.e.c; ++i) {
        cols.push({ wch: 15 }); // Set default width
    }
    ws['!cols'] = cols;

    XLSX.writeFile(wb, `inspection_data_${now.toISOString().substring(0,10)}.xlsx`);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set default dates before loading data
    setDefaultDates();
    
    // Load all data first
    loadInspectionData();
    
    // Then populate filter options
    loadFilterOptions();

    // Add event listeners for filters
    const filters = ['dateFromFilterMaster', 'dateToFilterMaster', 'modelFilter', 'partNumberFilter', 'partTypeFilter', 
                    'defectFilter', 'vendorFilter', 'serialNumberFilter'];

    filters.forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', loadInspectionData);
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
});
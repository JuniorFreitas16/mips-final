//Date generator
const now = new Date();
now.setHours(now.getUTCHours() - 8);

document.addEventListener('DOMContentLoaded', function() {
    const table = document.querySelector('table');
    
    // Criar container de filtros acima da tabela
    const filterContainer = document.createElement('div');
    filterContainer.classList.add('filters-container');
    table.parentElement.insertBefore(filterContainer, table);

    // Adicionar filtros dinâmicos baseados nos cabeçalhos
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
        const filterInput = document.createElement('input');
        filterInput.setAttribute('type', 'text');
        filterInput.setAttribute('placeholder', `Filtrar ${header.textContent}`);
        filterInput.classList.add('column-filter');
        filterInput.dataset.columnIndex = index;
        filterContainer.appendChild(filterInput);
        
        filterInput.addEventListener('input', filterTable);
    });
    
    function filterTable() {
        const filters = Array.from(document.querySelectorAll('.column-filter'));
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const shouldShow = filters.every(filter => {
                const columnIndex = filter.dataset.columnIndex;
                const cellText = cells[columnIndex].textContent.toLowerCase();
                const filterValue = filter.value.toLowerCase();
                return cellText.includes(filterValue);
            });
            row.style.display = shouldShow ? '' : 'none';
        });
    }
    
    // Exportar para Excel
    function exportToExcel() {
        const table = document.getElementById('plan-list-table');
        const ws = XLSX.utils.table_to_sheet(table);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inspection Plans');
        
        // Formatação da tabela
        ws['!cols'] = Array(table.rows[0].cells.length).fill({ wch: 15 });
        
        XLSX.writeFile(wb, 'inspection_plans.xlsx');
    }

// Export to Excel
/*function exportToExcel() {
    const table = document.getElementById('plan-list-table');
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
                alignment: { vertical: "center", horizontal: "left" },
                border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" }
                }
            };

            // Header styling
            if (R === 0) {
                ws[cell_ref].s.font.bold = true;
                ws[cell_ref].s.fill = { fgColor: { rgb: "CCCCCC" } };
            }
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plans Data");

    // Auto-size columns
    const cols = [];
    for (let i = 0; i <= range.e.c; ++i) {
        cols.push({ wch: 15 }); // Set default width
    }
    ws['!cols'] = cols;

    XLSX.writeFile(wb, `plans_data_${now.toISOString().substring(0,10)}.xlsx`);
}*/

    
    // Botão de exportação
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export to Excel';
    exportButton.classList.add('export-button');
    exportButton.addEventListener('click', exportToExcel);
    table.parentElement.insertBefore(exportButton, table);
});


// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Export button
    document.getElementById('export-button').addEventListener('click', exportToExcel);
});
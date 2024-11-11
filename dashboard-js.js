document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    let defectChart, modelChart, vendorChart, trendChart;
    let currentFilters = {
        model: '',
        partNumber: '',
        vendor: '',
        dateFrom: '',
        dateTo: ''
    };

    // Initialize filters
    initializeFilters();
    
    // Load initial data
    loadDashboardData();


    // Add event listeners to filters
    document.querySelectorAll('.filter-group select, .filter-group input').forEach(filter => {
        filter.addEventListener('change', function() {
            updateFilters();
            loadDashboardData();
        });
    });

    function initializeFilters() {
        const dbRequest = indexedDB.open('panel_inspection_db', 1);
        
        dbRequest.onerror = function(event) {
            console.error('Error opening database:', event.target.error);
        };
        
        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            loadModelData(db);
            setDefaultDates();
        };
    }

    function loadModelData(db) {
        try {
            const transaction = db.transaction(['models'], 'readonly');
            const modelStore = transaction.objectStore('models');
            const request = modelStore.getAll();

            request.onsuccess = function(event) {
                const models = event.target.result;
                
                // Populate model filter
                const modelFilter = document.getElementById('modelFilter');
                const uniqueModels = [...new Set(models.map(m => m.model))];
                populateFilter(modelFilter, uniqueModels);

                // Populate part number filter
                const partNumberFilter = document.getElementById('partNumberFilter');
                const uniquePartNumbers = [...new Set(models.map(m => m.part_number))];
                populateFilter(partNumberFilter, uniquePartNumbers);

                // Populate vendor filter
                const vendorFilter = document.getElementById('vendorFilter');
                const uniqueVendors = [...new Set(models.map(m => m.vendor))];
                populateFilter(vendorFilter, uniqueVendors);
            };

            request.onerror = function(event) {
                console.error('Error loading model data:', event.target.error);
            };
        } catch (error) {
            console.error('Error in loadModelData:', error);
        }
    }

    function setDefaultDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        document.getElementById('dateFromFilter').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('dateToFilter').value = today.toISOString().split('T')[0];
    }

    function populateFilter(selectElement, options) {
        if (!selectElement) return;
        selectElement.innerHTML = '<option value="">All</option>';
        options.sort().forEach(option => {
            if (option) {  // Only add non-null/undefined options
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                selectElement.appendChild(opt);
            }
        });
    }

    function updateFilters() {
        currentFilters = {
            model: document.getElementById('modelFilter')?.value || '',
            partNumber: document.getElementById('partNumberFilter')?.value || '',
            vendor: document.getElementById('vendorFilter')?.value || '',
            dateFrom: document.getElementById('dateFromFilter')?.value || '',
            dateTo: document.getElementById('dateToFilter')?.value || ''
        };
    }

    function loadDashboardData() {
        const dbRequest = indexedDB.open('panel_inspection_db', 1);
        
        dbRequest.onerror = function(event) {
            console.error('Error opening database:', event.target.error);
        };
        
        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['inspections'], 'readonly');
            const inspectionStore = transaction.objectStore('inspections');
            const request = inspectionStore.getAll();

            request.onsuccess = function(event) {
                const inspections = event.target.result;
                const filteredInspections = filterInspections(inspections);
                updateMetrics(filteredInspections);
                updateCharts(filteredInspections);
            };

            request.onerror = function(event) {
                console.error('Error loading inspection data:', event.target.error);
            };
        };
    }

    function filterInspections(inspections) {
        return inspections.filter(inspection => {
            const inspectionDate = new Date(inspection.date);
            const fromDate = currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : null;
            const toDate = currentFilters.dateTo ? new Date(currentFilters.dateTo) : null;

            const dateMatches = (!fromDate || inspectionDate >= fromDate) &&
                              (!toDate || inspectionDate <= toDate);
            const modelMatches = !currentFilters.model || inspection.model === currentFilters.model;
            const partNumberMatches = !currentFilters.partNumber || inspection.part_number === currentFilters.partNumber;
            const vendorMatches = !currentFilters.vendor || inspection.vendor === currentFilters.vendor;

            return dateMatches && modelMatches && partNumberMatches && vendorMatches;
        });
    }

    function updateMetrics(inspections) {
        const total = inspections.length;
        const totalNG = inspections.filter(i => i.status === 'NG').length;
        const totalOK = total - totalNG;
        const ngRate = total > 0 ? ((totalNG / total) * 100).toFixed(2) : 0;

        document.getElementById('totalInspections').textContent = total;
        document.getElementById('overallNGRate').textContent = `${ngRate}%`;
        document.getElementById('totalOK').textContent = totalOK;
        document.getElementById('totalNG').textContent = totalNG;
    }

    function updateCharts(inspections) {
        // Prepare data for charts
        const defectData = prepareDefectChartData(inspections);
        const modelData = prepareModelChartData(inspections);
        const partData = prepareVendorChartData(inspections);
        const trendData = prepareTrendChartData(inspections);

        // Update or create charts
        updateDefectChart(defectData);
        updateModelChart(modelData);
        updateVendorChart(partData);
        updateTrendChart(trendData);
    }

    function prepareDefectChartData(inspections) {
        const defects = {};
        inspections.filter(i => i.status === 'NG').forEach(i => {
            defects[i.defect || 'Unknown'] = (defects[i.defect || 'Unknown'] || 0) + 1;
        });
    
        const sortedDefects = Object.entries(defects)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    
        return {
            labels: sortedDefects.map(([defect]) => defect),
            data: sortedDefects.map(([, count]) => count)
        };
    }
    
    function prepareModelChartData(inspections) {
        const areas = {};
        inspections.filter(i => i.status === 'NG').forEach(i => {
            areas[i.area] = (areas[i.area] || 0) + 1;
        });
    
        const sortedAreas = Object.entries(areas)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    
        return {
            labels: sortedAreas.map(([area]) => area),
            data: sortedAreas.map(([, count]) => count)
        };
    }
    
    function prepareVendorChartData(inspections) {
        const parts = {};
        inspections.filter(i => i.status === 'NG').forEach(i => {
            parts[i.part] = (parts[i.part] || 0) + 1;
        });
    
        const sortedParts = Object.entries(parts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    
        return {
            labels: sortedParts.map(([part]) => part),
            data: sortedParts.map(([, count]) => count)
        };
    }

    function prepareTrendChartData(inspections) {
        const trends = {};
        inspections.forEach(i => {
            const dateKey = new Date(i.date).toISOString().split('T')[0];
            if (!trends[dateKey]) {
                trends[dateKey] = { total: 0, ng: 0 };
            }
            trends[dateKey].total++;
            if (i.status === 'NG') {
                trends[dateKey].ng++;
            }
        });

        const sortedDates = Object.keys(trends).sort();
        return {
            labels: sortedDates,
            data: sortedDates.map(date => ({
                total: trends[date].total,
                ngRate: (trends[date].ng / trends[date].total * 100).toFixed(2)
            }))
        };
    }

    function updateDefectChart(data) {
        if (defectChart) {
            defectChart.destroy();
        }
    
        const ctx = document.getElementById('defectChart')?.getContext('2d');
        if (!ctx) return;
    
        defectChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Defects Count',
                    data: data.data,
                    backgroundColor: [
                        '#808080',
                        '#C0C0C0',
                        '#C0C0C0',
                        '#C0C0C0',
                        '#C0C0C0'
                    ],
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        display: false
                    },
                    x: {
                        beginAtZero: true,
                        display: true,
                        grid: {
                            display: false
                        }
                    }
                },
                responsive: true,
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value,
                        font: {
                            weight: 'bold'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Top 5 Worst Defects',
                        font:{
                            size: 16
                        }
                    },
                    legend: {
                        display: false
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }
    

function updateVendorChart(data) {
    if (vendorChart) {
        vendorChart.destroy();
    }

    const ctx = document.getElementById('vendorChart')?.getContext('2d');
    if (!ctx) return;

    vendorChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Parts Count',
                data: data.data,
                backgroundColor: [
                    '#808080',
                    '#C0C0C0',
                    '#C0C0C0',
                    '#C0C0C0',
                    '#C0C0C0'
                ]
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    display: false
                },
                x: {
                    beginAtZero: true,
                    display: true,
                    grid: {
                        display: false
                    }
                }
            },
            responsive: true,
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value,
                    font: {
                        weight: 'bold'
                    }
                },
                title: {
                    display: true,
                    text: 'Top 5 Worst Parts',
                    font:{
                        size: 16
                    }
                },
                legend:{
                    display: false,
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

    function updateModelChart(data) {
        if (modelChart) {
            modelChart.destroy();
        }

        const ctx = document.getElementById('modelChart')?.getContext('2d');
        if (!ctx) return;

        modelChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Zones Count',
                    data: data.data,
                    backgroundColor: [
                        '#808080',
                        '#C0C0C0',
                        '#C0C0C0',
                        '#C0C0C0',
                        '#C0C0C0'
                    ]
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        display: false
                    },
                    x: {
                        beginAtZero: true,
                        display: true,
                        grid: {
                            display: false
                        }
                    }
                },
                responsive: true,
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value,
                        font: {
                            weight: 'bold'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Top 5 Worst Zones',
                        font:{
                            size: 16
                        }
                    },
                    legend:{
                        display: false,
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    function updateTrendChart(data) {
        if (trendChart) {
            trendChart.destroy();
        }

        const ctx = document.getElementById('trendChart')?.getContext('2d');
        if (!ctx) return;

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Total Inspections',
                        data: data.data.map(d => d.total),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        yAxisID: 'y-axis-1',
                        font: {size: 16}
                    },
                    {
                        label: 'NG Rate (%)',
                        data: data.data.map(d => d.ngRate),
                        borderColor: 'rgba(255, 0, 0, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y-axis-2'
                    }
                ]
            },
            options: {
                aspectratio: 2,
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: "chartArea",
                        align: "end"
                    },
                    title: {
                        display: true,
                        text: 'Inspection Trend',
                        font:{
                            size: 16
                        }
                    }
                },
                scales: {
                    'y-axis-1': {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Total Inspections'
                        }
                    },
                    'y-axis-2': {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'NG Rate (%)'
                        },
                        grid: {
                            drawOnChartArea: true
                        }
                    }
                }
            }
        });
    }

   /* function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('panel_inspection_db', 1);
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('inspections')) {
                    db.createObjectStore('inspections', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('inspection_plans')) {
                    db.createObjectStore('inspection_plans', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('models')) {
                    db.createObjectStore('models', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }*/

    // Export functionality
    document.getElementById('exportButton')?.addEventListener('click', function() {
        const dbRequest = indexedDB.open('panel_inspection_db', 1);
        
        dbRequest.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['inspections'], 'readonly');
            const store = transaction.objectStore('inspections');
            const request = store.getAll();

            request.onsuccess = function(event) {
                const inspections = event.target.result;
                const filteredInspections = filterInspections(inspections);
                const csv = convertToCSV(filteredInspections);
                downloadCSV(csv, 'inspection_data.csv');
            };

            request.onerror = function(event) {
                console.error('Error exporting data:', event.target.error);
            };
        };

        dbRequest.onerror = function(event) {
            console.error('Error opening database for export:', event.target.error);
        };
    });
});



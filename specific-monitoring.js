class SpecificMonitoringDashboard {
    constructor() {
        this.filters = {
            line: '',
            model: '',
            partNumber: '',
            po: '',
            date: ''
        };
        this.charts = {};
        this.selectedPlan = null;
        this.initializeCharts();
        this.setupFilterListeners();
        this.initializeAutocomplete();
        this.startRealTimeUpdates();
    }

    updateCharts(data) {
        const defectsData = this.calculateChartData(data, 'defect');
        this.updateChart(this.charts.defects, defectsData, 'Top 5 Worst Defects');
    
        const areasData = this.calculateChartData(data, 'area');
        this.updateChart(this.charts.areas, areasData, 'Top 5 Worst Zones');
    
        const partsData = this.calculateChartData(data, 'part');
        this.updateChart(this.charts.parts, partsData, 'Top 5 Worst Parts');
    }

    updateChart(chart, data, title) {
        chart.data.labels = data.labels;
        chart.data.datasets[0].data = data.values;
        chart.options.plugins = {
            title: {
                display: true,
                text: title,
                font: {
                    size: 20
                }
            },
            legend: {
                display: false
            },
            datalabels: {
                anchor: 'end',
                align: 'top',
                formatter: (value) => value,
                font: {
                    weight: 'bold'
                }
            }
        };
        chart.update();
    }

    initializeCharts() {
        this.charts.defects = new Chart(
            document.getElementById('defectsChart').getContext('2d'),
            this.getChartConfig('Top 5 Worst Defects', 'bar')
        );
        this.charts.areas = new Chart(
            document.getElementById('areasChart').getContext('2d'),
            this.getChartConfig('Top 5 Worst Zones', 'bar')
        );
        this.charts.parts = new Chart(
            document.getElementById('partsChart').getContext('2d'),
            this.getChartConfig('Top 5 Worst Parts', 'bar')
        );
    }

    getChartConfig(label, type) {
        return {
            type: type,
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: ['#808080', '#C0C0C0', '#C0C0C0', '#C0C0C0', '#C0C0C0'],
                    borderWidth: 1,
                    datalabel: label
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "top",
                        align: "center",
                        labels: {
                            font: {
                                size: 20,
                                weight: "bold"
                            },
                            boxWidth: 50,
                            usePointStyle: true,
                            pointStyle: "line"
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
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
                }
            },
            plugins: [ChartDataLabels]
        };
    }

    setupFilterListeners() {
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.updateFilters();
            this.updateDashboard();
        });
    }

    updateFilters() {
        ['line', 'model', 'partNumber', 'po', 'date'].forEach(filterId => {
            this.filters[filterId] = document.getElementById(`${filterId}Filter`).value;
        });
    }

    
    initializeAutocomplete() {
        openDB().then(db => {
            const transaction = db.transaction(['inspections'], 'readonly');
            const store = transaction.objectStore('inspections');
            const request = store.getAll();

            request.onsuccess = (event) => {
                const inspections = event.target.result;
                const models = [...new Set(inspections.map(i => i.model))];
                const partNumbers = [...new Set(inspections.map(i => i.part_number))];
                const pos = [...new Set(inspections.map(i => i.po_code))];

                this.setupAutocomplete('modelFilter', models);
                this.setupAutocomplete('partNumberFilter', partNumbers);
                this.setupAutocomplete('poFilter', pos);
            };
        });
    }

    setupAutocomplete(elementId, options) {
        $(`#${elementId}`).autocomplete({
            source: options,
            minLength: 2
        });
    }

    startRealTimeUpdates() {
        this.updateDashboard();
        setInterval(() => this.updateDashboard(), 5000); // Atualiza a cada 5 segundos
    }

    async updateDashboard() {
        console.log("Atualizando dashboard..."); // Log para debug
        const filteredData = await this.fetchFilteredData();
        this.updateSelectedPlanInfo(filteredData);
        this.updateCharts(filteredData);
        this.updateMetrics(filteredData);
    }

    async fetchFilteredData() {
        return new Promise((resolve, reject) => {
            openDB().then(db => {
                const transaction = db.transaction(['inspections', 'inspection_plans'], 'readonly');
                const inspectionStore = transaction.objectStore('inspections');
                const planStore = transaction.objectStore('inspection_plans');

                const inspectionRequest = inspectionStore.getAll();
                const planRequest = planStore.getAll();

                Promise.all([
                    new Promise(resolve => inspectionRequest.onsuccess = () => resolve(inspectionRequest.result)),
                    new Promise(resolve => planRequest.onsuccess = () => resolve(planRequest.result))
                ]).then(([inspections, plans]) => {
                    const filteredInspections = inspections.filter(item => this.applyFilters(item));
                    this.selectedPlan = plans.find(plan => this.matchPlanWithFilters(plan));
                    resolve(filteredInspections);
                }).catch(error => reject(error));
            });
        });
    }

    applyFilters(item) {
        return (!this.filters.line || item.line === this.filters.line) &&
               (!this.filters.model || item.model.includes(this.filters.model)) &&
               (!this.filters.partNumber || item.part_number.includes(this.filters.partNumber)) &&
               (!this.filters.po || item.po_code.includes(this.filters.po)) &&
               (!this.filters.date || new Date(item.date).toLocaleDateString() === new Date(this.filters.date).toLocaleDateString());
    }

    matchPlanWithFilters(plan) {
        return (!this.filters.line || plan.line === this.filters.line) &&
               (!this.filters.model || plan.model.includes(this.filters.model)) &&
               (!this.filters.partNumber || plan.part_number.includes(this.filters.partNumber)) &&
               (!this.filters.po || plan.po_code.includes(this.filters.po));
    }

    updateSelectedPlanInfo(filteredData) {
        if (this.selectedPlan) {
            document.getElementById('selectedLine').textContent = this.selectedPlan.line;
            document.getElementById('selectedModel').textContent = this.selectedPlan.model;
            document.getElementById('selectedPartNumber').textContent = this.selectedPlan.part_number;
            document.getElementById('selectedPO').textContent = this.selectedPlan.po_code;
            //document.getElementById('selectedDate').textContent = new Date(this.selectedPlan.date).toLocaleDateString();
            //document.getElementById('selectedPlanQty').textContent = this.selectedPlan.quantity;
            /*document.getElementById('selectedPlanInfo').style.display = 'inline-flex';*/
        } else {
            document.getElementById('selectedPlanInfo').style.display = 'none';
        }
    }

    updateCharts(data) {
        const defectsData = this.calculateChartData(data, 'defect');
        this.updateChart(this.charts.defects, defectsData);

        const areasData = this.calculateChartData(data, 'area');
        this.updateChart(this.charts.areas, areasData);

        const partsData = this.calculateChartData(data, 'part');
        this.updateChart(this.charts.parts, partsData);
    }

    calculateChartData(data, field) {
        const counts = data.reduce((acc, item) => {
            if (item[field]) {
                acc[item[field]] = (acc[item[field]] || 0) + 1;
            }
            return acc;
        }, {});

        const sortedItems = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            labels: sortedItems.map(([item]) => item),
            values: sortedItems.map(([, count]) => count)
        };
    }

    updateChart(chart, data) {
        chart.data.labels = data.labels;
        chart.data.datasets[0].data = data.values;
        chart.update();
    }

    updateMetrics(data) {
        document.getElementById('totalInspections').textContent = data.length;
        const okCount = data.filter(item => item.status === 'OK').length;
        const ngCount = data.filter(item => item.status === 'NG').length;
        const ngRate = data.length > 0 ? ((ngCount / data.length) * 100).toFixed(2) + '%' : '0.00%';

        document.getElementById('okCount').textContent = okCount;
        document.getElementById('ngCount').textContent = ngCount;
        document.getElementById('ngRate').textContent = ngRate;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SpecificMonitoringDashboard();
});
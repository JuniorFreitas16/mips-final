let currentPlanId;

//Date generator
const now = new Date();
now.setHours(now.getUTCHours() - 8);

    

// Function to load inspection form data from the Inspection Plan selected
document.addEventListener("DOMContentLoaded", function() {
    const selectedPlanId = localStorage.getItem('selectedPlanId');
    if (selectedPlanId) {
        currentPlanId = parseInt(selectedPlanId); // Converter para número
        loadInspectionPlan(currentPlanId);
        loadInspections();
        document.getElementById("serial_number").focus(); // Focar no campo
    }
});

// Function 1 to handle image selection and convert to base64
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 5242880) { // 5MB limit
            alert("Image must be less than 5MB");
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Store the base64 string in a hidden input
            document.getElementById('photoBase64').value = e.target.result;
            // Show preview
            /*const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.style.display = 'block';*/
        };
        reader.readAsDataURL(file);
    }
}

// Function 2 to handle image selection and convert to base64
function handleImageSelect2(event) {
    const file2 = event.target.files[0];
    if (file2) {
        if (file2.size > 5242880) { // 5MB limit
            alert("Image must be less than 5MB");
            event.target.value = '';
            return;
        }

        const reader2 = new FileReader();
        reader2.onload = function(e) {
            // Store the base64 string in a hidden input
            document.getElementById('photoBase64-2').value = e.target.result;
            // Show preview
            /*const preview2 = document.getElementById('imagePreview2');
            preview2.src = e.target.result;
            preview2.style.display = 'block';*/
        };
        reader2.readAsDataURL(file2);
    }
}

//Função para carregar o plano de inspeção
function loadInspectionPlan(planId) {
    if (!planId) {
        console.error("ID do plano não fornecido");
        return;
    }

    openDB().then(db => {
        const transaction = db.transaction(["inspection_plans"], "readonly");
        const store = transaction.objectStore("inspection_plans");
        const request = store.get(parseInt(planId));

        request.onsuccess = function(event) {
            const plan = event.target.result;
            if (plan) {

                // Atualizar os campos do formulário
                document.getElementById('date').value = now.toISOString().substring(0,10); /*new Date().toISOString().split('T')[0]*/
                document.getElementById('time').value = new Date().toLocaleTimeString();
                document.getElementById('model').value = plan.model;
                document.getElementById("line").value = plan.line;
                document.getElementById("vendor").value = plan.vendor;
                document.getElementById("po_code").value = plan.po_code;
                document.getElementById("part_type").value = plan.part_type;
                document.getElementById('part_number').value = plan.part_number;
                
                // Atualizar o dashboard
                document.getElementById('model-plan').textContent = plan.plan_qty;
                //document.getElementById('inspection-progress').textContent = plan.inspected_qty || '0';
                document.getElementById('inspection-progress').textContent = `${plan.inspected_qty}/${plan.plan_qty}`;
                document.getElementById('rate').textContent = plan.rate || '0%';
                document.getElementById('ok-count').textContent = plan.ok_qty || '0';
                document.getElementById('ng-count').textContent = plan.ng_qty || '0';
                
                // Atualizar o cabeçalho
                document.getElementById('model-in-insp').textContent = plan.model;
                document.getElementById('partnumber-in-insp').textContent = plan.part_number;
                loadInspections();
            }
        };

                // Show/hide NG fields based on status selection
            document.getElementById("status").addEventListener("change", function () {
            const ngFields = document.getElementById("ng-fields");
            ngFields.style.display = this.value === "NG" ? "flex" : "none";
        });

            request.onerror = function(error) {
            console.error("Erro ao carregar plano:", error);
        };
    });
}

//Função para salvar inspeção
function saveInspectionToDB(inspectionData) {
    return new Promise((resolve, reject) => {
        if (!inspectionData.planId) {
            reject(new Error("PlanId não fornecido"));
            return;
        }

        openDB().then(db => {
            const transaction = db.transaction(["inspections", "inspection_plans"], "readwrite");
            const inspectionStore = transaction.objectStore("inspections");
            const planStore = transaction.objectStore("inspection_plans");

            // Verificar o plano primeiro
            const planRequest = planStore.get(parseInt(inspectionData.planId));
            
            planRequest.onsuccess = function() {
                const plan = planRequest.result;
                if (!plan) {
                    reject(new Error("Plano não encontrado"));
                    return;
                }

                // Verificar limite de inspeções
                const index = inspectionStore.index("planId");
                const countRequest = index.count(parseInt(inspectionData.planId));
                
                countRequest.onsuccess = function() {
                    if (countRequest.result >= plan.plan_qty) {
                        reject(new Error("Quantidade máxima de inspeções do plano atingida"));
                        return;
                    }

                    // Adicionar a inspeção
                    const addRequest = inspectionStore.add(inspectionData);
                    
                    addRequest.onsuccess = function() {
                        // Atualizar o plano
                        plan.inspected_qty = (plan.inspected_qty || 0) + 1;
                        plan.ok_qty = inspectionData.status === 'OK' ? (plan.ok_qty || 0) + 1 : (plan.ok_qty || 0);
                        plan.ng_qty = inspectionData.status === 'NG' ? (plan.ng_qty || 0) + 1 : (plan.ng_qty || 0);
                        plan.rate = ((plan.ng_qty / plan.inspected_qty) * 100).toFixed(2);
                        
                        planStore.put(plan).onsuccess = function() {
                            resolve(inspectionData);
                        };
                    };

                    addRequest.onerror = function(error) {
                        reject(error);
                    };
                };
            };
        }).catch(error => reject(error));
        
    });

}

//Função para carregar inspeções
function loadInspections() {
    if (!currentPlanId) {
        console.error("Nenhum plano selecionado");
        return;
    }

    openDB().then(db => {
        const transaction = db.transaction(["inspections"], "readonly");
        const store = transaction.objectStore("inspections");
        const index = store.index("planId");
        const request = index.getAll(parseInt(currentPlanId));

        request.onsuccess = function(event) {
            const inspections = event.target.result;
            const tbody = document.querySelector("#inspection-table tbody");

            // Limpar tabela existente
            tbody.innerHTML = '';

            // Adicionar novas linhas
            inspections.forEach((inspection, idx) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${idx + 1}</td>
                    <td>${inspection.date}</td>
                    <td>${inspection.time}</td>
                    <td>${inspection.part_number}</td>
                    <td>${inspection.model}</td>
                    <td>${inspection.line}</td>
                    <td>${inspection.vendor}</td>
                    <td>${inspection.po_code}</td>
                    <td>${inspection.part_type}</td>
                    <td>${inspection.serial_number}</td>
                    <td>${inspection.status}</td>
                    <td>${inspection.defect || ''}</td>
                    <td>${inspection.part || ''}</td>
                    <td>${inspection.area || ''}</td>
                    <td>${inspection.defect2 || ''}</td>
                    <td>${inspection.part2 || ''}</td>
                    <td>${inspection.area2 || ''}</td>
                `;

            });

            // Atualizar dashboard
            updateDashboard(inspections);
        };
    });
}

function getInspectionData() {
    return {
        id: Date.now(),
        planId: currentPlanId,
        date: document.getElementById("date").value,
        time: document.getElementById("time").value,
        part_number: document.getElementById("part_number").value,
        model: document.getElementById("model").value,
        line: document.getElementById("line").value,
        vendor: document.getElementById("vendor").value,
        po_code: document.getElementById("po_code").value,
        part_type: document.getElementById("part_type").value,
        serial_number: document.getElementById("serial_number").value,
        status: document.getElementById("status").value,
        defect: document.getElementById("defect")?.value || '',
        part: document.getElementById("part")?.value || '',
        area: document.getElementById("area")?.value || '',
        photo: document.getElementById("photoBase64")?.value || '',
        defect2: document.getElementById("defect2")?.value || '',
        part2: document.getElementById("part2")?.value || '',
        area2: document.getElementById("area2")?.value || '',
        photo2: document.getElementById("photoBase64-2")?.value || ''
    };
}

document.getElementById("inspection-form")?.addEventListener("submit", function(e) {
    e.preventDefault();

    if (!currentPlanId) {
        alert("Nenhum plano selecionado!");
        return;
    }

    const inspectionData = getInspectionData();

    saveInspectionToDB(inspectionData)
        .then(() => {
            loadInspections();
            
            // Limpar campos de forma mais segura
            const fieldsToReset = [
                "defect", "part", "area", 
                "defect2", "part2", "area2", 
                "serial_number", "photoBase64", 
                "photo", "photoBase64-2", "photo2","status"
            ];

            fieldsToReset.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = "";
                }
            });

            // Verificar e limpar previews de imagem de forma segura
            const imagePreview = document.getElementById("imagePreview");
            const imagePreview2 = document.getElementById("imagePreview2");

            if (imagePreview) {
                imagePreview.style.display = 'none';
                imagePreview.src = '';
            }

            if (imagePreview2) {
                imagePreview2.style.display = 'none';
                imagePreview2.src = '';
            }

            document.getElementById("serial_number").focus();
            
            // Mostrar mensagem de sucesso
            const alertMessage = document.getElementById("alert-message");
            if (alertMessage) {
                alertMessage.textContent = "Inspeção salva com sucesso!";
                alertMessage.classList.add("show");
                alertMessage.style.display = 'block'; // Garanta que o display seja 'block'
                setTimeout(() => {
                    if (alertMessage) {
                        alertMessage.classList.remove("show");
                        alertMessage.style.display = 'none'; // Esconde novamente após 2 segundos
                    }
                }, 2000);
            }

            /*location.reload();*/
        })
        .catch(error => {
            console.error("Erro ao salvar inspeção:", error);
            alert(error.message || "Erro ao salvar inspeção");
            
        });
    });

    function updateDashboard(inspections) {
        if (!inspections) {
            return;
        }

        const planQty = parseInt(document.getElementById("model-plan").textContent);
        const inspectionProgress = inspections.length;
        const okCount = inspections.filter(i => i.status === 'OK').length;
        const ngCount = inspections.filter(i => i.status === 'NG').length;
        const rate = inspections.length > 0 ? (ngCount / inspections.length * 100).toFixed(2) : 0;

        document.getElementById("inspection-progress").textContent = `${inspectionProgress} / ${planQty}`;
        document.getElementById("rate").textContent = `${rate}%`;
        document.getElementById("ok-count").textContent = okCount;
        document.getElementById("ng-count").textContent = ngCount;
    }


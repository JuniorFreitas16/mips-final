//Open IndexedDB
openDB()
    .then(db => {
        console.log("Banco de dados aberto com sucesso:", db);

    })
    .catch(error => {
        console.error("Erro ao abrir o banco de dados:", error);
    });

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("panel_inspection_db", 1); // Incrementar versão

        request.onerror = (e) => reject("Erro ao abrir IndexedDB");

        request.onupgradeneeded = (e) => {
            console.log("Upgrade needed, creating/updating object stores...");
            const db = e.target.result;

            // Atualizar ou criar store de inspeções com índice planId
            if (db.objectStoreNames.contains("inspections")) {
                db.deleteObjectStore("inspections");
            }
            const inspectionStore = db.createObjectStore("inspections", { keyPath: "id", autoIncrement: true });
            inspectionStore.createIndex("planId", "planId"); // Criar índice para planId

            // Manter outras stores existentes
            if (!db.objectStoreNames.contains("inspection_plans")) {
                const inspPlanStore = db.createObjectStore("inspection_plans", { keyPath: "id", autoIncrement: true });
                inspPlanStore.createIndex("po", "po_code", { unique: true });
                inspPlanStore.createIndex("line", "line");
            }

            if (!db.objectStoreNames.contains("models")) {
                const modelStore = db.createObjectStore("models", { keyPath: "id", autoIncrement: true });
                modelStore.createIndex("part_number", "part_number");
                modelStore.createIndex("model", "model");
                modelStore.createIndex("vendor", "vendor");

            }
        };

        request.onsuccess = (e) => resolve(e.target.result);
    });
}

    // Save Model to IndexedDB and MySQL
    function saveModelToDB(modelData) {
        openDB().then(db => {
            const transaction = db.transaction(["models"], "readwrite");
            const store = transaction.objectStore("models");
            store.add(modelData);

        // Save to MySQL via API
       /* fetch("/api/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(modelData)
        }).then(response => response.json())
        .then(data => console.log("Modelo salvo no MySQL: ", data))
        .catch(err => console.log("Erro ao salvar no MySQL: ", err)); */
    });
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Função para carregar part numbers do IndexedDB
        function loadPartNumbersFromIndexedDB() {
        return new Promise((resolve, reject) => {
            let request = indexedDB.open("panel_inspection_db", 1);

            request.onsuccess = function (event) {
            let db = event.target.result;
            let transaction = db.transaction("models", "readonly");
            let store = transaction.objectStore("models");
            let partNumbers = [];

            store.openCursor().onsuccess = function (event) {
                let cursor = event.target.result;
                if (cursor) {
                partNumbers.push(cursor.value.part_number);
                cursor.continue();
                } else {
                resolve(partNumbers);
                }
            };

            transaction.onerror = function () {
                reject("Failed to load part numbers from IndexedDB.");
            };
            };
        });
        }

        // Função para carregar part numbers do MySQL via API
        /*function loadPartNumbersFromMySQL() {
        return fetch('/api/get-part-numbers') // Endpoint que busca os part numbers no MySQL
            .then(response => response.json())
            .then(data => data.partNumbers)
            .catch(err => console.error("Error fetching part numbers from MySQL:", err));
        }*/

        // Preencher o datalist com part numbers de IndexedDB e MySQL
        Promise.all([loadPartNumbersFromIndexedDB()/*, loadPartNumbersFromMySQL()*/])
        .then(([indexedDBParts/*, mysqlParts*/]) => {
            let allParts = [...new Set([...indexedDBParts/*, ...mysqlParts*/])]; // Remove duplicados
            let datalist = document.getElementById("part-number-list");

            allParts.forEach(part => {
            let option = document.createElement("option");
            option.value = part;
            datalist.appendChild(option);
            });
        });
    });

        document.querySelector('input[name="part_number"]')?.addEventListener('input', function (event) {
            const partNumber = event.target.value;

            if (!partNumber) {
                clearFields();
                return;
            }

            const request = indexedDB.open("panel_inspection_db", 1);
            request.onsuccess = function (event) {
                const db = event.target.result;
                const transaction = db.transaction(["models"], "readonly");
                const objectStore = transaction.objectStore("models");
                const index = objectStore.index("part_number");
                const query = index.getAll(partNumber);

                query.onsuccess = function (e) {
                    const models = e.target.result;

                    if (models.length > 0) {
                        console.log("Models found:", models);

                        // Extrair vendors e part_types únicos de todos os modelos
                        const vendors = [...new Set(models.map(m => m.vendor))];
                        const partTypes = [...new Set(models.map(m => m.part_type))];

                        // Preencher as opções de vendor e part_type
                        populateVendorOptions(vendors);
                        populatePartTypeOptions(partTypes);

                        // Preencher os campos com os valores do primeiro modelo correspondente
                        populateFields(models[0]);

                        // Se houver mais de um modelo, criar uma lista de seleção
                        if (models.length > 1) {
                            createModelSelect(models);
                        }
                    } else {
                        console.log(`No matching model found for the given part number: ${ partNumber }`);
                        clearFields();
                    }
                };

                query.onerror = function (e) {
                    console.error("Error retrieving model:", e);
                };
            };

            request.onerror = function (event) {
                console.error("Error opening IndexedDB:", event);
            };
        });

        function populateVendorOptions(vendors) {
            const vendorSelect = document.querySelector('select[name="vendor"]');
            vendorSelect.innerHTML = "";
            vendors.forEach(vendor => {
                const option = document.createElement("option");
                option.value = vendor;
                option.textContent = vendor;
                vendorSelect.appendChild(option);
            });
        }

        function populatePartTypeOptions(partTypes) {
            const partTypeSelect = document.querySelector('select[name="part_type"]');
            partTypeSelect.innerHTML = "";
            partTypes.forEach(partType => {
                const option = document.createElement("option");
                option.value = partType;
                option.textContent = partType;
                partTypeSelect.appendChild(option);
            });
        }

        function populateFields(model) {
            console.log("Populating fields with model:", model);

            document.querySelector('select[name="model"]').value = model.model || "";
            console.log("Model set to:", model.model);

            document.querySelector('select[name="vendor"]').value = model.vendor || "";
            console.log("Vendor set to:", model.vendor);

            document.querySelector('select[name="part_type"]').value = model.part_type || "";
            console.log("Part type set to:", model.part_type);

            document.querySelector('input[name="box_qty"]').value = model.box_qty || "";
            console.log("Box quantity set to:", model.box_qty);
        }

        function clearFields() {
            document.querySelector('select[name="model"]').value = "";
            document.querySelector('select[name="vendor"]').value = "";
            document.querySelector('select[name="part_type"]').value = "";
            document.querySelector('input[name="box_qty"]').value = "";
        }

        function createModelSelect(models) {
            const modelSelect = document.querySelector('select[name="model"]');
            modelSelect.innerHTML = ""; // Limpa as opções existentes
            models.forEach(m => {
                const option = document.createElement("option");
                option.value = m.model;
                option.textContent = m.model; // Mostra apenas o modelo
                modelSelect.appendChild(option);       // modelSelect.appendChild(option);
            });

            // Adicionar evento de mudança para atualizar os outros campos quando o modelo é alterado
            modelSelect.addEventListener('change', function() {
                const selectedModel = models.find(m => m.model === this.value);
                if (selectedModel) {
                    populateFields(selectedModel);
                }
            });
        }

/*
    
        function savePlanToDB(planData) {
            return new Promise((resolve, reject) => {
                openDB().then(db => {
                    const transaction = db.transaction(["inspection_plans"], "readwrite");
                    const store = transaction.objectStore("inspection_plans");

                    // Adicione um array vazio para os itens inspecionados
                    planData.inspectedItems = [];

                    const request = store.add(planData);

         // Save to MySQL via API
            fetch("/api/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(planData)
            }).then(response => response.json())
        .then(data => console.log("Plano salvo no MySQL: ", data))
        .catch(err => console.log("Erro ao salvar no MySQL: ", err));
            });
        });
    }*/

    // Save Plan to IndexedDB and MySQL
    function savePlanToDB(planData) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("panel_inspection_db", 1);


            request.onerror = (event) => {
                console.error("Error opening database:", event.target.error);
                reject("Error opening database");
                location.reload();
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(["inspection_plans"], "readwrite");
                const store = transaction.objectStore("inspection_plans");

                const addRequest = store.add(planData);

                addRequest.onerror = (event) => {
                    console.error("Error adding plan to database:", event.target.error);
                    reject("Error adding plan to database");
                };

                addRequest.onsuccess = (event) => {
                    console.log("Plan successfully added to database");
                    resolve();
                };

                transaction.oncomplete = () => {
                    db.close();
                };
                location.reload();

            };
        });
    }

    // Save Inspection to IndexedDB and MySQL
    /*
    function saveInspectionToDB(inspectionData) {
        return new Promise((resolve, reject) => {
            openDB().then(db => {
                const transaction = db.transaction(["inspections"], "readwrite");
                const store = transaction.objectStore("inspections");
                const request = store.add(inspectionData);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            }).catch(error => reject(error));
        });
    }
*/

/*function saveInspectionToDB(inspectionData) {
    return new Promise((resolve, reject) => {
        if (!inspectionData.planId) {
            reject(new Error("PlanId não fornecido para a inspeção"));
            return;
        }

        openDB().then(db => {
            const transaction = db.transaction(["inspections"], "readwrite");
            const store = transaction.objectStore("inspections");
            
            // Verificar se já atingiu o limite do plano
            const planStore = db.transaction(["inspection_plans"], "readonly")
                              .objectStore("inspection_plans");
            
            const planRequest = planStore.get(parseInt(inspectionData.planId));
            
            planRequest.onsuccess = function() {
                const plan = planRequest.result;
                if (!plan) {
                    reject(new Error("Plano não encontrado"));
                    return;
                }

                // Contar inspeções existentes para este plano
                const index = store.index("planId");
                const countRequest = index.count(parseInt(inspectionData.planId));
                
                countRequest.onsuccess = function() {
                    if (countRequest.result >= plan.plan_qty) {
                        reject(new Error("Quantidade máxima de inspeções atingida para este plano"));
                        return;
                    }

                    // Adicionar a nova inspeção
                    const request = store.add(inspectionData);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                };
            };
        }).catch(error => reject(error));
    });
}*/
            /*
            // Save to MySQL via API
            fetch("/api/inspections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(inspectionData)
            }).then(response => response.json())
            .then(data => console.log("Inspeção salva no MySQL: ", data))
            .catch(err => console.log("Erro ao salvar no MySQL: ", err));*/


    function loadPlanDetails(planId) {
        return new Promise((resolve, reject) => {
            openDB().then(db => {
                const transaction = db.transaction(["inspection_plans"], "readwrite");
                const store = transaction.objectStore("inspection_plans");

                const request = store.get(planId);

                request.onsuccess = () => {
                    const plan = request.result;
                    const inspectedItemsTable = document.getElementById("inspected-items-table");
                    const inspectedItemsTbody = inspectedItemsTable.tBodies[0];

                    // Limpe a tabela antes de preencher
                    while (inspectedItemsTbody.rows.length > 0) {
                        inspectedItemsTbody.deleteRow(0);
                    }

                    plan.inspectedItems.forEach(item => {
                        const row = inspectedItemsTbody.insertRow();
                        row.innerHTML = `
                            <td>${item.date}</td>
                            <td>${item.item}</td>
                            <td>${item.status}</td>
                        `;
                    });

                    resolve();
                };

                request.onerror = () => reject(request.error);
            }).catch(error => reject(error));
        });
    }

function updateInspectionAndPlan(inspection) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction(["inspections", "inspection_plans"], "readwrite");
            const inspectionStore = transaction.objectStore("inspections");
            const planStore = transaction.objectStore("inspection_plans");

            // Verificar se já existe uma inspeção com o mesmo ID
            const getRequest = inspectionStore.get(inspection.id);

            getRequest.onsuccess = function(event) {
                const existingInspection = event.target.result;

                let saveRequest;
                if (existingInspection) {
                    // Se existir, atualiza
                    saveRequest = inspectionStore.put(inspection);
                } else {
                    // Se não existir, adiciona
                    saveRequest = inspectionStore.add(inspection);
                }

                saveRequest.onsuccess = function() {
                    // Buscar o plano correspondente
                    const planRequest = planStore.get(inspection.planId);

                    planRequest.onsuccess = function(event) {
                        const plan = event.target.result;
                        if (plan) {
                            // Atualizar os contadores do plano
                            const inspections = inspectionStore.index("planId").getAll(inspection.planId);
                            inspections.onsuccess = function(event) {
                                const planInspections = event.target.result;
                                plan.inspected_qty = planInspections.length;
                                plan.ok_qty = planInspections.filter(i => i.status === 'OK').length;
                                plan.ng_qty = planInspections.filter(i => i.status === 'NG').length;
                                plan.rate = plan.inspected_qty > 0 ? (plan.ng_qty / plan.inspected_qty * 100).toFixed(2) : 0;

                                // Salvar o plano atualizado
                                const updatePlanRequest = planStore.put(plan);
                                updatePlanRequest.onsuccess = function() {
                                    resolve();
                                };
                                updatePlanRequest.onerror = function(error) {
                                    reject(error);
                                };
                            };
                        } else {
                            reject(new Error("Plano não encontrado"));
                        }
                    };
                };

                saveRequest.onerror = function(error) {
                    reject(error);
                };
            };

            getRequest.onerror = function(error) {
                reject(error);
            };
        });
    });
}
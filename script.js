// --- DÉCLARATION DES VARIABLES GLOBALES ET DONNÉES DE BASE ---
const DEPARTMENTS = ["Accueil", "Départs", "Terrain", "Carts"];
const ADMIN_PASSWORD = '1000'; 
let isAdminMode = false;
let currentDisplayFilter = 'all'; 

// Shifts spéciaux (Congé, Maladie, Non-Disponible)
// Correction de la faute de frappe dans les valeurs stockées si nécessaire
const SPECIAL_SHIFTS = ["------", "Congé", "Maladie", "Fermé", "Non-Disponible"]; 
let employees = [];
let scheduleData = {}; 


// --- FONCTION UTILITAIRE : GÉNÉRATION DES HEURES (30 min) ---

function generateTimeOptions() {
    const options = ["------"];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = String(h).padStart(2, '0');
            const minute = String(m).padStart(2, '0');
            options.push(`${hour}:${minute}`);
        }
    }
    options.push("24:00");
    return options;
}

const TIME_OPTIONS = generateTimeOptions();


// --- FONCTIONS DE SAUVEGARDE ET DE LECTURE (FIREBASE) ---

function saveEmployees() {
    db.ref('employees').set(employees);
}

function saveSchedule() {
    db.ref('scheduleData').set(scheduleData);
}

function syncDataFromFirebase() {
    db.ref('employees').on('value', (snapshot) => {
        employees = snapshot.val() || [];
        renderAdminLists();
        generateSchedule(); 
    });

    db.ref('scheduleData').on('value', (snapshot) => {
        scheduleData = snapshot.val() || {};
        generateSchedule(); 
    });
}

// --- FONCTIONS D'AUTHENTIFICATION ---
function authenticateAdmin() {
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput.value === ADMIN_PASSWORD) {
        isAdminMode = true;
        passwordInput.value = '';
        passwordInput.placeholder = 'Mode Admin Activé';
        document.getElementById('adminAuthButton').disabled = true;
        document.getElementById('adminPanel').style.display = 'block';
        generateSchedule();
        alert("Mode Administrateur activé.");
    } else {
        alert("Mot de passe incorrect. Le mode admin n'est pas activé.");
        passwordInput.value = '';
        isAdminMode = false; 
        document.getElementById('adminPanel').style.display = 'none';
        generateSchedule(); 
    }
}

function disableAdminMode() {
    isAdminMode = false;
    const passwordInput = document.getElementById('adminPassword');
    passwordInput.disabled = false;
    document.getElementById('adminAuthButton').disabled = false;
    passwordInput.placeholder = '';
    document.getElementById('adminPanel').style.display = 'none';
    generateSchedule();
    alert("Mode Administrateur désactivé.");
}


// --- GESTION DES EMPLOYÉS (ADMIN) ---

function addEmployee() {
    const nameInput = document.getElementById('newEmployeeName');
    const deptInput = document.getElementById('newEmployeeDept');
    const name = nameInput.value.trim();
    const dept = deptInput.value;

    if (name && dept) {
        employees.push({ id: Date.now(), name, dept }); 
        nameInput.value = '';
        saveEmployees();
    }
}

function removeEmployee(id) {
    employees = employees.filter(emp => emp.id !== Number(id)); 
    Object.keys(scheduleData).forEach(key => {
        if (key.startsWith(`${id}-`)) {
            delete scheduleData[key];
        }
    });
    saveEmployees();
    saveSchedule();
}

function renderAdminLists() {
    const listContainer = document.getElementById('employeesListContainer');
    listContainer.innerHTML = '';

    DEPARTMENTS.forEach(dept => {
        const deptEmployees = employees.filter(emp => emp.dept === dept);
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-3 mb-3';
        colDiv.innerHTML = `
            <h6>${dept}</h6>
            <ul class="list-group">
                ${deptEmployees.map(emp => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${emp.name} 
                        <button class="btn btn-sm btn-danger" onclick="removeEmployee(${emp.id})">X</button>
                    </li>
                `).join('')}
            </ul>
        `;
        listContainer.appendChild(colDiv);
    });
}


// --- LOGIQUE DE SAISIE DOUBLE MENU ---

function updateShiftTime(scheduleKey, type, event) {
    const container = event.target.closest('td');
    const startTimeSelect = container.querySelector('.start-time');
    const endTimeSelect = container.querySelector('.end-time');
    
    let startValue = startTimeSelect.value;
    let endValue = endTimeSelect.value;
    
    let shiftToSave = null;

    // Si le menu de Début est une option spéciale (Congé, Maladie, N/D, etc.)
    if (SPECIAL_SHIFTS.includes(startValue) && startValue !== "------") {
        shiftToSave = startValue;
        
        // On force le menu de Fin à "------" pour éviter la confusion
        if (endTimeSelect.value !== "------") {
             endTimeSelect.value = "------";
             endValue = "------";
        }
    } 
    // Sinon, on tente de former une plage horaire
    else if (startValue !== "------" || endValue !== "------") {
        shiftToSave = `${startValue}-${endValue}`;
    }

    // Sauvegarde ou suppression de la donnée
    if (shiftToSave === null || shiftToSave === "------" || shiftToSave === "------" + "-" + "------") {
        delete scheduleData[scheduleKey];
        container.querySelector('.shift-label').textContent = "------"; 
        container.classList.remove('not-available'); // Retire la couleur
    } else {
        scheduleData[scheduleKey] = shiftToSave;
        
        // CORRECTION DE L'AFFICHAGE ET DE LA COULEUR
        const displayValue = SPECIAL_SHIFTS.includes(shiftToSave) 
                            ? shiftToSave 
                            : shiftToSave.replace('-', ' à '); // Format "6h à 12h30"
                            
        container.querySelector('.shift-label').textContent = displayValue;

        // Met à jour la classe pour la couleur N/D
        if (shiftToSave === "Non-Disponible") {
            container.classList.add('not-available');
        } else {
            container.classList.remove('not-available');
        }
    }

    saveSchedule(); 
}


// --- NAVIGATION HEBDOMADAIRE ET AFFICHAGE ---

function createLocalMidnightDate(dateString) {
    if (!dateString) return new Date(); 
    const parts = dateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; 
    const day = parseInt(parts[2]);
    
    return new Date(year, month, day, 0, 0, 0); 
}

function getSundayOfWeek(date) {
    const dayOfWeek = date.getDay(); 
    const sunday = new Date(date.getTime()); 
    sunday.setDate(date.getDate() - dayOfWeek);
    return sunday;
}

function goToToday() {
    const today = new Date();
    const currentSunday = getSundayOfWeek(today); 
    
    const year = currentSunday.getFullYear();
    const month = String(currentSunday.getMonth() + 1).padStart(2, '0');
    const day = String(currentSunday.getDate()).padStart(2, '0');
    
    document.getElementById('startDate').value = `${year}-${month}-${day}`;
    
    generateSchedule();
}


function getDates(startDate) {
    const dates = [];
    
    if (!startDate || startDate === "Invalid Date") return [];

    let selectedDate = createLocalMidnightDate(startDate);
    
    let current = getSundayOfWeek(selectedDate);
    
    for (let i = 0; i < 7; i++) { 
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    return dates;
}

function changeWeek(delta) {
    const startDateInput = document.getElementById('startDate');
    if (!startDateInput.value) return;

    let currentStartDate = createLocalMidnightDate(startDateInput.value); 
    
    currentStartDate.setDate(currentStartDate.getDate() + (7 * delta));

    const year = currentStartDate.getFullYear();
    const month = String(currentStartDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentStartDate.getDate()).padStart(2, '0');

    startDateInput.value = `${year}-${month}-${day}`;
    
    generateSchedule();
}

function generateSchedule() {
    const startDateInput = document.getElementById('startDate').value;
    if (!startDateInput) return;

    const dates = getDates(startDateInput); 
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody'); 
    
    // 1. Préparer les options HTML
    const timeOptionsHTML = TIME_OPTIONS.map(time => `<option value="${time}">${time}</option>`).join('');
    const specialOptionsHTML = SPECIAL_SHIFTS.map(shift => `<option value="${shift}">${shift}</option>`).join('');


    // 2. Générer l'en-tête du tableau 
    tableHeader.innerHTML = '<th>Employé</th>';
    dates.forEach(date => {
        const day = date.toLocaleDateString('fr-FR', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
        tableHeader.innerHTML += `<th>${day}<br>${dateStr}</th>`;
    });

    // 3. Générer le corps du tableau
    tableBody.innerHTML = '';
    let currentRow = 0;

    DEPARTMENTS.forEach(dept => {
        const deptEmployees = employees.filter(emp => emp.dept === dept);

        if (deptEmployees.length > 0) {
            const deptRow = tableBody.insertRow(currentRow++);
            deptRow.className = 'table-secondary fw-bold dept-header-row';
            deptRow.setAttribute('data-dept', dept); 
            deptRow.innerHTML = `<td colspan="${8}">${dept}</td>`; 
            
            deptEmployees.forEach(emp => {
                const row = tableBody.insertRow(currentRow++);
                row.className = 'employee-row'; 
                row.setAttribute('data-dept', dept);
                row.innerHTML = `<td>${emp.name}</td>`; 

                dates.forEach(date => {
                    const dateKey = date.toISOString().split('T')[0];
                    const cell = row.insertCell();
                    
                    const scheduleKey = `${emp.id}-${dateKey}`;
                    const shiftData = scheduleData[scheduleKey]; 
                    
                    // Initialisation des valeurs
                    let startTime = "------";
                    let endTime = "------";
                    let specialShift = "------";
                    let displayValue = "------";
                    
                    if (shiftData) {
                        if (shiftData.includes('-')) {
                            // Format heure: "HH:MM-HH:MM" -> Affichage: "HH:MM à HH:MM"
                            [startTime, endTime] = shiftData.split('-');
                            displayValue = shiftData.replace('-', ' à ');
                        } else {
                            // Format spécial: "Congé" -> Affichage: "Congé"
                            specialShift = shiftData;
                            displayValue = specialShift;
                        }
                    }

                    // Ajoute la classe N/D si le shift est "Non-Disponible"
                    if (displayValue === "Non-Disponible") {
                        cell.classList.add('not-available');
                    } else {
                        cell.classList.remove('not-available');
                    }
                    
                    const showTimeSelectors = isAdminMode; 
                    
                    // --- STRUCTURE DE LA CELLULE ---
                    if (showTimeSelectors) {
                        // Mode Admin: Afficher les menus
                        cell.innerHTML = `
                            <div class="d-flex flex-column align-items-center position-relative">
                                
                                <div class="d-flex flex-row align-items-center justify-content-center w-100 mb-1">
                                    <span class="me-1 fw-bold" style="font-size: 0.85em; width: 40px;">Début:</span>
                                    <select class="form-select form-select-sm start-time" data-key="${scheduleKey}" 
                                            onchange="updateShiftTime('${scheduleKey}', 'start', event)"
                                            style="min-width: 95px;">
                                        ${SPECIAL_SHIFTS.map(shift => `<option value="${shift}" ${shift === specialShift ? 'selected' : ''}>${shift}</option>`).join('')}
                                        <option disabled>──────────</option>
                                        ${TIME_OPTIONS.filter(t => t !== "------").map(time => `<option value="${time}" ${time === startTime ? 'selected' : ''}>${time}</option>`).join('')}
                                    </select>
                                </div>

                                <div class="d-flex flex-row align-items-center justify-content-center w-100">
                                    <span class="me-1 fw-bold" style="font-size: 0.85em; width: 40px;">Fin:</span>
                                    <select class="form-select form-select-sm end-time" data-key="${scheduleKey}" 
                                            onchange="updateShiftTime('${scheduleKey}', 'end', event)"
                                            style="min-width: 95px;">
                                        ${TIME_OPTIONS.map(time => `<option value="${time}" ${time === endTime ? 'selected' : ''}>${time}</option>`).join('')}
                                    </select>
                                </div>
                                <span class="shift-label d-none" style="font-size: 0.9em;">${displayValue}</span>
                            </div>
                        `;
                    } else {
                        // Mode Lecture Seule: Afficher uniquement le texte
                        cell.innerHTML = `
                            <div class="d-flex flex-column align-items-center position-relative">
                                <span class="shift-label fw-bold" style="font-size: 1.1em;">${displayValue}</span>
                            </div>
                        `;
                    }
                });
            });
        }
    });
    
    applyDisplayFilter(currentDisplayFilter);
}


// --- FONCTIONS DE FILTRAGE ET EXPORT (inchangées) ---

function filterByButton(button, dept) {
    const buttons = document.querySelectorAll('.d-flex.gap-2 button');
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    currentDisplayFilter = dept;
    applyDisplayFilter(dept);
}

function applyDisplayFilter(deptToFilter) {
    const tableBody = document.getElementById('tableBody'); 
    const rows = tableBody.rows;
    let isCurrentDeptRowVisible = false;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const deptName = row.getAttribute('data-dept');
        
        if (row.classList.contains('dept-header-row')) { 
            if (deptToFilter === 'all' || deptName === deptToFilter) {
                isCurrentDeptRowVisible = true;
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        } else if (row.classList.contains('employee-row')) { 
            if (isCurrentDeptRowVisible) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    }
}

function filterScheduleForAction(deptToFilter) {
    applyDisplayFilter(deptToFilter);
}

function getSelectedDept() {
    return document.getElementById('deptSelector').value;
}

function printSchedule() {
    const dept = getSelectedDept();
    filterScheduleForAction(dept); 
    window.print();
    filterScheduleForAction(currentDisplayFilter); 
}

function exportPDF() {
    const dept = getSelectedDept();
    filterScheduleForAction(dept);
    
    const table = document.getElementById('scheduleTable');
    
    html2canvas(table, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = canvas.height * pdfWidth / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        
        const filename = dept === 'all' ? 'Horaire_Complet.pdf' : `Horaire_${dept}.pdf`;
        pdf.save(filename);

        filterScheduleForAction(currentDisplayFilter); 
    });
}


// --- INITIALISATION ---

document.addEventListener('DOMContentLoaded', () => {
    try {
        syncDataFromFirebase(); 
    } catch (e) {
        console.error("Erreur de connexion Firebase lors de l'initialisation:", e);
    }

    const today = new Date();
    const currentSunday = getSundayOfWeek(today); 
    
    const year = currentSunday.getFullYear();
    const month = String(currentSunday.getMonth() + 1).padStart(2, '0');
    const day = String(currentSunday.getDate()).padStart(2, '0');
    
    const startDateInput = document.getElementById('startDate');
    if (startDateInput) {
        startDateInput.value = `${year}-${month}-${day}`;
    }

    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
});
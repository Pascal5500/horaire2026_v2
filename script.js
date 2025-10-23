function renderAdminLists() {
    // 1. Liste des Employés réguliers (pour l'horaire)
    const employeesListContainer = document.getElementById('employeesListContainer');
    if (!employeesListContainer) return; 

    employeesListContainer.innerHTML = '';

    DEPARTMENTS.forEach(dept => {
        // CORRECTION: Filtrer pour s'assurer que l'employé et son ID sont présents
        const deptEmployees = employees.filter(emp => emp && emp.dept === dept && emp.id); 
        
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-12 mb-2';
        colDiv.innerHTML = `
            <h6>${dept}</h6>
            <ul class="list-group">
                ${deptEmployees.map(emp => `
                    <li class="list-group-item d-flex justify-content-between align-items-center small">
                        <span>${emp.name}</span>
                        <div class="employee-actions">
                            <button class="btn btn-sm btn-info me-2" title="Copier la semaine actuelle vers la semaine suivante" onclick="copyEmployeeScheduleToNextWeek(${emp.id})">
                                Copier ▶
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="removeEmployee(${emp.id})">X</button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
        employeesListContainer.appendChild(colDiv);
    });

    // 2. Liste des Contacts externes (avec téléphone)
    const contactsListContainer = document.getElementById('contactsListContainer');
    if (!contactsListContainer) return; 
    
    contactsListContainer.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'list-group';

    // CORRECTION: Filtrer pour s'assurer que le contact et son ID sont présents
    contacts.filter(contact => contact && contact.id).forEach(contact => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center small';
        li.innerHTML = `
            <span>${contact.name} (${contact.phone})</span>
            <button class="btn btn-sm btn-danger" onclick="removeContact(${contact.id})">X</button>
        `;
        ul.appendChild(li);
    });
    contactsListContainer.appendChild(ul);
}
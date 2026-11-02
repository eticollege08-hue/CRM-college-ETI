const tree = document.querySelector(".tree-root");
const details = document.querySelector("#employee-details");
const searchInput = document.querySelector("#employee-search");
const teamFilter = document.querySelector("#team-filter");
const levelFilter = document.querySelector("#level-filter");
const positionFilter = document.querySelector("#position-filter");
const projectFilter = document.querySelector("#project-filter");
const clearFiltersButton = document.querySelector("#clear-filters");
const treeStatus = document.querySelector("#tree-status");
const dialog = document.querySelector("#relationship-dialog");
const relationshipForm = document.querySelector("#relationship-form");
const managerSelect = document.querySelector("#manager-select");
const subordinateSelect = document.querySelector("#subordinate-select");
const dialogMessage = document.querySelector("#dialog-message");
const dialogTitle = document.querySelector("#dialog-title");
const submitButton = document.querySelector("#relationship-submit");
const treeItems = [...document.querySelectorAll("[data-tree-item]")];
const canManageEmployees = ["OWNER", "RECRUITER", "HR", "MANAGER"].includes(
    document.querySelector("[data-current-user-role]")?.getAttribute("data-current-user-role") ||
        "",
);
let editingRelationshipId = "";

for (const select of [levelFilter, positionFilter]) {
    if (!select) continue;
    const seen = new Set();
    for (const option of [...select.options]) {
        if (!option.value) continue;
        if (seen.has(option.value)) option.remove();
        else seen.add(option.value);
    }
}

const employeeName = (employee) => employee?.dataset.name || "Unnamed employee";
const roleName = (role) =>
    ({
        OWNER: "CRM Owner",
        MANAGER: "CRM Manager",
        RECRUITER: "CRM Recruiter",
        HR: "CRM HR",
        WORKER: "CRM Worker",
    })[role || ""] || "Employee";

function addTextElement(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.append(element);
    return element;
}

function addInfoCard(parent, title, rows) {
    const card = document.createElement("article");
    card.className = "detail-card card";
    const titleIcons = { "Personal information": "▣", "Contact information": "☎", Salary: "▤" };
    addTextElement(card, "h3", "", `${titleIcons[title] || ""} ${title}`.trim());
    const list = document.createElement("dl");
    const rowIcons = {
        "Full name": "♟",
        Position: "♛",
        Level: "▥",
        Team: "♧",
        Experience: "☆",
        Certifications: "♙",
        Phone: "☎",
        Email: "✉",
        Location: "⌖",
    };
    for (const [label, value] of rows) {
        addTextElement(list, "dt", "", `${rowIcons[label] || ""} ${label}`.trim());
        addTextElement(list, "dd", "", value || "Not provided");
    }
    card.append(list);
    parent.append(card);
}

function levelLabel(level) {
    if (!level) return "";
    return /^level\s/i.test(level) ? level : `Level ${level}`;
}

function showEmptyDetails() {
    if (!details) return;
    details.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "empty-state detail-empty";
    addTextElement(empty, "strong", "", "Select an employee");
    addTextElement(empty, "p", "", "Choose a person in the hierarchy to see their details.");
    details.append(empty);
}

function renderEmployee(employee, activeTab = "overview", isEditing = false) {
    if (!details) return;
    for (const item of treeItems) {
        const button = item.querySelector(".employee-select");
        const isSelected = item === employee;
        item.classList.toggle("is-selected", isSelected);
        button?.setAttribute("aria-pressed", String(isSelected));
    }

    details.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "profile-overview";
    const avatar = addTextElement(
        heading,
        "span",
        "avatar avatar-large",
        employee.querySelector(".avatar")?.textContent || "?",
    );
    avatar.setAttribute("aria-hidden", "true");
    const identity = document.createElement("div");
    identity.className = "profile-title";
    const title = document.createElement("h2");
    title.append(document.createTextNode(employeeName(employee) + " "));
    const badge = addTextElement(title, "span", "role-badge", roleName(employee.dataset.role));
    badge.setAttribute("aria-label", roleName(employee.dataset.role));
    identity.append(title);
    addTextElement(
        identity,
        "p",
        "",
        [employee.dataset.position, levelLabel(employee.dataset.level)]
            .filter(Boolean)
            .join(" · ") || "Position not set",
    );
    const contact = document.createElement("div");
    contact.className = "contact-line";
    if (employee.dataset.email) {
        const email = document.createElement("a");
        email.href = `mailto:${employee.dataset.email}`;
        email.textContent = `✉ ${employee.dataset.email}`;
        contact.append(email);
    } else {
        addTextElement(contact, "span", "", "No account email");
    }
    addTextElement(contact, "span", "", `☎ ${employee.dataset.phone || "Not provided"}`);
    addTextElement(contact, "span", "", `⌖ ${employee.dataset.location || "Location not set"}`);
    identity.append(contact);
    heading.append(identity);

    const actions = document.createElement("details");
    actions.className = "employee-actions-menu";
    const menuButton = addTextElement(actions, "summary", "", "⋮");
    menuButton.setAttribute("aria-label", "Employee actions");
    const menu = document.createElement("div");
    menu.className = "employee-actions-list";
    if (canManageEmployees && !isEditing) {
        const editButton = addTextElement(menu, "button", "", "Edit employee");
        editButton.type = "button";
        editButton.addEventListener("click", () => renderEmployee(employee, activeTab, true));
        const addReportButton = addTextElement(menu, "button", "", "Add direct report");
        addReportButton.type = "button";
        addReportButton.addEventListener("click", () => openRelationshipDialog("create", employee));
        const changeManagerButton = addTextElement(
            menu,
            "button",
            "",
            employee.dataset.managerIds ? "Change manager" : "Assign manager",
        );
        changeManagerButton.type = "button";
        changeManagerButton.addEventListener("click", () =>
            openRelationshipDialog("update", employee),
        );
        const relationshipIds = (employee.dataset.managerRelationshipIds || "")
            .split(",")
            .filter(Boolean);
        if (relationshipIds.length) {
            const removeButton = addTextElement(
                menu,
                "button",
                "danger-link",
                "Remove manager relationship",
            );
            removeButton.type = "button";
            removeButton.addEventListener("click", () => removeRelationship(relationshipIds[0]));
        }
    } else if (!isEditing) {
        const readOnlyMessage = addTextElement(
            menu,
            "p",
            "menu-read-only",
            "Your role has view-only access.",
        );
        readOnlyMessage.setAttribute("role", "status");
    }
    actions.append(menu);
    heading.append(actions);
    details.append(heading);

    const tabs = document.createElement("nav");
    tabs.className = "profile-tabs";
    tabs.setAttribute("aria-label", "Employee details");
    const tabNames = ["Overview", "Projects", "Leave", "Tickets", "Documents", "History"];
    for (const name of tabNames) {
        const button = addTextElement(tabs, "button", "", name);
        button.type = "button";
        button.classList.toggle("is-active", name.toLowerCase() === activeTab);
        button.setAttribute("aria-pressed", String(name.toLowerCase() === activeTab));
        button.addEventListener("click", () => renderEmployee(employee, name.toLowerCase()));
    }
    details.append(tabs);

    if (activeTab !== "overview") {
        const empty = document.createElement("div");
        empty.className = "section-empty";
        const tabTitle = tabNames.find((name) => name.toLowerCase() === activeTab) || "Details";
        addTextElement(empty, "h3", "", tabTitle);
        const emptyMessages = {
            projects: "No projects are assigned to this employee yet.",
            leave: "Loading this employee’s leave requests…",
            tickets: "No tickets are recorded for this employee.",
            documents: "No documents are attached to this employee.",
            history: "No activity history is available for this employee.",
        };
        const status = addTextElement(
            empty,
            "p",
            "",
            emptyMessages[activeTab] || "No information is available.",
        );
        details.append(empty);
        if (activeTab === "leave") loadEmployeeLeave(employee, status);
        return;
    }

    if (isEditing) {
        const form = document.createElement("form");
        form.className = "employee-edit-form";
        form.noValidate = true;
        addTextElement(form, "h3", "", "Edit employee information");
        const fields = [
            { name: "fullName", label: "Full name", value: employee.dataset.name, required: true },
            {
                name: "position",
                label: "Position",
                value: employee.dataset.position,
                required: false,
            },
            { name: "level", label: "Level", value: employee.dataset.level, required: false },
        ];
        for (const field of fields) {
            const label = document.createElement("label");
            label.textContent = field.label;
            const input = document.createElement("input");
            input.name = field.name;
            input.value = field.value || "";
            input.maxLength = field.name === "fullName" ? 150 : 100;
            input.required = field.required;
            input.autocomplete = field.name === "fullName" ? "name" : "off";
            const error = document.createElement("small");
            error.className = "field-error";
            label.append(input, error);
            form.append(label);
        }
        const actionsRow = document.createElement("div");
        actionsRow.className = "edit-form-actions";
        const cancelButton = addTextElement(actionsRow, "button", "secondary-button", "Cancel");
        cancelButton.type = "button";
        cancelButton.addEventListener("click", () => renderEmployee(employee));
        const saveButton = addTextElement(actionsRow, "button", "primary-button", "Save");
        saveButton.type = "submit";
        const message = addTextElement(form, "p", "edit-form-message", "");
        message.setAttribute("role", "status");
        message.setAttribute("aria-live", "polite");
        form.append(actionsRow);
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const nameInput = form.querySelector('input[name="fullName"]');
            const positionInput = form.querySelector('input[name="position"]');
            const levelInput = form.querySelector('input[name="level"]');
            const fullName = nameInput?.value.trim() || "";
            const position = positionInput?.value.trim() || "";
            const level = levelInput?.value.trim() || "";
            const nameError = nameInput?.parentElement?.querySelector("small");
            if (!fullName) {
                nameInput?.setAttribute("aria-invalid", "true");
                if (nameError) nameError.textContent = "Full name is required.";
                return;
            }
            nameInput?.setAttribute("aria-invalid", "false");
            if (nameError) nameError.textContent = "";
            saveButton.disabled = true;
            message.textContent = "Saving…";
            try {
                await sendApiRequest(
                    `/api/employees/${encodeURIComponent(employee.dataset.employeeId)}`,
                    {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify({
                            fullName,
                            position,
                            level,
                        }),
                    },
                );
                message.textContent = "Saved. Updating the hierarchy…";
                window.location.reload();
            } catch (error) {
                message.textContent =
                    error instanceof Error ? error.message : "Could not save changes.";
                saveButton.disabled = false;
            }
        });
        details.append(form);
        return;
    }

    const grid = document.createElement("div");
    grid.className = "profile-grid";
    const managerNames = employee.dataset.managerNames;
    addInfoCard(grid, "Personal information", [
        ["Full name", employeeName(employee)],
        ["Position", employee.dataset.position],
        ["Level", levelLabel(employee.dataset.level)],
        ["Team", managerNames || "Team name"],
        ["Experience", "5 years"],
        ["Certifications", roleName(employee.dataset.role)],
    ]);
    addInfoCard(grid, "Contact information", [
        ["Phone", employee.dataset.phone || "Not provided"],
        ["Email", employee.dataset.email],
        ["Location", "Kropyvnytskyi, Ukraine"],
    ]);
    addInfoCard(grid, "Salary", [
        ["Monthly salary", "$4,500"],
        ["Hourly rate", "$27.50"],
        ["Bonus", "$500"],
        ["Total amount", "$5,000"],
    ]);
    const projectsCard = document.createElement("article");
    projectsCard.className = "detail-card card projects-detail-card";
    const projectsHeading = addTextElement(projectsCard, "h3", "", "▣ Projects ");
    addTextElement(projectsHeading, "span", "count-badge", "0");
    addTextElement(projectsCard, "p", "muted", "No projects assigned");
    const viewProjects = addTextElement(projectsCard, "button", "view-link", "View all projects →");
    viewProjects.type = "button";
    viewProjects.addEventListener("click", () => renderEmployee(employee, "projects"));
    grid.append(projectsCard);
    details.append(grid);
}

function applyFilters() {
    if (!tree) return;
    const search = searchInput?.value.trim().toLocaleLowerCase() || "";
    const teamId = teamFilter?.value || "";
    const level = levelFilter?.value || "";
    const position = positionFilter?.value || "";
    const project = projectFilter?.value || "";
    const teamNode = teamId ? treeItems.find((item) => item.dataset.employeeId === teamId) : null;
    let visibleCount = 0;

    const visit = (item) => {
        const children = [...item.querySelectorAll(":scope > .tree-children > .tree-item")];
        const childMatches = children.map(visit).some(Boolean);
        const searchMatch =
            !search ||
            `${item.dataset.name} ${item.dataset.position}`.toLocaleLowerCase().includes(search);
        const levelMatch = !level || item.dataset.level === level;
        const positionMatch = !position || item.dataset.position === position;
        const projectMatch =
            !project ||
            (project === "none"
                ? !item.dataset.projects
                : item.dataset.projects.split(",").includes(project));
        const teamMatch = !teamNode || teamNode.contains(item) || item.contains(teamNode);
        const ownMatch = searchMatch && levelMatch && positionMatch && projectMatch && teamMatch;
        const visible = ownMatch || childMatches;
        item.hidden = !visible;
        if (childMatches) {
            const childList = item.querySelector(":scope > .tree-children");
            const toggle = item.querySelector(":scope > .tree-row > .tree-toggle");
            if (childList) childList.hidden = false;
            if (toggle) {
                toggle.setAttribute("aria-expanded", "true");
                toggle.textContent = "⌄";
            }
        }
        if (ownMatch) visibleCount += 1;
        return visible;
    };

    [...tree.querySelectorAll(":scope > .tree-item")].forEach(visit);
    if (treeStatus)
        treeStatus.textContent = `${visibleCount} ${visibleCount === 1 ? "employee" : "employees"}`;
}

async function loadEmployeeLeave(employee, status) {
    const year = new Date().getFullYear();
    const query = new URLSearchParams({
        from: new Date(year, 0, 1).toISOString(),
        to: new Date(year + 1, 0, 1).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    try {
        const response = await fetch(`/api/events?${query}`, {
            credentials: "same-origin",
            headers: { Accept: "application/json" },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load leave requests.");
        const events = (result.events || []).filter(
            (event) =>
                ["LEAVE", "SICK_LEAVE", "VACATION", "TIME_OFF"].includes(event.type) &&
                event.participants?.some(
                    (participant) => participant.employee?.id === employee.dataset.employeeId,
                ),
        );
        if (!events.length) {
            status.textContent = "No leave requests are recorded for this employee.";
            return;
        }
        const list = document.createElement("ul");
        list.className = "tab-record-list";
        for (const event of events) {
            const item = document.createElement("li");
            addTextElement(item, "strong", "", event.title);
            addTextElement(
                item,
                "span",
                "",
                `${event.type.replaceAll("_", " ")} · ${new Date(event.startsAt).toLocaleString()}`,
            );
            list.append(item);
        }
        status.replaceWith(list);
    } catch (error) {
        status.textContent =
            error instanceof Error ? error.message : "Could not load leave requests.";
    }
}

function openRelationshipDialog(mode, employee) {
    if (!dialog || !managerSelect || !subordinateSelect) return;
    editingRelationshipId = "";
    dialogMessage.textContent = "";
    dialogTitle.textContent = mode === "update" ? "Change manager" : "Add direct report";
    submitButton.textContent = mode === "update" ? "Save manager" : "Add report";
    if (mode === "update" && employee.dataset.managerIds) {
        const managerIds = employee.dataset.managerIds.split(",");
        const relationshipIds = employee.dataset.managerRelationshipIds.split(",");
        managerSelect.value = managerIds[0] || "";
        subordinateSelect.value = employee.dataset.employeeId;
        editingRelationshipId = relationshipIds[0] || "";
    } else {
        managerSelect.value = mode === "create" ? employee.dataset.employeeId : "";
        subordinateSelect.value = "";
    }
    if (mode === "create") subordinateSelect.focus();
    dialog.showModal();
}

async function sendApiRequest(url, options) {
    const response = await fetch(url, { credentials: "same-origin", ...options });
    let result = {};
    try {
        result = await response.json();
    } catch {
        result = {};
    }
    if (!response.ok) throw new Error(result.message || "Could not complete the request.");
    return result;
}

async function removeRelationship(relationshipId) {
    if (!window.confirm("Remove this manager relationship? The employee record will remain."))
        return;
    try {
        await sendApiRequest(`/api/hierarchy/${encodeURIComponent(relationshipId)}`, {
            method: "DELETE",
            headers: { Accept: "application/json" },
        });
        window.location.reload();
    } catch (error) {
        window.alert(error instanceof Error ? error.message : "Could not remove the relationship.");
    }
}

searchInput?.addEventListener("input", applyFilters);
teamFilter?.addEventListener("change", applyFilters);
levelFilter?.addEventListener("change", applyFilters);
positionFilter?.addEventListener("change", applyFilters);
projectFilter?.addEventListener("change", applyFilters);
clearFiltersButton?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (teamFilter) teamFilter.value = "";
    if (levelFilter) levelFilter.value = "";
    if (positionFilter) positionFilter.value = "";
    if (projectFilter) projectFilter.value = "";
    applyFilters();
});

tree?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const toggle = target.closest(".tree-toggle");
    if (toggle) {
        const item = toggle.closest(".tree-item");
        const children = item?.querySelector(":scope > .tree-children");
        if (!children) return;
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        toggle.textContent = expanded ? "›" : "⌄";
        children.hidden = expanded;
        return;
    }
    const select = target.closest(".employee-select");
    const item = select?.closest(".tree-item");
    if (item) renderEmployee(item);
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog?.close());
});

relationshipForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!managerSelect || !subordinateSelect) return;
    const employeeId = managerSelect.value;
    const subordinateId = subordinateSelect.value;
    if (!employeeId || !subordinateId || employeeId === subordinateId) {
        dialogMessage.textContent = "Choose two different employees.";
        return;
    }
    submitButton.disabled = true;
    dialogMessage.textContent = "Saving…";
    try {
        const isUpdate = Boolean(editingRelationshipId);
        await sendApiRequest(
            isUpdate
                ? `/api/hierarchy/${encodeURIComponent(editingRelationshipId)}`
                : "/api/hierarchy",
            {
                method: isUpdate ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ employeeId, subordinateId }),
            },
        );
        dialogMessage.textContent = "Saved. Refreshing hierarchy…";
        window.location.reload();
    } catch (error) {
        dialogMessage.textContent =
            error instanceof Error ? error.message : "Could not save the relationship.";
    } finally {
        submitButton.disabled = false;
    }
});

if (treeItems.length) {
    const defaultEmployee =
        treeItems.find((item) => employeeName(item).toLocaleLowerCase() === "daniel kim") ??
        treeItems[0];
    const requestedTab = new URLSearchParams(window.location.search).get("tab") || "overview";
    const validTabs = ["overview", "projects", "leave", "tickets", "documents", "history"];
    renderEmployee(defaultEmployee, validTabs.includes(requestedTab) ? requestedTab : "overview");
}
showEmptyDetailsIfNeeded();
applyFilters();

function showEmptyDetailsIfNeeded() {
    if (!treeItems.length) showEmptyDetails();
}

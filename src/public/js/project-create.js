(() => {
    const form = document.querySelector("[data-project-create-form]");
    const linkFields = document.querySelector("[data-link-fields]");
    const addLinkButton = document.querySelector("[data-add-link]");
    const teamDialog = document.querySelector("[data-team-dialog]");
    const teamSelection = document.querySelector("[data-team-selection]");
    const teamChips = document.querySelector("[data-team-chips]");
    const teamOptions = [...document.querySelectorAll("[data-team-option]")];
    const errorMessage = document.querySelector("[data-create-error]");
    const submitButton = document.querySelector("[data-create-submit]");
    const descriptionCount = document.querySelector("[data-description-count]");
    if (!(form instanceof HTMLFormElement) || !(linkFields instanceof HTMLElement)) return;

    const selectedMemberIds = new Set();
    let draftMemberIds = new Set();
    let attemptedSubmit = false;

    const getField = (name) => form.elements.namedItem(name);
    const updateFieldState = (field) => {
        if (
            !(field instanceof HTMLElement) ||
            !("checkValidity" in field) ||
            typeof field.checkValidity !== "function"
        )
            return;
        const group = field.closest("[data-field]");
        if (!(group instanceof HTMLElement)) return;
        const invalid = !field.checkValidity();
        group.classList.toggle(
            "is-invalid",
            invalid && (attemptedSubmit || field.dataset.touched === "true"),
        );
    };

    form.querySelectorAll("[data-field] input, [data-field] select, [data-field] textarea").forEach(
        (field) => {
            field.addEventListener("blur", () => {
                field.dataset.touched = "true";
                updateFieldState(field);
            });
            field.addEventListener("input", () => updateFieldState(field));
            field.addEventListener("change", () => updateFieldState(field));
        },
    );

    const addLinkField = () => {
        const row = document.createElement("div");
        row.className = "project-link-row";
        const label = document.createElement("label");
        label.className = "project-link-input";
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute(
            "d",
            "M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7",
        );
        icon.append(path);
        const input = document.createElement("input");
        input.type = "url";
        input.placeholder = "Add link";
        input.setAttribute("aria-label", "Project link");
        label.append(icon, input);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "project-link-remove";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Remove link");
        remove.addEventListener("click", () => row.remove());
        row.append(label, remove);
        linkFields.append(row);
    };
    addLinkButton?.addEventListener("click", addLinkField);

    const renderTeam = () => {
        teamOptions.forEach((option) => {
            if (option instanceof HTMLInputElement)
                option.checked = selectedMemberIds.has(option.value);
        });
        if (teamChips instanceof HTMLElement) {
            teamChips.replaceChildren();
            selectedMemberIds.forEach((id) => {
                const option = teamOptions.find(
                    (item) => item instanceof HTMLInputElement && item.value === id,
                );
                const employeeName =
                    option?.closest("[data-employee-name]")?.querySelector("strong")?.textContent ||
                    "Team member";
                const chip = document.createElement("span");
                chip.className = "project-team-chip";
                chip.textContent = employeeName;
                teamChips.append(chip);
            });
        }
        if (teamSelection instanceof HTMLElement) {
            const hasMembers = selectedMemberIds.size > 0;
            teamSelection.hidden = hasMembers;
            if (teamChips instanceof HTMLElement) teamChips.hidden = !hasMembers;
        }
    };

    document.querySelector("[data-open-team]")?.addEventListener("click", () => {
        if (!(teamDialog instanceof HTMLDialogElement)) return;
        draftMemberIds = new Set(selectedMemberIds);
        teamOptions.forEach((option) => {
            if (option instanceof HTMLInputElement)
                option.checked = draftMemberIds.has(option.value);
        });
        teamDialog.showModal();
    });
    teamOptions.forEach((option) => {
        option.addEventListener("change", () => {
            if (!(option instanceof HTMLInputElement)) return;
            if (option.checked) draftMemberIds.add(option.value);
            else draftMemberIds.delete(option.value);
        });
    });
    document.querySelectorAll("[data-close-team]").forEach((button) => {
        button.addEventListener(
            "click",
            () => teamDialog instanceof HTMLDialogElement && teamDialog.close(),
        );
    });
    document.querySelector("[data-save-team]")?.addEventListener("click", () => {
        selectedMemberIds.clear();
        draftMemberIds.forEach((id) => selectedMemberIds.add(id));
        renderTeam();
        if (teamDialog instanceof HTMLDialogElement) teamDialog.close();
    });
    const teamSearch = document.querySelector("[data-team-search]");
    teamSearch?.addEventListener("input", () => {
        const query =
            teamSearch instanceof HTMLInputElement
                ? teamSearch.value.trim().toLocaleLowerCase()
                : "";
        document.querySelectorAll("[data-employee-name]").forEach((row) => {
            if (!(row instanceof HTMLElement)) return;
            row.hidden = !row.dataset.employeeName?.includes(query);
        });
    });

    const description = getField("description");
    description?.addEventListener("input", () => {
        if (descriptionCount instanceof HTMLElement && description instanceof HTMLTextAreaElement) {
            descriptionCount.textContent = String(description.value.length);
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        attemptedSubmit = true;
        const fields = [
            ...form.querySelectorAll(
                "[data-field] input, [data-field] select, [data-field] textarea",
            ),
        ];
        fields.forEach(updateFieldState);
        if (!form.reportValidity()) return;

        const title = getField("title");
        const ownerId = getField("ownerId");
        const budget = getField("budget");
        const deadline = getField("deadline");
        if (
            !(title instanceof HTMLInputElement) ||
            ownerId?.tagName !== "SELECT" ||
            !(budget instanceof HTMLInputElement) ||
            !(deadline instanceof HTMLInputElement)
        )
            return;
        if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;
        if (errorMessage instanceof HTMLElement) errorMessage.textContent = "";

        const links = [...linkFields.querySelectorAll('input[type="url"]')]
            .map((input) => input.value.trim())
            .filter(Boolean);
        const payload = {
            title: title.value,
            description: description instanceof HTMLTextAreaElement ? description.value : "",
            ownerId: ownerId.value,
            budget: Number(budget.value),
            deadline: deadline.value || null,
            links,
            memberIds: [...selectedMemberIds],
        };

        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify(payload),
            });
            const responseBody = await response.json();
            if (!response.ok) {
                const message =
                    typeof responseBody === "object" &&
                    responseBody !== null &&
                    "message" in responseBody &&
                    typeof responseBody.message === "string"
                        ? responseBody.message
                        : "Unable to create project. Please try again.";
                throw new Error(message);
            }
            const createdProject =
                typeof responseBody === "object" &&
                responseBody !== null &&
                "project" in responseBody
                    ? responseBody.project
                    : null;
            if (
                typeof createdProject !== "object" ||
                createdProject === null ||
                !("id" in createdProject) ||
                typeof createdProject.id !== "string"
            ) {
                window.location.assign("/projects");
                return;
            }
            window.location.assign(`/projects/${encodeURIComponent(createdProject.id)}`);
        } catch (requestError) {
            if (errorMessage instanceof HTMLElement) {
                errorMessage.textContent =
                    requestError instanceof Error
                        ? requestError.message
                        : "Unable to create project. Please try again.";
            }
        } finally {
            if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
        }
    });

    renderTeam();
})();

(() => {
    const dialog = document.querySelector("[data-project-dialog]");
    const form = document.querySelector("[data-project-form]");
    const heading = document.querySelector("[data-dialog-heading]");
    const error = document.querySelector("[data-project-error]");
    const submit = document.querySelector("[data-project-submit]");
    const toast = document.querySelector("[data-project-toast]");
    const rows = [...document.querySelectorAll("[data-project-row]")];
    const count = document.querySelector("[data-project-count]");
    const pagination = document.querySelector("[data-project-pagination]");
    if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement)) return;

    let editingId = null;
    let toastTimer;
    let currentPage = 1;
    const pageSize = 5;
    const title = form.elements.namedItem("title");
    const description = form.elements.namedItem("description");
    const showToast = (message) => {
        if (!(toast instanceof HTMLElement)) return;
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3500);
    };

    document.querySelectorAll("[data-project-close]").forEach((button) => {
        button.addEventListener("click", () => dialog.close());
    });
    document.querySelectorAll("[data-project-edit]").forEach((button) => {
        button.addEventListener("click", () => {
            if (!(button instanceof HTMLElement)) return;
            editingId = button.dataset.projectEdit || null;
            if (
                !editingId ||
                !(title instanceof HTMLInputElement) ||
                !(description instanceof HTMLTextAreaElement)
            )
                return;
            title.value = button.dataset.projectTitle || "";
            description.value = button.dataset.projectDescription || "";
            if (heading) heading.textContent = "Edit project";
            if (submit) submit.textContent = "Save changes";
            if (error) error.textContent = "";
            dialog.showModal();
        });
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!(title instanceof HTMLInputElement) || !(description instanceof HTMLTextAreaElement))
            return;
        if (submit instanceof HTMLButtonElement) submit.disabled = true;
        if (error) error.textContent = "";
        try {
            const response = await fetch(
                editingId ? `/api/projects/${encodeURIComponent(editingId)}` : "/api/projects",
                {
                    method: editingId ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify({ title: title.value, description: description.value }),
                },
            );
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "Unable to save project.");
            dialog.close();
            showToast(payload.message || "Project saved");
            window.setTimeout(() => window.location.reload(), 450);
        } catch (requestError) {
            if (error)
                error.textContent =
                    requestError instanceof Error
                        ? requestError.message
                        : "Unable to save project.";
        } finally {
            if (submit instanceof HTMLButtonElement) submit.disabled = false;
        }
    });

    const renderPage = () => {
        const pageCount = Math.ceil(rows.length / pageSize);
        currentPage = Math.min(Math.max(currentPage, 1), Math.max(pageCount, 1));
        rows.forEach((row, index) => {
            row.hidden = index < (currentPage - 1) * pageSize || index >= currentPage * pageSize;
        });
        if (count) {
            const first = rows.length ? (currentPage - 1) * pageSize + 1 : 0;
            const last = Math.min(currentPage * pageSize, rows.length);
            count.textContent = `Showing ${first}-${last} of ${rows.length}`;
        }
        if (!(pagination instanceof HTMLElement)) return;
        pagination.replaceChildren();
        const addButton = (label, page, ariaLabel, disabled = false, current = false) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.setAttribute("aria-label", ariaLabel);
            if (current) button.setAttribute("aria-current", "page");
            button.disabled = disabled;
            button.addEventListener("click", () => {
                currentPage = page;
                renderPage();
            });
            pagination.append(button);
        };
        addButton("‹", currentPage - 1, "Previous page", currentPage <= 1);
        for (let page = 1; page <= pageCount; page += 1) {
            if (pageCount > 5 && page > 3 && page < pageCount) {
                if (page === 4) {
                    const ellipsis = document.createElement("span");
                    ellipsis.textContent = "…";
                    pagination.append(ellipsis);
                }
                continue;
            }
            addButton(String(page), page, `Page ${page}`, false, page === currentPage);
        }
        addButton("›", currentPage + 1, "Next page", currentPage >= pageCount);
    };
    renderPage();
})();

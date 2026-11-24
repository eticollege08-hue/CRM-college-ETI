(() => {
    const page = document.querySelector("[data-project-id]");
    const editDialog = document.querySelector("[data-project-dialog]");
    const editForm = document.querySelector("[data-project-form]");
    const deleteDialog = document.querySelector("[data-delete-dialog]");
    const feedbackDialog = document.querySelector("[data-feedback-dialog]");
    const feedbackContent = document.querySelector("[data-feedback-kind]");
    const feedbackTitle = document.querySelector("[data-feedback-title]");
    const feedbackMessage = document.querySelector("[data-feedback-message]");
    const notifications = document.querySelector("[data-notifications]");
    const error = document.querySelector("[data-project-error]");
    const submit = document.querySelector("[data-project-submit]");
    if (
        !(page instanceof HTMLElement) ||
        !(editDialog instanceof HTMLDialogElement) ||
        !(editForm instanceof HTMLFormElement)
    )
        return;

    const projectId = page.dataset.projectId;
    const title = editForm.elements.namedItem("title");
    const description = editForm.elements.namedItem("description");
    const openEdit = document.querySelector("[data-project-edit]");
    const openDelete = document.querySelector("[data-project-delete]");
    const confirmDelete = document.querySelector("[data-delete-confirm]");
    const deleteName = document.querySelector("[data-delete-name]");
    let nextAction = "";

    const showFeedback = (kind, titleText, message, action = "") => {
        if (!(feedbackDialog instanceof HTMLDialogElement)) return;
        if (feedbackContent instanceof HTMLElement) feedbackContent.dataset.feedbackKind = kind;
        if (feedbackTitle instanceof HTMLElement) feedbackTitle.textContent = titleText;
        if (feedbackMessage instanceof HTMLElement) feedbackMessage.textContent = message;
        nextAction = action;
        feedbackDialog.showModal();
    };

    const addNotification = (kind, titleText, message) => {
        if (!(notifications instanceof HTMLElement)) return;
        const item = document.createElement("div");
        item.className = "project-notification";
        item.dataset.kind = kind;
        const icon = document.createElement("span");
        icon.className = "project-notification-icon";
        icon.textContent = kind === "success" ? "✓" : "!";
        const copy = document.createElement("span");
        copy.className = "project-notification-copy";
        const titleNode = document.createElement("strong");
        titleNode.textContent = titleText;
        const messageNode = document.createElement("span");
        messageNode.textContent = message;
        copy.append(titleNode, messageNode);
        item.append(icon, copy);
        notifications.hidden = false;
        notifications.prepend(item);
        window.setTimeout(() => {
            item.remove();
            if (!notifications.childElementCount) notifications.hidden = true;
        }, 6000);
    };

    openEdit?.addEventListener("click", () => editDialog.showModal());
    document.querySelectorAll("[data-project-close]").forEach((button) => {
        button.addEventListener("click", () => editDialog.close());
    });
    openDelete?.addEventListener("click", () => {
        if (deleteDialog instanceof HTMLDialogElement) {
            if (deleteName instanceof HTMLInputElement) deleteName.value = "";
            if (confirmDelete instanceof HTMLButtonElement) confirmDelete.disabled = true;
            deleteDialog.showModal();
        }
    });
    deleteName?.addEventListener("input", () => {
        if (deleteName instanceof HTMLInputElement && confirmDelete instanceof HTMLButtonElement) {
            confirmDelete.disabled = deleteName.value.trim() !== (page.dataset.projectTitle || "");
        }
    });
    document.querySelectorAll("[data-feedback-close]").forEach((button) => {
        button.addEventListener(
            "click",
            () => feedbackDialog instanceof HTMLDialogElement && feedbackDialog.close(),
        );
    });
    feedbackDialog?.addEventListener("close", () => {
        if (nextAction === "reload") window.location.reload();
        if (nextAction === "projects") window.location.assign("/projects");
        nextAction = "";
    });

    editForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (
            !(title instanceof HTMLInputElement) ||
            !(description instanceof HTMLTextAreaElement) ||
            !projectId
        )
            return;
        const updatedTitle = title.value;
        if (submit instanceof HTMLButtonElement) submit.disabled = true;
        if (error) error.textContent = "";
        try {
            const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({ title: title.value, description: description.value }),
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "Unable to update project.");
            editDialog.close();
            addNotification(
                "success",
                `Project “${updatedTitle}”`,
                "has been successfully updated.",
            );
            showFeedback(
                "success",
                "Success",
                payload.message || `Project “${updatedTitle}” has been successfully updated.`,
                "reload",
            );
        } catch (requestError) {
            const message =
                requestError instanceof Error ? requestError.message : "Unable to update project.";
            if (error) error.textContent = message;
            addNotification("error", "Failed to update project.", "Please try again.");
            showFeedback("error", "Error", message);
        } finally {
            if (submit instanceof HTMLButtonElement) submit.disabled = false;
        }
    });

    confirmDelete?.addEventListener("click", async () => {
        if (!projectId || !(confirmDelete instanceof HTMLButtonElement)) return;
        confirmDelete.disabled = true;
        try {
            const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
                method: "DELETE",
                headers: { Accept: "application/json" },
                credentials: "include",
                cache: "no-store",
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "Unable to delete project.");
            if (deleteDialog instanceof HTMLDialogElement) deleteDialog.close();
            addNotification(
                "success",
                `Project “${page.dataset.projectTitle || ""}”`,
                "has been deleted.",
            );
            showFeedback(
                "success",
                "Success",
                payload.message || "Project has been successfully deleted.",
                "projects",
            );
        } catch (requestError) {
            const message =
                requestError instanceof Error ? requestError.message : "Unable to delete project.";
            if (deleteDialog instanceof HTMLDialogElement) deleteDialog.close();
            addNotification("error", "Failed to delete project.", "Please try again.");
            showFeedback("error", "Error", message);
        } finally {
            confirmDelete.disabled = false;
        }
    });
})();

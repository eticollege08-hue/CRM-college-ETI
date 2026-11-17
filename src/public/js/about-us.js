(() => {
    const dialog = document.querySelector("[data-about-dialog]");
    const deleteDialog = document.querySelector("[data-delete-dialog]");
    const form = document.querySelector("[data-about-form]");
    const records = document.querySelector(".about-cards");
    const addButtons = document.querySelectorAll("[data-about-add]");
    const toast = document.querySelector("[data-about-toast]");
    const toastMessage = toast?.querySelector("[data-toast-message]");
    const toastDismiss = toast?.querySelector("[data-toast-dismiss]");
    const titleInput = form instanceof HTMLFormElement ? form.elements.namedItem("title") : null;
    const descriptionInput =
        form instanceof HTMLFormElement ? form.elements.namedItem("description") : null;
    const titleError = form?.querySelector('[data-field-error="title"]');
    const descriptionError = form?.querySelector('[data-field-error="description"]');
    const requestError = form?.querySelector("[data-request-error]");
    const descriptionCount = form?.querySelector("[data-description-count]");
    const heading = form?.querySelector("[data-dialog-title]");
    const saveButton = form?.querySelector("[data-dialog-save]");
    const deleteMessage = deleteDialog?.querySelector("[data-delete-message]");
    const deleteButton = deleteDialog?.querySelector("[data-delete-confirm]");
    let editingId = null;
    let deletingId = null;
    let validationVisible = false;
    let toastTimer;

    const showToast = (kind, message) => {
        if (!(toast instanceof HTMLElement) || !(toastMessage instanceof HTMLElement)) return;
        toast.dataset.kind = kind;
        toastMessage.textContent = message;
        toast.hidden = false;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 5000);
    };

    const showFlash = (kind, message) => {
        window.sessionStorage.setItem("about-us-toast", JSON.stringify({ kind, message }));
        window.location.reload();
    };

    const pendingToast = window.sessionStorage.getItem("about-us-toast");
    if (pendingToast) {
        window.sessionStorage.removeItem("about-us-toast");
        try {
            const flash = JSON.parse(pendingToast);
            if (flash?.kind && flash?.message) showToast(flash.kind, flash.message);
        } catch {
            // Ignore stale or malformed one-time notification data.
        }
    }

    const save = async (url, method, body) => {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            credentials: "include",
            cache: "no-store",
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok)
            throw new Error(result?.message || "Unable to save changes. Please try again.");
    };

    const validateForm = (revealErrors = false) => {
        if (
            !(titleInput instanceof HTMLInputElement) ||
            !(descriptionInput instanceof HTMLTextAreaElement)
        )
            return false;
        validationVisible ||= revealErrors;
        const titleValid = titleInput.value.trim().length > 0;
        const descriptionValid = descriptionInput.value.trim().length > 0;
        const titleTouched = validationVisible || titleInput.dataset.touched === "true";
        const descriptionTouched = validationVisible || descriptionInput.dataset.touched === "true";

        titleInput.classList.toggle("is-invalid", !titleValid && titleTouched);
        descriptionInput.classList.toggle("is-invalid", !descriptionValid && descriptionTouched);
        if (titleError)
            titleError.textContent = !titleValid && titleTouched ? "Title is required" : "";
        if (descriptionError)
            descriptionError.textContent =
                !descriptionValid && descriptionTouched ? "Description is required" : "";
        if (descriptionCount)
            descriptionCount.textContent = `${descriptionInput.value.length}/1000`;
        const touchedInvalid =
            (titleInput.dataset.touched === "true" && !titleValid) ||
            (descriptionInput.dataset.touched === "true" && !descriptionValid);
        if (saveButton instanceof HTMLButtonElement)
            saveButton.disabled =
                (validationVisible && (!titleValid || !descriptionValid)) || touchedInvalid;
        return titleValid && descriptionValid;
    };

    const openDialog = (record = null) => {
        if (!(dialog instanceof HTMLDialogElement) || !(form instanceof HTMLFormElement)) return;
        editingId = record?.dataset.recordId || null;
        validationVisible = false;
        const card = record?.querySelector(".about-card-copy");
        if (titleInput instanceof HTMLInputElement) {
            titleInput.value = card?.querySelector("h2")?.textContent || "";
            delete titleInput.dataset.touched;
        }
        if (descriptionInput instanceof HTMLTextAreaElement) {
            descriptionInput.value = card?.querySelector("p")?.textContent || "";
            delete descriptionInput.dataset.touched;
        }
        if (heading) heading.textContent = editingId ? "Edit section" : "Add section";
        if (requestError) requestError.textContent = "";
        validateForm();
        dialog.showModal();
        if (titleInput instanceof HTMLElement) titleInput.focus();
    };

    addButtons.forEach((button) => button.addEventListener("click", () => openDialog()));
    toastDismiss?.addEventListener("click", () => {
        if (toast instanceof HTMLElement) toast.hidden = true;
    });

    if (dialog instanceof HTMLDialogElement && form instanceof HTMLFormElement) {
        form.addEventListener("input", () => validateForm());
        form.addEventListener("focusout", (event) => {
            const target = event.target;
            if (target === titleInput || target === descriptionInput) {
                target.dataset.touched = "true";
                validateForm();
            }
        });
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!validateForm(true)) {
                if (titleInput instanceof HTMLInputElement && !titleInput.value.trim())
                    titleInput.focus();
                else if (descriptionInput instanceof HTMLTextAreaElement) descriptionInput.focus();
                return;
            }
            if (
                !(titleInput instanceof HTMLInputElement) ||
                !(descriptionInput instanceof HTMLTextAreaElement)
            )
                return;
            if (saveButton instanceof HTMLButtonElement) {
                saveButton.disabled = true;
                saveButton.textContent = "Saving...";
            }
            try {
                await save(
                    editingId ? `/api/about-us/${editingId}` : "/api/about-us",
                    editingId ? "PATCH" : "POST",
                    { title: titleInput.value.trim(), description: descriptionInput.value.trim() },
                );
                showFlash(
                    "success",
                    editingId ? "Section updated successfully!" : "Section added successfully!",
                );
            } catch (cause) {
                if (requestError)
                    requestError.textContent =
                        cause instanceof Error
                            ? cause.message
                            : "Failed to save section. Please try again.";
                if (saveButton instanceof HTMLButtonElement) {
                    validateForm();
                    saveButton.textContent = "Save";
                }
            }
        });
        form.querySelector("[data-dialog-cancel]")?.addEventListener("click", () => dialog.close());
    }

    deleteDialog?.querySelectorAll("[data-delete-cancel]").forEach((button) => {
        button.addEventListener("click", () => {
            if (deleteDialog instanceof HTMLDialogElement) deleteDialog.close();
        });
    });

    deleteButton?.addEventListener("click", async () => {
        if (!deletingId || !(deleteButton instanceof HTMLButtonElement)) return;
        deleteButton.disabled = true;
        try {
            await save(`/api/about-us/${deletingId}`, "DELETE");
            showFlash("success", "Section deleted successfully!");
        } catch (cause) {
            if (deleteDialog instanceof HTMLDialogElement) deleteDialog.close();
            showToast(
                "error",
                cause instanceof Error
                    ? cause.message
                    : "Failed to delete section. Please try again.",
            );
        } finally {
            deleteButton.disabled = false;
            deletingId = null;
        }
    });

    records?.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const card = target.closest("[data-record-id]");
        if (!(card instanceof HTMLElement)) return;

        if (target.closest("[data-about-edit]")) {
            openDialog(card);
            return;
        }
        if (target.closest("[data-about-delete]")) {
            deletingId = card.dataset.recordId || null;
            if (deleteMessage) {
                deleteMessage.textContent =
                    "Are you sure you want to delete this section? This action cannot be undone.";
            }
            if (deleteDialog instanceof HTMLDialogElement) deleteDialog.showModal();
            return;
        }

        const moveButton = target.closest("button[data-move]");
        if (!(moveButton instanceof HTMLButtonElement) || moveButton.disabled) return;
        const move = moveButton.getAttribute("data-move");
        if (move !== "up" && move !== "down") return;
        const cards = Array.from(records.querySelectorAll("[data-record-id]"));
        const index = cards.indexOf(card);
        const nextIndex = move === "up" ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= cards.length) return;
        const reordered = [...cards];
        [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
        try {
            await save("/api/about-us/order", "PATCH", {
                ids: reordered.map((item) => item.dataset.recordId),
            });
            showFlash("success", "Section order updated!");
        } catch (cause) {
            showToast(
                "error",
                cause instanceof Error ? cause.message : "Unable to reorder sections.",
            );
        }
    });
})();

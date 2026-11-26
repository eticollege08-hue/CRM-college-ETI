(() => {
    const form = document.querySelector("[data-project-create-form]");
    if (!(form instanceof HTMLFormElement)) return;

    const title = form.elements.namedItem("title");
    const description = form.elements.namedItem("description");
    const error = document.querySelector("[data-create-error]");
    const submit = document.querySelector("[data-create-submit]");
    const count = document.querySelector("[data-description-count]");

    description?.addEventListener("input", () => {
        if (description instanceof HTMLTextAreaElement && count instanceof HTMLElement) {
            count.textContent = String(description.value.length);
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (
            !(title instanceof HTMLInputElement) ||
            !(description instanceof HTMLTextAreaElement) ||
            !form.reportValidity()
        )
            return;

        if (submit instanceof HTMLButtonElement) submit.disabled = true;
        if (error instanceof HTMLElement) error.textContent = "";

        try {
            const response = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({ title: title.value, description: description.value }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(
                    typeof result?.message === "string"
                        ? result.message
                        : "Unable to create project. Please try again.",
                );
            }

            const id = result?.project?.id;
            window.location.assign(
                typeof id === "string" ? `/projects/${encodeURIComponent(id)}` : "/projects",
            );
        } catch (requestError) {
            if (error instanceof HTMLElement) {
                error.textContent =
                    requestError instanceof Error
                        ? requestError.message
                        : "Unable to create project. Please try again.";
            }
        } finally {
            if (submit instanceof HTMLButtonElement) submit.disabled = false;
        }
    });
})();

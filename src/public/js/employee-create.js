const form = document.querySelector("#employee-form");
const message = document.querySelector("#form-message");
const cancelButton = document.querySelector("#cancel-button");

if (form instanceof HTMLFormElement) {
    const requiredFields = [...form.querySelectorAll("[required]")];
    const saveButton = form.querySelector('button[type="submit"]');

    const validate = (field) => {
        const control = field;
        const error = control.parentElement?.querySelector("small");
        let text = "";
        if (!control.value.trim()) text = "This field is required";
        else if (control.type === "email" && !control.validity.valid)
            text = "Enter a valid email address";
        else if (
            control.type === "number" &&
            (!control.validity.valid || Number(control.value) < 0)
        )
            text = "Enter a valid positive number";
        control.setAttribute("aria-invalid", text ? "true" : "false");
        if (error) error.textContent = text;
        return !text;
    };

    requiredFields.forEach((field) => {
        field.addEventListener("input", () => validate(field));
        field.addEventListener("change", () => validate(field));
    });
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const invalidFields = requiredFields.filter((field) => !validate(field));
        if (invalidFields.length > 0) {
            const fieldNames = invalidFields
                .map((field) =>
                    field.parentElement
                        ?.querySelector(".field-title")
                        ?.textContent?.replace("*", "")
                        .trim(),
                )
                .filter(Boolean);
            message.textContent = `Please check the highlighted fields: ${fieldNames.join(", ")}.`;
            return;
        }

        const values = new FormData(form);
        const payload = {
            fullName: String(values.get("fullName") || "").trim(),
            phoneNumber: String(values.get("phone") || "").trim(),
            email: String(values.get("email") || "").trim(),
            password: String(values.get("password") || ""),
            managerId: String(values.get("manager") || ""),
            position: String(values.get("position") || "").trim(),
            experience: Number(values.get("experience")),
            salary: Number(values.get("salary")),
        };

        if (saveButton instanceof HTMLButtonElement) saveButton.disabled = true;
        message.textContent = "Saving employee…";
        try {
            const response = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => null);
            if (
                !response.ok ||
                !result ||
                typeof result !== "object" ||
                !("success" in result) ||
                result.success !== true
            ) {
                const details =
                    result &&
                    typeof result === "object" &&
                    "details" in result &&
                    Array.isArray(result.details)
                        ? result.details.filter(
                              (detail) =>
                                  detail &&
                                  typeof detail === "object" &&
                                  "field" in detail &&
                                  typeof detail.field === "string" &&
                                  "message" in detail &&
                                  typeof detail.message === "string",
                          )
                        : [];
                const labels = {
                    fullName: "Full name",
                    phoneNumber: "Phone number",
                    email: "Email",
                    password: "Password",
                    managerId: "Manager",
                    position: "Position",
                    experience: "Experience",
                    salary: "Salary",
                    role: "Role",
                };
                for (const detail of details) {
                    const fieldName = detail.field === "managerId" ? "manager" : detail.field;
                    const field = form.elements.namedItem(fieldName);
                    if (field instanceof HTMLElement && "setAttribute" in field) {
                        field.setAttribute("aria-invalid", "true");
                        const error = field.parentElement?.querySelector("small");
                        if (error) error.textContent = detail.message;
                    }
                }
                const invalidLabels = [
                    ...new Set(details.map((detail) => labels[detail.field]).filter(Boolean)),
                ];
                const apiMessage =
                    result &&
                    typeof result === "object" &&
                    "message" in result &&
                    typeof result.message === "string"
                        ? result.message
                        : `Could not save the employee (HTTP ${response.status}). Reload the page and retry.`;
                throw new Error(
                    invalidLabels.length > 0
                        ? `${apiMessage} Check: ${invalidLabels.join(", ")}.`
                        : apiMessage,
                );
            }
            window.location.assign("/hierarchy");
        } catch (error) {
            message.textContent =
                error instanceof Error
                    ? error.message
                    : "Could not save the employee. Please try again.";
            if (saveButton instanceof HTMLButtonElement) saveButton.disabled = false;
        }
    });
    cancelButton?.addEventListener("click", () => {
        window.location.assign("/hierarchy");
    });
}

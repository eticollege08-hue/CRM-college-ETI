const form = document.querySelector("#employee-form");
const message = document.querySelector("#form-message");
const cancelButton = document.querySelector("#cancel-button");

if (form instanceof HTMLFormElement) {
    const requiredFields = [...form.querySelectorAll("[required]")];

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

    requiredFields.forEach((field) => field.addEventListener("input", () => validate(field)));
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const data = Object.fromEntries([...new FormData(form)].filter(([, v]) => v !== ""));
        for (const key of ["experience", "salary"]) if (key in data) data[key] = Number(data[key]);
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        try {
            const response = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                message.textContent = [
                    result.message,
                    ...(result.details ?? []).map((d) => d.field + " — " + d.message),
                ].join(" ");
                return;
            }
            window.location.assign("/employees/" + result.employee.id + "/profile");
        } catch {
            message.textContent = "Could not save employee.";
        } finally {
            button.disabled = false;
        }
    });
    cancelButton?.addEventListener("click", () => {
        form.reset();
        requiredFields.forEach((field) => {
            field.setAttribute("aria-invalid", "false");
            const error = field.parentElement?.querySelector("small");
            if (error) error.textContent = "";
        });
        message.textContent = "";
    });
}

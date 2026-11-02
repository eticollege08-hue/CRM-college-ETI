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
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const valid = requiredFields.map(validate).every(Boolean);
        message.textContent = valid
            ? "Form is valid. Employee saving will be enabled when the employee API is available."
            : "Please fix the highlighted fields.";
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

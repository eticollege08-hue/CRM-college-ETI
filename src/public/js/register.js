const form = document.querySelector("#registration-form");

if (form instanceof HTMLFormElement) {
    const fullNameInput = form.querySelector("#full-name");
    const emailInput = form.querySelector("#email");
    const passwordInput = form.querySelector("#password");
    const confirmPasswordInput = form.querySelector("#confirm-password");
    const message = document.querySelector("#registration-message");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        fullNameInput instanceof window.HTMLInputElement &&
        emailInput instanceof window.HTMLInputElement &&
        passwordInput instanceof window.HTMLInputElement &&
        confirmPasswordInput instanceof window.HTMLInputElement
    ) {
        const fields = [fullNameInput, emailInput, passwordInput, confirmPasswordInput];

        const setFieldError = (input, text) => {
            const error = document.querySelector(`#${input.id}-error`);
            input.setAttribute("aria-invalid", text ? "true" : "false");
            if (error) error.textContent = text;
        };

        const setMessage = (text, state = "error") => {
            if (!(message instanceof window.HTMLElement)) return;
            message.textContent = text;
            message.dataset.state = state;
            message.hidden = !text;
        };

        const validate = () => {
            const fullName = fullNameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            const errors = [
                fullName ? "" : "Full Name is required.",
                !email
                    ? "Email is required."
                    : emailPattern.test(email)
                      ? ""
                      : "Enter a valid email address.",
                password ? "" : "Password is required.",
                !confirmPassword
                    ? "Please confirm your password."
                    : password === confirmPassword
                      ? ""
                      : "Passwords do not match.",
            ];

            fields.forEach((field, index) => setFieldError(field, errors[index]));
            return errors.every((error) => error === "");
        };

        form.addEventListener("input", (event) => {
            if (event.target instanceof window.HTMLInputElement) {
                setFieldError(event.target, "");
                setMessage("");
            }
        });

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            setMessage("");

            if (!validate()) {
                setMessage("Please correct the highlighted fields.");
                return;
            }

            setMessage("The form looks good. Account creation is not connected yet.", "success");
        });
    }
}

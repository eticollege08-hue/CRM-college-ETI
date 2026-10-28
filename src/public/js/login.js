const form = document.querySelector("#login-form");

if (form instanceof HTMLFormElement) {
    const emailInput = form.elements.namedItem("email");
    const passwordInput = form.elements.namedItem("password");
    const submitButton = document.querySelector("#submit-button");
    const buttonLabel = submitButton?.querySelector(".button-label");
    const buttonLoading = submitButton?.querySelector(".button-loading");
    const formMessage = document.querySelector("#form-message");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const setFieldError = (input, message) => {
        const error = document.querySelector(`#${input.id}-error`);
        input.setAttribute("aria-invalid", message ? "true" : "false");
        if (error) error.textContent = message;
    };

    const setMessage = (message) => {
        if (!formMessage) return;
        formMessage.textContent = message;
        formMessage.hidden = !message;
    };

    const setLoading = (loading) => {
        if (!(submitButton instanceof HTMLButtonElement)) return;
        submitButton.disabled = loading;
        if (buttonLabel) buttonLabel.hidden = loading;
        if (buttonLoading) buttonLoading.hidden = !loading;
    };

    form.addEventListener("input", (event) => {
        if (event.target === emailInput || event.target === passwordInput) {
            setFieldError(event.target, "");
            setMessage("");
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("");

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const emailError = !email
            ? "Email is required."
            : !emailPattern.test(email)
              ? "Enter a valid email address."
              : "";
        const passwordError = password ? "" : "Password is required.";
        setFieldError(emailInput, emailError);
        setFieldError(passwordInput, passwordError);
        if (emailError || passwordError) return;

        setLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                credentials: "include",
                cache: "no-store",
                body: JSON.stringify({ email, password }),
            });
            const result = await response.json().catch(() => ({}));

            if (response.ok) {
                window.location.assign("/design-preview.html");
                return;
            }

            if (response.status === 401) {
                setFieldError(emailInput, "Check your email and password.");
                setFieldError(passwordInput, "Check your email and password.");
                setMessage(result.message || "Invalid email or password.");
            } else if (response.status === 429) {
                setMessage(result.message || "Too many attempts. Please try again later.");
            } else if (response.status === 422 && Array.isArray(result.details)) {
                for (const detail of result.details) {
                    if (detail.field === "email") setFieldError(emailInput, detail.message);
                    if (detail.field === "password") setFieldError(passwordInput, detail.message);
                }
                setMessage(result.message || "Please correct the highlighted fields.");
            } else {
                setMessage(result.message || "Unable to sign in right now. Please try again.");
            }
        } catch {
            setMessage("Unable to connect. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    });
}

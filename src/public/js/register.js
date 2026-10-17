const form = document.querySelector("#register-form");

if (form instanceof HTMLFormElement) {
  const fullNameInput = form.elements.namedItem("name");
  const emailInput = form.elements.namedItem("email");
  const passwordInput = form.elements.namedItem("password");
  const confirmInput = form.elements.namedItem("confirmPassword");
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
    if (event.target instanceof HTMLInputElement) setFieldError(event.target, "");
    setMessage("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const name = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;
    const errors = {
      name: name ? "" : "Full name is required.",
      email: !email ? "Email is required." : !emailPattern.test(email) ? "Enter a valid email address." : "",
      password: password ? "" : "Password is required.",
      confirmPassword: !confirmPassword ? "Please confirm your password." : password !== confirmPassword ? "Passwords do not match." : "",
    };
    setFieldError(fullNameInput, errors.name);
    setFieldError(emailInput, errors.email);
    setFieldError(passwordInput, errors.password);
    setFieldError(confirmInput, errors.confirmPassword);
    if (Object.values(errors).some(Boolean)) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        window.location.assign("/login?registered=1");
        return;
      }
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (response.status === 409) {
        setMessage(result.message || "An account with this email already exists.");
      } else if (response.status === 422 && Array.isArray(result.details)) {
        for (const detail of result.details) {
          const input = { name: fullNameInput, email: emailInput, password: passwordInput }[detail.field];
          if (input) setFieldError(input, detail.message);
        }
        setMessage(result.message || "Please correct the highlighted fields.");
      } else if (response.status === 404) {
        setMessage("Registration is not available yet. Please try again later.");
      } else {
        setMessage(result.message || "Unable to create an account right now. Please try again.");
      }
    } catch {
      setMessage("Unable to connect. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  });
}

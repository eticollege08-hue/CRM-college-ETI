const form = document.querySelector("#profile-edit-form");
const saveButton = document.querySelector("#save-profile");
const cancelButton = document.querySelector("#cancel-profile-edit");
const message = document.querySelector("#profile-save-message");
const avatar = document.querySelector(".profile-avatar");
const avatarInput = document.querySelector("#profile-avatar-file");
const avatarInitials = avatar?.textContent?.trim() ?? "";
const avatarStorageKey = "crm.profile.avatar";
const fieldInputs = [...(form?.querySelectorAll("input[name]") ?? [])];
let savedValues = new Map(fieldInputs.map((input) => [input.name, input.value]));
let savedAvatar = window.localStorage.getItem(avatarStorageKey) ?? "";
let selectedAvatar = savedAvatar;

const showMessage = (text, kind) => {
    if (!message) return;
    message.textContent = text;
    message.dataset.kind = kind;
    message.hidden = false;
};

const renderAvatar = (image) => {
    if (!avatar) return;
    if (image) {
        avatar.style.backgroundImage = `url("${image}")`;
        avatar.classList.add("has-image");
        avatar.textContent = "";
    } else {
        avatar.style.backgroundImage = "";
        avatar.classList.remove("has-image");
        avatar.textContent = avatarInitials;
    }
    const headerAvatar = document.querySelector(".avatar-small");
    if (headerAvatar) {
        headerAvatar.style.backgroundImage = image ? `url("${image}")` : "";
        headerAvatar.classList.toggle("has-image", Boolean(image));
        headerAvatar.textContent = image ? "" : avatarInitials;
    }
};

const hasChanges = () =>
    fieldInputs.some((input) => input.value !== savedValues.get(input.name)) ||
    selectedAvatar !== savedAvatar;

const updateSaveState = () => {
    if (saveButton) saveButton.disabled = !hasChanges();
    if (message) message.hidden = true;
};

const validatePhone = (input) => {
    const value = input.value.trim();
    const digits = value.replace(/\D/g, "");
    const valid = /^\+?[\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
    input.setAttribute("aria-invalid", String(!valid));
    const error = form?.querySelector(`[data-error-for="${input.name}"]`);
    if (error) error.textContent = valid ? "" : "Enter a valid phone number.";
    return valid;
};

const validateForm = () => {
    let valid = true;
    const nameInput = form?.querySelector('[name="fullName"]');
    const emailInput = form?.querySelector('[name="email"]');
    if (nameInput instanceof HTMLInputElement) {
        const fieldValid = nameInput.value.trim().length > 0;
        nameInput.setAttribute("aria-invalid", String(!fieldValid));
        const error = form?.querySelector('[data-error-for="fullName"]');
        if (error) error.textContent = fieldValid ? "" : "Name is required.";
        valid &&= fieldValid;
    }
    if (emailInput instanceof HTMLInputElement) {
        const fieldValid = emailInput.validity.valid && emailInput.value.trim().length > 0;
        emailInput.setAttribute("aria-invalid", String(!fieldValid));
        const error = form?.querySelector('[data-error-for="email"]');
        if (error) error.textContent = fieldValid ? "" : "Enter a valid email address.";
        valid &&= fieldValid;
    }
    for (const input of form?.querySelectorAll(
        '[name="phoneNumber"], [name="viber"], [name="whatsapp"]',
    ) ?? []) {
        if (
            input instanceof HTMLInputElement &&
            (input.name === "phoneNumber" || input.value.trim())
        ) {
            valid = validatePhone(input) && valid;
        }
    }
    return valid;
};

const compressAvatar = async (file) => {
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not read this image.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.82);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

renderAvatar(savedAvatar);
fieldInputs.forEach((input) => input.addEventListener("input", updateSaveState));

avatarInput?.addEventListener("change", async () => {
    const file = avatarInput.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        avatarInput.value = "";
        showMessage("Choose a JPG or PNG image up to 5 MB.", "error");
        return;
    }
    try {
        selectedAvatar = await compressAvatar(file);
        renderAvatar(selectedAvatar);
        updateSaveState();
    } catch {
        showMessage("Could not load this image. Please choose another file.", "error");
    }
});

cancelButton?.addEventListener("click", () => {
    fieldInputs.forEach((input) => {
        input.value = savedValues.get(input.name) ?? "";
        input.setAttribute("aria-invalid", "false");
    });
    form?.querySelectorAll("[data-error-for]").forEach((error) => (error.textContent = ""));
    selectedAvatar = savedAvatar;
    if (avatarInput) avatarInput.value = "";
    renderAvatar(savedAvatar);
    if (message) message.hidden = true;
    updateSaveState();
});

form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(form instanceof HTMLFormElement) || !saveButton || !validateForm()) return;
    saveButton.disabled = true;
    showMessage("Saving changes…", "pending");
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        const response = await fetch("/api/profile", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(data),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Could not save your profile.");
        try {
            if (selectedAvatar) window.localStorage.setItem(avatarStorageKey, selectedAvatar);
            else window.localStorage.removeItem(avatarStorageKey);
        } catch {
            throw new Error(
                "Profile details were saved, but this browser could not store the photo.",
            );
        }
        savedAvatar = selectedAvatar;
        savedValues = new Map(fieldInputs.map((input) => [input.name, input.value]));
        const headerName = document.querySelector("[data-current-user-name]");
        if (headerName) headerName.textContent = String(data.fullName);
        const nameHeading = document.querySelector(".profile-workspace .page-heading h1");
        if (nameHeading)
            nameHeading.setAttribute("aria-label", `Profile for ${String(data.fullName)}`);
        showMessage("Profile updated successfully.", "success");
        updateSaveState();
        if (message) message.hidden = false;
    } catch (error) {
        showMessage(
            error instanceof Error ? error.message : "Could not save your profile.",
            "error",
        );
        saveButton.disabled = !hasChanges();
    }
});

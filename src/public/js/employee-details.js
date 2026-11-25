const dialog = document.querySelector("#dismiss");
document.querySelector("#fire")?.addEventListener("click", () => dialog.showModal());
document.querySelector("#cancel")?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
});
dialog?.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = dialog.querySelector("select")?.value;
    try {
        const response = await fetch(
            "/api/employees/" + dialog.querySelector("#confirm").dataset.id,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ replacementManagerId: value === "root" ? null : value }),
            },
        );
        if (response.ok) window.location.assign("/employees");
        else dialog.querySelector("[role=alert]").textContent = (await response.json()).message;
    } catch {
        dialog.querySelector("[role=alert]").textContent = "Could not dismiss employee.";
    }
});

document.querySelectorAll(".sidebar-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
        const submenu = document.getElementById(toggle.getAttribute("aria-controls") || "");
        if (!submenu) return;
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        submenu.hidden = expanded;
    });
});

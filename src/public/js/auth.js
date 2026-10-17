(() => {
    const nativeFetch = window.fetch.bind(window);

    const clearClientState = async () => {
        // The app currently keeps auth/user state in browser storage and Cache Storage.
        window.localStorage.clear();
        window.sessionStorage.clear();
        if ("caches" in window) {
            const cacheNames = await window.caches.keys();
            await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
        }
        window.dispatchEvent(new CustomEvent("crm:logout"));
    };

    window.fetch = async (input, init) => {
        const response = await nativeFetch(input, init);
        const requestUrl = input instanceof Request ? input.url : String(input);
        const pathname = new URL(requestUrl, window.location.href).pathname;

        // Login needs to display the contract's generic credential error inline.
        if (response.status === 401 && pathname !== "/api/auth/login") {
            window.location.assign("/login");
        }

        return response;
    };

    document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest("[data-logout]");
        if (!(button instanceof HTMLButtonElement) || button.disabled) return;

        const status = document.querySelector("[data-logout-status]");
        button.disabled = true;
        if (status) status.textContent = "Signing out...";

        try {
            const response = await nativeFetch("/api/auth/logout", {
                method: "POST",
                headers: { Accept: "application/json" },
                credentials: "include",
                cache: "no-store",
            });
            if (!response.ok && response.status !== 401) {
                throw new Error("Logout failed");
            }

            await clearClientState();
            window.location.replace("/login");
        } catch {
            button.disabled = false;
            if (status) status.textContent = "Unable to sign out. Please try again.";
        }
    });
})();

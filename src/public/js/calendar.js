const root = document.querySelector("[data-calendar]");
if (root) {
    const grid = document.querySelector("#calendar-grid");
    const title = document.querySelector("#period-title");
    const status = document.querySelector("#calendar-status");
    const state = document.querySelector("#calendar-state");
    const dialog = document.querySelector("#event-dialog");
    const detailDialog = document.querySelector("#event-detail-dialog");
    const deleteDialog = document.querySelector("#delete-dialog");
    const form = document.querySelector("#event-form");
    const timeZone = root.dataset.timeZone || "UTC";
    const events = new Map();
    let cursor = new Date(`${root.dataset.month}-01T12:00:00`);
    let view = "month";
    let editing = null;
    let deleting = null;
    const formatDate = (date, options) => new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(date);
    const dateKey = (date) => {
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
        const part = (type) => parts.find((item) => item.type === type)?.value || "";
        return `${part("year")}-${part("month")}-${part("day")}`;
    };
    const dayAt = (date, delta) => { const value = new Date(date); value.setDate(value.getDate() + delta); return value; };
    const mondayOffset = (date) => (date.getDay() + 6) % 7;
    const localInput = (iso, zone = timeZone) => {
        const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
        return parts.replace(" ", "T");
    };
    const inputToIso = (value, zone = timeZone) => {
        const [date, time] = value.split("T");
        const [year, month, day] = date.split("-").map(Number);
        const [hour, minute] = time.split(":").map(Number);
        const local = new Date(Date.UTC(year, month - 1, day, hour, minute));
        const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(local);
        const get = (key) => Number(parts.find((part) => part.type === key)?.value);
        const represented = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
        return new Date(local.getTime() - (represented - local.getTime())).toISOString();
    };
    function add(parent, tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        parent.append(element);
        return element;
    }
    async function request(url, options = {}) {
        const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) }, ...options });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "Could not complete the request.");
        return result;
    }
    function visibleDates() {
        if (view === "day") return [new Date(cursor)];
        if (view === "week") {
            const monday = dayAt(cursor, -mondayOffset(cursor));
            return Array.from({ length: 7 }, (_, index) => dayAt(monday, index));
        }
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
        const start = dayAt(first, -mondayOffset(first));
        return Array.from({ length: 42 }, (_, index) => dayAt(start, index));
    }
    function paint() {
        const days = visibleDates();
        title.textContent = view === "month" ? formatDate(cursor, { month: "long", year: "numeric" }) : view === "week" ? `${formatDate(days[0], { month: "short", day: "numeric" })} – ${formatDate(days[6], { month: "short", day: "numeric", year: "numeric" })}` : formatDate(cursor, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        grid.replaceChildren();
        grid.className = `calendar-grid ${view === "day" ? "calendar-daily" : `calendar-${view}`}`;
        if (view === "month") for (const weekday of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) add(grid, "div", "calendar-weekday", weekday);
        for (const date of days) {
            const cell = add(grid, "section", `calendar-day${dateKey(date) === root.dataset.today ? " is-today" : ""}${date.getMonth() !== cursor.getMonth() && view === "month" ? " is-outside" : ""}`);
            const dayButton = add(cell, "button", "calendar-day-number", String(date.getDate()));
            dayButton.type = "button";
            dayButton.setAttribute("aria-label", `Show ${formatDate(date, { dateStyle: "full" })}`);
            dayButton.addEventListener("click", () => { cursor = new Date(date); view = "day"; paint(); });
            const dayEvents = [...events.values()].filter((event) => dateKey(new Date(event.startsAt)) === dateKey(date) || (dateKey(new Date(event.startsAt)) < dateKey(date) && dateKey(new Date(event.endsAt)) >= dateKey(date))).filter((event) => {
                const type = document.querySelector("#event-type-filter").value;
                const query = document.querySelector("#event-search").value.trim().toLocaleLowerCase();
                return (!type || type === event.type) && (!query || `${event.title} ${event.description || ""}`.toLocaleLowerCase().includes(query));
            });
            const visibleEvents = view === "month" ? dayEvents.slice(0, 2) : dayEvents;
            for (const event of visibleEvents) {
                const item = add(cell, "button", `calendar-event event-${event.type.toLowerCase()}`, `${event.allDay ? "All day · " : `${formatDate(new Date(event.startsAt), { hour: "2-digit", minute: "2-digit" })} · `}${event.title}`);
                item.type = "button";
                item.title = `${event.title}${event.description ? ` — ${event.description}` : ""}`;
                item.addEventListener("click", () => showDetails(event));
            }
            if (dayEvents.length > visibleEvents.length) {
                const more = add(cell, "button", "calendar-more", `+ ${dayEvents.length - visibleEvents.length} more`);
                more.type = "button";
                more.addEventListener("click", () => { cursor = new Date(date); view = "day"; document.querySelector('[data-view="day"]').click(); });
            }
        }
        const matchingCount = [...events.values()].filter((event) => {
            const type = document.querySelector("#event-type-filter").value;
            const query = document.querySelector("#event-search").value.trim().toLocaleLowerCase();
            return (!type || type === event.type) && (!query || `${event.title} ${event.description || ""}`.toLocaleLowerCase().includes(query));
        }).length;
        state.hidden = matchingCount > 0;
        state.innerHTML = '<span class="calendar-state-icon" aria-hidden="true">▦</span><strong>No events for this period</strong><span>Choose “Create event” to add one.</span>';
        status.textContent = `${matchingCount} ${matchingCount === 1 ? "event" : "events"} · ${timeZone}`;
    }
    async function load() {
        status.textContent = "Loading events…";
        state.hidden = false;
        state.innerHTML = '<span class="calendar-skeleton"></span><span class="calendar-skeleton short"></span>';
        try {
            const days = visibleDates();
            const from = inputToIso(`${dateKey(days[0])}T00:00`, timeZone);
            const to = inputToIso(`${dateKey(dayAt(days[days.length - 1], 1))}T00:00`, timeZone);
            const query = new URLSearchParams({ from, to, timeZone });
            const result = await request(`/api/events?${query}`);
            events.clear();
            for (const event of result.events || []) events.set(event.id, event);
            paint();
        } catch (error) { status.textContent = error.message || "Could not load events."; state.hidden = true; }
    }
    function openEvent(event = null, date = cursor) {
        editing = event;
        form.reset();
        form.elements.title.value = event?.title || "";
        form.elements.type.value = event?.type || "MEETING";
        form.elements.description.value = event?.description || "";
        const starts = event ? new Date(event.startsAt) : new Date(date);
        if (!event) starts.setHours(9, 0, 0, 0);
        const ends = event ? new Date(event.endsAt) : new Date(starts.getTime() + 3_600_000);
        const eventZone = event?.timeZone || timeZone;
        if (![...form.elements.timeZone.options].some((option) => option.value === eventZone)) {
            const zoneOption = document.createElement("option");
            zoneOption.value = eventZone;
            zoneOption.textContent = eventZone;
            form.elements.timeZone.append(zoneOption);
        }
        form.elements.startsAt.value = localInput(starts.toISOString(), eventZone);
        form.elements.endsAt.value = localInput(ends.toISOString(), eventZone);
        const selected = new Set((event?.participants || []).map((participant) => participant.employee?.id).filter(Boolean));
        for (const option of form.querySelectorAll("#member-options input[type=checkbox]")) option.checked = selected.has(option.value);
        form.elements.timeZone.value = eventZone;
        document.querySelector("#member-search").value = "";
        document.querySelector("#member-count").textContent = `${selected.size} selected`;
        document.querySelector("#description-count").textContent = String(form.elements.description.value.length);
        document.querySelector("#event-dialog-title").textContent = event ? "Edit event" : "Create event";
        document.querySelector("#save-event").textContent = event ? "Save changes" : "Create event";
        const message = document.querySelector("#event-form-message"); message.textContent = "";
        dialog.showModal();
    }
    function showDetails(event) {
        const content = document.querySelector("#event-detail-content");
        content.replaceChildren();
        const heading = add(content, "div", "dialog-heading");
        const copy = add(heading, "div");
        add(copy, "h2", "", event.title);
        add(copy, "p", "", `${event.type.replaceAll("_", " ")} · ${event.timeZone}`);
        const close = add(heading, "button", "icon-button", "×"); close.type = "button"; close.setAttribute("aria-label", "Close"); close.addEventListener("click", () => detailDialog.close());
        add(content, "p", "event-detail-time", `${formatDate(new Date(event.startsAt), { dateStyle: "medium", timeStyle: "short" })} – ${formatDate(new Date(event.endsAt), { timeStyle: "short" })}`);
        add(content, "p", "event-detail-description", event.description || "No description provided.");
        add(content, "h3", "", `Participants (${event.participants?.length || 0})`);
        const people = add(content, "ul", "event-participant-list");
        for (const participant of event.participants || []) add(people, "li", "", participant.employee?.fullName || "Unnamed employee");
        const actions = add(content, "div", "dialog-actions");
        const canEdit = event.ownerAccountId === root.dataset.accountId;
        if (canEdit) {
            const remove = add(actions, "button", "danger-button", "Delete event"); remove.type = "button"; remove.addEventListener("click", () => { deleting = event; document.querySelector("#delete-confirmation").value = ""; document.querySelector("#delete-message").textContent = ""; detailDialog.close(); deleteDialog.showModal(); });
            const edit = add(actions, "button", "primary-button", "Edit event"); edit.type = "button"; edit.addEventListener("click", () => { detailDialog.close(); openEvent(event); });
        }
        detailDialog.showModal();
    }
    document.querySelector("#create-event").addEventListener("click", () => openEvent());
    document.querySelectorAll("[data-close-event]").forEach((button) => button.addEventListener("click", () => dialog.close()));
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = document.querySelector("#event-form-message");
        const values = new FormData(form);
        const selectedZone = values.get("timeZone");
        const body = { title: values.get("title"), type: values.get("type"), description: values.get("description"), startsAt: inputToIso(values.get("startsAt"), selectedZone), endsAt: inputToIso(values.get("endsAt"), selectedZone), timeZone: selectedZone, participantIds: [...form.querySelectorAll("#member-options input[type=checkbox]:checked")].map((option) => option.value) };
        const button = document.querySelector("#save-event"); button.disabled = true;
        try {
            const result = await request(editing ? `/api/events/${editing.id}` : "/api/events", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) });
            if (result.event) events.set(result.event.id, result.event);
            dialog.close(); await load();
        } catch (error) { message.textContent = error.message || "Could not save event."; }
        finally { button.disabled = false; }
    });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { editing = null; });
    document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
        view = button.dataset.view;
        document.querySelectorAll("[data-view]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        load();
    }));
    document.querySelector("#previous-period").addEventListener("click", () => { if (view === "month") { cursor.setDate(1); cursor.setMonth(cursor.getMonth() - 1); } else cursor = dayAt(cursor, view === "week" ? -7 : -1); load(); });
    document.querySelector("#next-period").addEventListener("click", () => { if (view === "month") { cursor.setDate(1); cursor.setMonth(cursor.getMonth() + 1); } else cursor = dayAt(cursor, view === "week" ? 7 : 1); load(); });
    document.querySelector("#today-button").addEventListener("click", () => { cursor = new Date(`${root.dataset.today}T12:00:00`); load(); });
    document.querySelector("#event-search").addEventListener("input", paint);
    document.querySelector("#event-type-filter").addEventListener("change", paint);
    document.querySelectorAll("[data-close-delete]").forEach((button) => button.addEventListener("click", () => deleteDialog.close()));
    document.querySelector("#delete-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!deleting) return;
        const confirmationTitle = document.querySelector("#delete-confirmation").value;
        const deleteMessage = document.querySelector("#delete-message");
        const button = document.querySelector("#confirm-delete"); button.disabled = true;
        try {
            await request(`/api/events/${deleting.id}`, { method: "DELETE", body: JSON.stringify({ confirmationTitle }) });
            events.delete(deleting.id); deleting = null; deleteDialog.close(); await load();
        } catch (error) { deleteMessage.textContent = error.message || "Could not delete event."; }
        finally { button.disabled = false; }
    });
    document.querySelector("#member-search").addEventListener("input", (event) => {
        const query = event.target.value.trim().toLocaleLowerCase();
        document.querySelectorAll(".member-option").forEach((option) => { option.hidden = !option.dataset.memberName.includes(query); });
    });
    document.querySelector("#member-options").addEventListener("change", () => {
        const count = form.querySelectorAll("#member-options input:checked").length;
        document.querySelector("#member-count").textContent = `${count} selected`;
    });
    form.elements.description.addEventListener("input", (event) => { document.querySelector("#description-count").textContent = String(event.target.value.length); });
    load();
}

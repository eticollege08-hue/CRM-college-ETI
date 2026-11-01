export const EVENT_MESSAGES = {
    CREATED: "Event created successfully.",
    UPDATED: "Event updated successfully.",
    DELETED: "Event deleted successfully.",
    PARTICIPANTS_UPDATED: "Event participants updated successfully.",
    NOT_FOUND: "Event not found.",
    NOT_OWNER: "Only the event owner can modify this event.",
    EMPLOYEE_NOT_FOUND: "One or more participants do not exist.",
    ACCOUNT_UNAVAILABLE: "An active account is required.",
    CONFLICT: "One or more participants already have an event at this time.",
    TRANSACTION_CONFLICT: "The schedule changed concurrently. Please try again.",
    CONFIRMATION_MISMATCH: "Enter the exact event title to confirm deletion.",
    NOT_PARTICIPANT: "Employee is not a participant of this event.",
    DATE_RANGE:
        "Event must start before it ends and stay within one local day; all-day events are not supported.",
};

export const EVENT_TRANSACTION_MAX_ATTEMPTS = 3;
export const EVENT_MAX_RANGE_DAYS = 366;

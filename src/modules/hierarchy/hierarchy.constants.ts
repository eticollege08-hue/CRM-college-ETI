export const HIERARCHY_MESSAGES = {
    CREATED: "Hierarchy relationship created",
    UPDATED: "Hierarchy relationship updated",
    DELETED: "Hierarchy relationship deleted",
    NOT_FOUND: "Hierarchy relationship not found",
    EMPLOYEE_NOT_FOUND: "Manager or subordinate not found",
    ALREADY_EXISTS: "Hierarchy relationship already exists",
    SELF_ASSIGNMENT: "An employee cannot be their own manager",
    CYCLE_DETECTED: "This relationship would create a hierarchy cycle",
    TRANSACTION_CONFLICT: "The hierarchy was changed concurrently. Please try again",
};

export const HIERARCHY_TRANSACTION_MAX_ATTEMPTS = 3;

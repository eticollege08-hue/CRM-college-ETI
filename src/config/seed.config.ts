import { Role } from "@prisma/client";

// Public mock credentials for local role testing, never for production.
export const MOCK_SEED_ACCOUNTS = [
    {
        name: "Example Owner",
        email: "example1@example.com",
        password: "somepassWord1",
        roleKey: Role.OWNER,
    },
    {
        name: "Example Manager",
        email: "example2@example.com",
        password: "somepassWord2",
        roleKey: Role.MANAGER,
    },
    {
        name: "Example Recruiter",
        email: "example3@example.com",
        password: "somepassWord3",
        roleKey: Role.RECRUITER,
    },
    {
        name: "Example HR",
        email: "example4@example.com",
        password: "somepassWord4",
        roleKey: Role.HR,
    },
    {
        name: "Example Worker",
        email: "example5@example.com",
        password: "somepassWord5",
        roleKey: Role.WORKER,
    },
];

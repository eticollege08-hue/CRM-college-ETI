import { Role } from "@prisma/client";

// Same name as the company the multi-tenancy migration creates for pre-existing rows.
export const MOCK_SEED_COMPANY_NAME = "Default company";
// A second tenant so local checks can confirm that companies never see each other's data.
export const MOCK_SEED_SECOND_COMPANY_NAME = "Second company";

// Public mock credentials for local role testing, never for production.
export const MOCK_SEED_ACCOUNTS = [
    {
        name: "Example Owner",
        email: "example1@example.com",
        password: "somepassWord1",
        roleKey: Role.OWNER,
        companyName: MOCK_SEED_COMPANY_NAME,
    },
    {
        name: "Example Manager",
        email: "example2@example.com",
        password: "somepassWord2",
        roleKey: Role.MANAGER,
        companyName: MOCK_SEED_COMPANY_NAME,
    },
    {
        name: "Example Recruiter",
        email: "example3@example.com",
        password: "somepassWord3",
        roleKey: Role.RECRUITER,
        companyName: MOCK_SEED_COMPANY_NAME,
    },
    {
        name: "Example HR",
        email: "example4@example.com",
        password: "somepassWord4",
        roleKey: Role.HR,
        companyName: MOCK_SEED_COMPANY_NAME,
    },
    {
        name: "Example Worker",
        email: "example5@example.com",
        password: "somepassWord5",
        roleKey: Role.WORKER,
        companyName: MOCK_SEED_COMPANY_NAME,
    },
    {
        name: "Second Owner",
        email: "example6@example.com",
        password: "somepassWord6",
        roleKey: Role.OWNER,
        companyName: MOCK_SEED_SECOND_COMPANY_NAME,
    },
    {
        name: "Second Manager",
        email: "example7@example.com",
        password: "somepassWord7",
        roleKey: Role.MANAGER,
        companyName: MOCK_SEED_SECOND_COMPANY_NAME,
    },
    {
        name: "Second Recruiter",
        email: "example8@example.com",
        password: "somepassWord8",
        roleKey: Role.RECRUITER,
        companyName: MOCK_SEED_SECOND_COMPANY_NAME,
    },
    {
        name: "Second HR",
        email: "example9@example.com",
        password: "somepassWord9",
        roleKey: Role.HR,
        companyName: MOCK_SEED_SECOND_COMPANY_NAME,
    },
    {
        name: "Second Worker",
        email: "example10@example.com",
        password: "somepassWord10",
        roleKey: Role.WORKER,
        companyName: MOCK_SEED_SECOND_COMPANY_NAME,
    },
];

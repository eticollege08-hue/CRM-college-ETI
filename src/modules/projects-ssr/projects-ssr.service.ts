import { projectsService } from "#modules/projects/projects.service.js";
import { employeeService } from "#modules/employees/employee.service.js";

export const projectsPageService = {
    async getPageData() {
        const records = await projectsService.getAll();
        const projects = records.map((project) => ({
            ...project,
            deadlineLabel: project.deadline
                ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
                      project.deadline,
                  )
                : null,
        }));
        return { projects };
    },
    async getProject(id: string) {
        const project = await projectsService.getById(id);
        const deadlineLabel = project.deadline
            ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
                  project.deadline,
              )
            : null;
        const budgetLabel = project.budget
            ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 2,
              }).format(project.budget.toNumber())
            : null;
        return { project, deadlineLabel, budgetLabel };
    },
    async getCreatePageData() {
        const employees = await employeeService.getAll();
        return { employees };
    },
};

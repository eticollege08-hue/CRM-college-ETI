ALTER TABLE employees ADD COLUMN deleted_at TIMESTAMPTZ(3), ADD COLUMN experience DOUBLE PRECISION, ADD COLUMN certifications TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE employee_compensations ALTER COLUMN salary DROP NOT NULL;
CREATE UNIQUE INDEX "projects_id_company_id_key" ON projects(id, company_id);
CREATE TABLE employee_projects (
 employee_id TEXT NOT NULL, project_id TEXT NOT NULL, company_id TEXT NOT NULL,
 PRIMARY KEY(employee_id, project_id),
 FOREIGN KEY(employee_id, company_id) REFERENCES employees(id, company_id) ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY(project_id, company_id) REFERENCES projects(id, company_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE employee_photos (
 employee_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, mime_type TEXT NOT NULL, bytes BYTEA NOT NULL,
 UNIQUE(employee_id, company_id),
 FOREIGN KEY(employee_id, company_id) REFERENCES employees(id, company_id) ON DELETE CASCADE ON UPDATE CASCADE
);

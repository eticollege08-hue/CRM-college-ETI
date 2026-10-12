const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const body = (n: string) => ({ required: true, content: { 'application/json': { schema: ref(n) } } });
const ok = (description: string, schema?: object) => ({
  description,
  ...(schema && { content: { 'application/json': { schema } } }),
});
const errs = {
  '404': { description: 'Not found', content: { 'application/json': { schema: ref('Error') } } },
  '409': { description: 'Conflict (UNIQUE / FK in use)', content: { 'application/json': { schema: ref('Error') } } },
  '422': { description: 'Validation / FK violation', content: { 'application/json': { schema: ref('Error') } } },
};
const id = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const page = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
  { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
];
const list = (n: string) => ({ type: 'object', properties: { data: { type: 'array', items: ref(n) } } });
const nested = (tag: string, summary: string, schema: object) => ({
  get: { tags: [tag], summary, parameters: [id], responses: { '200': ok('OK', schema), '404': errs['404'] } },
});

const uuidN = { type: 'string', format: 'uuid', nullable: true };
const str = (max: number, nullable = false) => ({ type: 'string', maxLength: max, nullable });
const date = { type: 'string', format: 'date', nullable: true };

const employeeProps = {
  full_name: str(255), image_id: uuidN, level: str(50, true), position: str(150, true),
  contacts: { type: 'object', additionalProperties: true },
  experience_start_date: date,
  status: { type: 'string', enum: ['hired', 'active', 'on_leave', 'fired'] },
  hired_at: date, manager_id: uuidN,
  leave_balance_days: { type: 'number', minimum: 0, maximum: 9999.9 },
};
const accountProps = {
  email: { type: 'string', format: 'email' },
  role_key: { type: 'string', pattern: '^[a-z][a-z0-9_.-]{1,63}$' },
  is_active: { type: 'boolean' },
};

export const openapi = {
  openapi: '3.0.3',
  info: { title: 'CRM HR API', version: '0.1.0', description: 'Open on non-production only until CRM-102.3 (RBAC guards).' },
  servers: [{ url: '/api' }],
  paths: {
    '/employees': {
      get: { tags: ['Employee'], summary: 'List employees', responses: { '200': ok('OK', list('Employee')) },
        parameters: [...page,
          { name: 'status', in: 'query', schema: employeeProps.status },
          { name: 'manager_id', in: 'query', schema: { type: 'string', format: 'uuid' } }] },
      post: { tags: ['Employee'], summary: 'Create employee (no account required)', requestBody: body('EmployeeCreate'),
        responses: { '201': ok('Created', ref('Employee')), '422': errs['422'] } },
    },
    '/employees/{id}': {
      get: { tags: ['Employee'], summary: 'Get employee', parameters: [id], responses: { '200': ok('OK', ref('Employee')), '404': errs['404'] } },
      patch: { tags: ['Employee'], summary: 'Update employee', parameters: [id], requestBody: body('EmployeeUpdate'),
        responses: { '200': ok('OK', ref('Employee')), '404': errs['404'], '422': errs['422'] } },
      delete: { tags: ['Employee'], summary: 'Delete employee (409 if account exists)', parameters: [id],
        responses: { '204': { description: 'Deleted' }, '404': errs['404'], '409': errs['409'] } },
    },
    '/employees/{id}/subordinates': nested('Employee', "Manager's subordinates (uses employees_manager_id_idx)", list('Employee')),
    '/employees/{id}/compensation': nested('Card', 'Compensation (salary, currency)', ref('Compensation')),
    '/employees/{id}/experience': nested('Card', 'Experience entries', list('Experience')),
    '/employees/{id}/tickets': nested('Card', 'Tickets', list('Ticket')),
    '/user-accounts': {
      get: { tags: ['UserAccount'], summary: 'List accounts', parameters: page, responses: { '200': ok('OK', list('UserAccount')) } },
      post: { tags: ['UserAccount'], summary: 'Create account for an existing employee', requestBody: body('UserAccountCreate'),
        responses: { '201': ok('Created', ref('UserAccount')), '409': errs['409'], '422': errs['422'] } },
    },
    '/user-accounts/{id}': {
      get: { tags: ['UserAccount'], summary: 'Get account', parameters: [id], responses: { '200': ok('OK', ref('UserAccount')), '404': errs['404'] } },
      patch: { tags: ['UserAccount'], summary: 'Update account', parameters: [id], requestBody: body('UserAccountUpdate'),
        responses: { '200': ok('OK', ref('UserAccount')), '404': errs['404'], '409': errs['409'], '422': errs['422'] } },
      delete: { tags: ['UserAccount'], summary: 'Delete account', parameters: [id], responses: { '204': { description: 'Deleted' }, '404': errs['404'] } },
    },
  },
  components: {
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } },
      Employee: { type: 'object', description: 'No salary/bonus fields (see Compensation)',
        properties: { id: { type: 'string', format: 'uuid' }, ...employeeProps,
          created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } } },
      EmployeeCreate: { type: 'object', required: ['full_name'], properties: employeeProps },
      EmployeeUpdate: { type: 'object', properties: employeeProps },
      UserAccount: { type: 'object', description: 'password_hash is never returned',
        properties: { id: { type: 'string', format: 'uuid' }, employee_id: { type: 'string', format: 'uuid' }, ...accountProps,
          last_login_at: { type: 'string', format: 'date-time', nullable: true } } },
      UserAccountCreate: { type: 'object', required: ['employee_id', 'email', 'password', 'role_key'],
        properties: { employee_id: { type: 'string', format: 'uuid' }, ...accountProps, password: { type: 'string', minLength: 8, maxLength: 128 } } },
      UserAccountUpdate: { type: 'object', properties: { ...accountProps, password: { type: 'string', minLength: 8, maxLength: 128 } } },
      Compensation: { type: 'object', properties: { id: { type: 'string' }, employee_id: { type: 'string' }, salary: { type: 'string', example: '45000.00' }, currency: { type: 'string', example: 'UAH' } } },
      Experience: { type: 'object', properties: { id: { type: 'string' }, employee_id: { type: 'string' }, company: { type: 'string' }, title: { type: 'string' }, start_date: { type: 'string', format: 'date' }, end_date: date, description: { type: 'string', nullable: true } } },
      Ticket: { type: 'object', properties: { id: { type: 'string' }, employee_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string', nullable: true }, status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] } } },
    },
  },
} as const;
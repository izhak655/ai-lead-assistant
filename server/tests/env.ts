const url = process.env.DATABASE_URL ?? '';
if (!url.includes('lead_assistant_test')) {
  throw new Error(
    `Refusing to run tests against a non-test database (${url || 'unset'}). Use a database whose name contains lead_assistant_test.`,
  );
}

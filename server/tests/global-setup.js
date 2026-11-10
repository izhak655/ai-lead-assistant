const { execSync } = require('child_process');

module.exports = async function globalSetup() {
  const url = process.env.DATABASE_URL || '';
  if (!url.includes('lead_assistant_test')) {
    throw new Error(`Refusing to migrate a non-test database (${url || 'unset'}).`);
  }
  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/..`,
    stdio: 'inherit',
    env: process.env,
  });
};

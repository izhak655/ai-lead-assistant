process.env.AI_MODE ||= 'mock';
process.env.QUEUE_DRIVER ||= 'inline';
process.env.DATABASE_URL ||= 'mysql://lead:lead@127.0.0.1:3306/lead_assistant_test';
process.env.WEB_ORIGIN ||= 'http://localhost:3000';
process.env.APP_TIMEZONE ||= 'Asia/Jerusalem';
process.env.FOLLOW_UP_DELAY_MS ||= '86400000';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/qualification.test.ts',
    '<rootDir>/tests/slots.test.ts',
    '<rootDir>/tests/extract.test.ts',
    '<rootDir>/tests/phone.test.ts',
    '<rootDir>/tests/planner.test.ts',
    '<rootDir>/tests/prompt.test.ts',
    '<rootDir>/tests/seed-data.test.ts',
  ],
};

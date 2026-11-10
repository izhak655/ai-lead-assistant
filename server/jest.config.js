process.env.DATABASE_URL ||= 'mysql://lead:lead@127.0.0.1:3306/lead_assistant_test';
process.env.REDIS_URL ||= 'redis://127.0.0.1:6379';
process.env.AI_MODE ||= 'mock';
process.env.QUEUE_DRIVER ||= 'inline';
process.env.WEB_ORIGIN ||= 'http://localhost:3000';
process.env.FOLLOW_UP_DELAY_MS ||= '86400000';
process.env.APP_TIMEZONE ||= 'Asia/Jerusalem';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/env.ts'],
  globalSetup: '<rootDir>/tests/global-setup.js',
  testTimeout: 20000,
  maxWorkers: 1,
  clearMocks: true,
};

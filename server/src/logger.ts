function write(level: 'info' | 'error', message: string, fields?: Record<string, unknown>): void {
  const line = JSON.stringify({ level, message, ...fields, time: new Date().toISOString() });
  if (level === 'error') console.error(line);
  else console.log(line);
}

export const log = {
  info(message: string, fields?: Record<string, unknown>): void {
    write('info', message, fields);
  },
  error(message: string, fields?: Record<string, unknown>): void {
    write('error', message, fields);
  },
};

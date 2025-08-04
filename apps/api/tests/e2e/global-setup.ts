import { killPort, waitForPortOpen } from '@nx/node/utils';

export default async function setup() {
  // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await waitForPortOpen(port, { host });

  // Return teardown function for Vitest
  return async () => {
    // Put clean up logic here (e.g. stopping services, docker-compose, etc.).
    console.log('\nTearing down...\n');
    await killPort(port);
  };
}

/**
 * Graceful shutdown handler
 */

type CleanupFn = () => Promise<void> | void;

const cleanupHandlers: CleanupFn[] = [];
let isShuttingDown = false;

export function onExit(handler: CleanupFn): void {
  cleanupHandlers.push(handler);
}

export async function shutdown(code: number = 0): Promise<never> {
  if (isShuttingDown) return process.exit(code);
  isShuttingDown = true;

  for (const handler of cleanupHandlers) {
    try {
      await handler();
    } catch {}
  }

  process.exit(code);
}

// Register signal handlers
function setupSignalHandlers(): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  
  for (const signal of signals) {
    process.on(signal, () => {
      shutdown(0);
    });
  }

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error.message);
    shutdown(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    shutdown(1);
  });
}

setupSignalHandlers();

// Register default cleanup: close database
onExit(async () => {
  try {
    const { closeDb } = await import('../storage/database');
    closeDb();
  } catch {}
});

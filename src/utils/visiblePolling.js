// Background tabs must not repeatedly reload whole business collections.
export function startVisiblePolling(task, intervalMs, environment = {}) {
  const page = environment.document || globalThis.document;
  const schedule = environment.setTimeout || globalThis.setTimeout;
  const cancel = environment.clearTimeout || globalThis.clearTimeout;
  const onError = environment.onError || console.error;
  let stopped = false;
  let running = false;
  let timer;
  const run = async () => {
    if (stopped || running || page?.hidden) return;
    cancel(timer);
    running = true;
    try { await task(); } catch (error) { onError(error); }
    finally {
      running = false;
      if (!stopped && !page?.hidden) timer = schedule(run, intervalMs);
    }
  };
  const visibilityChanged = () => {
    cancel(timer);
    if (!page.hidden) void run();
  };
  page?.addEventListener('visibilitychange', visibilityChanged);
  void run();
  return () => {
    stopped = true;
    cancel(timer);
    page?.removeEventListener('visibilitychange', visibilityChanged);
  };
}

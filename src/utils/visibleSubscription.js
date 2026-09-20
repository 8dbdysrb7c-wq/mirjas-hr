// Release database listeners in hidden tabs; reject callbacks from old listeners.
export const subscribeWhileVisible = (page, subscribe, next, error) => {
  let unsubscribe;
  let generation = 0;
  let disposed = false;
  const stop = () => {
    generation++;
    unsubscribe?.();
    unsubscribe = undefined;
  };
  const update = () => {
    if (disposed) return;
    if (page.visibilityState !== 'visible') { stop(); return; }
    if (unsubscribe) return;
    const current = ++generation;
    unsubscribe = subscribe(
      value => { if (!disposed && current === generation) next(value); },
      failure => { if (!disposed && current === generation) error(failure); }
    );
  };
  page.addEventListener('visibilitychange', update);
  update();
  return () => {
    disposed = true;
    page.removeEventListener('visibilitychange', update);
    stop();
  };
};

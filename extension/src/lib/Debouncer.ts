export class Debouncer {
  private timer: ReturnType<typeof setTimeout> | undefined;

  private delay: number;

  private onStop: () => void;
  private onDebounced: () => void;

  constructor(delay: number, onDebounced: () => void, onStop: () => void) {
    this.onDebounced = onDebounced;
    this.onStop = onStop;
    this.delay = delay;
  }

  public start(): void {
    this.clear();
    this.timer = setTimeout(() => {
      this.onDebounced();
    }, this.delay);
  }

  public stop(): void {
    this.clear();
    this.onStop();
  }

  private clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
}

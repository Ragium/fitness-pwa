import { NgZone } from '@angular/core';
import { OnlineStatusService } from './online-status.service';

describe('OnlineStatusService', () => {
  let originalDescriptor: PropertyDescriptor | undefined;
  let onlineValue = true;

  beforeEach(() => {
    originalDescriptor =
      Object.getOwnPropertyDescriptor(navigator, 'onLine') ??
      Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine') ??
      undefined;
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => onlineValue,
    });
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalDescriptor);
    }
  });

  it('tracks online and offline events via snapshot and stream', () => {
    onlineValue = true;
    const zone = new NgZone({ enableLongStackTrace: false });
    const service = new OnlineStatusService(zone);

    let latest = service.snapshot();
    service.status$.subscribe((value) => (latest = value));

    expect(latest).toBe(true);

    onlineValue = false;
    window.dispatchEvent(new Event('offline'));
    expect(latest).toBe(false);

    onlineValue = true;
    window.dispatchEvent(new Event('online'));
    expect(latest).toBe(true);
  });
});

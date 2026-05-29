import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  it('emits toast messages with the expected level and text', () => {
    const service = new NotificationService();
    const messages: Array<{ level: string; text: string; createdAt: number }> = [];

    spyOn(Date, 'now').and.returnValue(123456);
    service.toasts$.subscribe((message) => messages.push(message));

    service.success('OK');
    service.error('Nope');
    service.info('Heads up');

    expect(messages.length).toBe(3);
    expect(messages[0]).toEqual(jasmine.objectContaining({ level: 'success', text: 'OK', createdAt: 123456 }));
    expect(messages[1]).toEqual(jasmine.objectContaining({ level: 'error', text: 'Nope', createdAt: 123456 }));
    expect(messages[2]).toEqual(jasmine.objectContaining({ level: 'info', text: 'Heads up', createdAt: 123456 }));
  });
});

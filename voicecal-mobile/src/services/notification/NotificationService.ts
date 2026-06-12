import dayjs from 'dayjs';
import { CalendarEvent, Reminder } from '../../models';
import { calendarService } from '../calendar';

// Lazy-load expo-notifications to avoid crashes in environments where native modules are unavailable
let NotificationsModule: typeof import('expo-notifications') | null = null;
let notificationsLoadFailed = false;
let handlerConfigured = false;

async function getNotifications(): Promise<typeof import('expo-notifications')> {
  if (notificationsLoadFailed) {
    throw new Error('通知功能需要 Development Build，Expo Go 不完全支持此功能。');
  }
  if (!NotificationsModule) {
    try {
      NotificationsModule = await import('expo-notifications');
      // Configure how notifications appear when the app is in the foreground (once)
      if (!handlerConfigured) {
        NotificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        handlerConfigured = true;
      }
    } catch {
      notificationsLoadFailed = true;
      throw new Error('通知功能需要 Development Build，Expo Go 不完全支持此功能。');
    }
  }
  return NotificationsModule;
}

class NotificationService {
  /**
   * Request notification permissions from the user.
   * Returns true if permission is granted.
   */
  async requestPermissions(): Promise<boolean> {
    const Notifications = await getNotifications();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Schedule a local notification for an event reminder.
   */
  async scheduleEventReminder(
    event: CalendarEvent,
    minutesBefore: number
  ): Promise<string> {
    const Notifications = await getNotifications();
    const triggerDate = dayjs(event.startTime).subtract(minutesBefore, 'minute');

    if (triggerDate.isBefore(dayjs())) {
      throw new Error('Cannot schedule a reminder in the past');
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '日程提醒',
        body: `「${event.title}」将在 ${minutesBefore} 分钟后开始`,
        data: { eventId: event.id, type: 'event_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate.toDate(),
      },
    });

    return id;
  }

  /**
   * Schedule a notification for a specific reminder object.
   */
  async scheduleReminder(
    reminder: Reminder,
    event: CalendarEvent
  ): Promise<string> {
    const Notifications = await getNotifications();
    const triggerDate = dayjs(reminder.remindAt);

    if (triggerDate.isBefore(dayjs())) {
      throw new Error('Cannot schedule a reminder in the past');
    }

    const minutesBefore = Math.max(
      0,
      Math.round(dayjs(event.startTime).diff(triggerDate, 'minute'))
    );

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '日程提醒',
        body:
          minutesBefore > 0
            ? `「${event.title}」将在 ${minutesBefore} 分钟后开始`
            : `「${event.title}」现在开始`,
        data: {
          eventId: event.id,
          reminderId: reminder.id,
          type: 'reminder',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate.toDate(),
      },
    });

    return id;
  }

  /**
   * Cancel a single scheduled notification.
   */
  async cancelNotification(notificationId: string): Promise<void> {
    const Notifications = await getNotifications();
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAllNotifications(): Promise<void> {
    const Notifications = await getNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Check for due reminders, send notifications, and mark them as SENT.
   */
  async processPendingReminders(): Promise<void> {
    const Notifications = await getNotifications();
    const dueReminders = await calendarService.processPendingReminders();

    for (const reminder of dueReminders) {
      try {
        const event = await calendarService.getEvent(reminder.eventId);
        if (!event) {
          console.warn(
            `NotificationService: event ${reminder.eventId} not found for reminder ${reminder.id}`
          );
          continue;
        }

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '日程提醒',
            body: `「${event.title}」即将开始`,
            data: {
              eventId: event.id,
              reminderId: reminder.id,
              type: 'due_reminder',
            },
          },
          trigger: null,
        });
      } catch (error: any) {
        console.error(
          `NotificationService: failed to send notification for reminder ${reminder.id}:`,
          error?.message ?? error
        );
      }
    }
  }
}

export const notificationService = new NotificationService();

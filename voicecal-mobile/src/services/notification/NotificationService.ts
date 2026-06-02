import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { CalendarEvent, Reminder } from '../../models';
import { calendarService } from '../calendar';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  /**
   * Request notification permissions from the user.
   * Returns true if permission is granted.
   */
  async requestPermissions(): Promise<boolean> {
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
   * @param event The calendar event to remind about
   * @param minutesBefore How many minutes before the event to trigger the reminder
   * @returns The notification identifier
   */
  async scheduleEventReminder(
    event: CalendarEvent,
    minutesBefore: number
  ): Promise<string> {
    const triggerDate = dayjs(event.startTime).subtract(minutesBefore, 'minute');

    // Don't schedule if the trigger time is in the past
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
   * @param reminder The reminder record
   * @param event The associated calendar event
   * @returns The notification identifier
   */
  async scheduleReminder(
    reminder: Reminder,
    event: CalendarEvent
  ): Promise<string> {
    const triggerDate = dayjs(reminder.remindAt);

    // Don't schedule if the trigger time is in the past
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
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Check for due reminders via calendarService, send notifications for each,
   * and mark them as SENT.
   */
  async processPendingReminders(): Promise<void> {
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
          trigger: null, // Fire immediately
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

import { useEffect } from "react";
import { scheduleFeedingReminder } from "../services/notificationService";

export function useReminders(events, activeBaby) {
  useEffect(() => {
    if (!activeBaby || !events) return;

    const reminderHours = activeBaby.settings?.feedingReminderHours ?? 3;
    const babyName = activeBaby.name ?? "your baby";

    const lastFeeding = events.find((e) => e.type === "feeding");

    if (!lastFeeding) {
      // No feeding logged yet — schedule a reminder in reminderHours
      scheduleFeedingReminder(reminderHours, babyName);
      return;
    }

    const hoursSince =
      (Date.now() - (lastFeeding.time instanceof Date ? lastFeeding.time.getTime() : Date.now())) /
      3_600_000;

    const hoursUntil = reminderHours - hoursSince;

    if (hoursUntil <= 0) {
      // Overdue — remind in 15 minutes
      scheduleFeedingReminder(15 / 60, babyName);
    } else {
      scheduleFeedingReminder(hoursUntil, babyName);
    }
  }, [events, activeBaby]);
}

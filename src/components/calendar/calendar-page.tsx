"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
  parseISO,
  addDays,
} from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "followup" | "meeting" | "task" | "payment";
  status: string;
  time?: string;
  leadName?: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const EVENT_STYLES = {
  followup: {
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-l-blue-500",
  },
  meeting: {
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-l-purple-500",
  },
  task: {
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-l-orange-500",
  },
  payment: {
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950",
    borderColor: "border-l-emerald-500",
  },
} as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      setLoading(true);
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      try {
        const [followUpsRes, meetingsRes, tasksRes] = await Promise.all([
          fetch(`/api/follow-ups?tab=all&limit=500`),
          fetch(`/api/meetings?tab=all&limit=500`),
          fetch(`/api/tasks?limit=500`),
        ]);

        const allEvents: CalendarEvent[] = [];

        if (followUpsRes.ok) {
          const data = await followUpsRes.json();
          for (const fu of data.followUps ?? []) {
            const eventDate = parseISO(fu.date);
            if (isSameMonth(eventDate, currentMonth)) {
              allEvents.push({
                id: `fu-${fu.id}`,
                title: fu.purpose || "Follow-up",
                date: fu.date,
                type: "followup",
                status: fu.status,
                time: fu.time,
                leadName: fu.lead?.businessName || fu.client?.businessName,
                ...EVENT_STYLES.followup,
              });
            }
          }
        }

        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          for (const m of data.meetings ?? []) {
            const eventDate = parseISO(m.date);
            if (isSameMonth(eventDate, currentMonth)) {
              allEvents.push({
                id: `mt-${m.id}`,
                title: m.purpose || "Meeting",
                date: m.date,
                type: "meeting",
                status: m.status,
                time: m.time,
                leadName: m.lead?.businessName || m.client?.businessName,
                ...EVENT_STYLES.meeting,
              });
            }
          }
        }

        if (tasksRes.ok) {
          const data = await tasksRes.json();
          for (const t of data.tasks ?? []) {
            if (t.dueDate) {
              const eventDate = parseISO(t.dueDate);
              if (isSameMonth(eventDate, currentMonth)) {
                allEvents.push({
                  id: `tk-${t.id}`,
                  title: t.title,
                  date: t.dueDate,
                  type: "task",
                  status: t.status,
                  time: t.dueTime ?? undefined,
                  leadName: t.lead?.businessName || t.client?.businessName,
                  ...EVENT_STYLES.task,
                });
              }
            }
          }
        }

        if (!cancelled) setEvents(allEvents);
      } catch {
        if (!cancelled) toast.error("Failed to load calendar events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadEvents();
    return () => { cancelled = true; };
  }, [currentMonth]);

  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getEventsForDay = (day: Date) => {
    return events.filter((e) => isSameDay(parseISO(e.date), day));
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const navigateEvent = (event: CalendarEvent) => {
    const rawId = event.id.replace(/^(fu-|mt-|tk-)/, "");
    switch (event.type) {
      case "followup":
        router.push("/follow-ups");
        break;
      case "meeting":
        router.push("/meetings");
        break;
      case "task":
        router.push("/tasks");
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {events.length} events this month
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
          Today
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="min-w-[180px] text-center text-lg font-semibold text-slate-900 dark:text-white">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-rose-700" />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 last:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const today = isToday(day);

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "min-h-[80px] cursor-pointer border-b border-r border-slate-200 p-1 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 last:border-r-0",
                        !isCurrentMonth && "bg-slate-50/50 dark:bg-slate-900/50",
                        isSelected && "bg-rose-50 dark:bg-rose-950/30",
                        today && "bg-rose-50/80 dark:bg-rose-950/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                            !isCurrentMonth && "text-slate-300 dark:text-slate-600",
                            isCurrentMonth && "text-slate-700 dark:text-slate-300",
                            today && "bg-rose-600 text-white"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateEvent(event);
                            }}
                            className={cn(
                              "cursor-pointer truncate rounded-sm border-l-2 px-1 py-0.5 text-[10px] font-medium leading-tight",
                              event.bgColor,
                              event.color,
                              event.borderColor
                            )}
                            title={`${event.title} (${event.time || ""})`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-slate-400 pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-72 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              {selectedDay ? format(selectedDay, "EEEE, MMM d") : "Select a day"}
            </h3>
            <div className="flex flex-wrap gap-2 mb-3 text-[10px]">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Follow-ups
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Meetings
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> Tasks
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Payments
              </span>
            </div>
            {selectedDay ? (
              selectedDayEvents.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No events on this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => navigateEvent(event)}
                      className={cn(
                        "w-full rounded-lg border-l-4 p-2 text-left transition-colors hover:opacity-80",
                        event.bgColor,
                        event.borderColor
                      )}
                    >
                      <div className={cn("text-xs font-medium", event.color)}>
                        {event.title}
                      </div>
                      {event.time && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {event.time}
                        </div>
                      )}
                      {event.leadName && (
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {event.leadName}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                Click on a day to see details
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

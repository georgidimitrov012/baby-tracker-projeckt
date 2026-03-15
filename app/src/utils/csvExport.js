import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
}

function formatTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function escapeCsv(val) {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function eventsToCsv(events, nameMap = {}) {
  const headers = [
    "Date", "Time", "Type", "Feeding Type", "Sleep Type",
    "Amount (ml)", "Duration (min)", "Notes", "Logged By",
  ];
  const rows = events.map((e) => [
    formatDate(e.time),
    formatTime(e.time),
    e.type,
    e.feedingType ?? "",
    e.sleepType ?? "",
    e.amount != null ? e.amount : "",
    e.duration != null ? e.duration : "",
    e.notes ?? "",
    nameMap[e.loggedBy] ?? e.loggedBy ?? "",
  ]);
  return [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
}

export async function exportEventsToCsvFile(events, babyName, nameMap = {}) {
  if (Platform.OS === "web") {
    throw new Error("CSV export is not supported on web.");
  }

  const csv = eventsToCsv(events, nameMap);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const safeName = (babyName ?? "baby").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${safeName}_events_${dateStr}.csv`;
  const path = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(path, {
    mimeType: "text/csv",
    dialogTitle: `Export events for ${babyName}`,
    UTI: "public.comma-separated-values-text",
  });
}

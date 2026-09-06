import React from "react";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SettingsClient } from "./SettingsClient";

import { serializeShopSettings } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let serializedSettings: any = null;
  let users: any[] = [];
  let auditLogs: any[] = [];

  try {
    const [settings, userList, logs] = await Promise.all([
      prisma.shopSettings.findFirst(),
      prisma.user.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { timestamp: "desc" },
        include: { user: true },
      }),
    ]);

    serializedSettings = serializeShopSettings(settings);
    users = userList.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt ? u.createdAt.toISOString() : null,
      updatedAt: u.updatedAt ? u.updatedAt.toISOString() : null,
    }));
    auditLogs = logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      oldValues: l.oldValues,
      newValues: l.newValues,
      ipAddress: l.ipAddress,
      timestamp: l.timestamp ? l.timestamp.toISOString() : null,
      user: l.user
        ? {
            id: l.user.id,
            username: l.user.username,
            fullName: l.user.fullName,
            role: l.user.role,
          }
        : null,
    }));
  } catch (error) {
    console.warn("⚠️ Database not connected during settings build, using fallback data.");
  }

  return (
    <DashboardShell title="Shop Settings & Customization">
      <SettingsClient
        initialSettings={serializedSettings}
        users={users}
        auditLogs={auditLogs}
      />
    </DashboardShell>
  );
}

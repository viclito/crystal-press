import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getWhatsAppStudioData } from "@/actions/whatsapp";
import { WhatsAppHubClient } from "./WhatsAppHubClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WhatsApp Notification Hub | Crystal Press",
  description: "Customizable WhatsApp notification templates and 1-click customer batch messaging engine",
};

export default async function WhatsAppHubPage() {
  const { templates, shopSettings } = await getWhatsAppStudioData();

  return (
    <DashboardShell>
      <WhatsAppHubClient
        initialTemplates={templates}
        shopSettings={shopSettings}
      />
    </DashboardShell>
  );
}

import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getDeliveryChallans } from "@/actions/challans";
import { ChallansClient } from "./ChallansClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delivery Challans & Gate Passes | Crystal Press",
  description: "Official goods dispatch notes, vehicle tracking & consignee proof of delivery",
};

export default async function ChallansPage() {
  const res = await getDeliveryChallans();

  const initialData = {
    challans: res.success && res.challans ? res.challans : [],
    metrics: res.success && res.metrics ? res.metrics : {
      total: 0,
      inTransit: 0,
      delivered: 0,
      prepared: 0,
      thisMonth: 0,
    },
  };

  return (
    <DashboardShell>
      <ChallansClient initialData={initialData} />
    </DashboardShell>
  );
}

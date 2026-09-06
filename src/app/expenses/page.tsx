import React from "react";
import { Metadata } from "next";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getExpenses, getExpenseCategories } from "@/actions/expenses";
import { ExpensesClient } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expenses & Petty Cash | Crystal Press",
  description: "Track store overheads, staff daily refreshments, delivery charges and cash drawer outlays",
};

export default async function ExpensesPage() {
  const [expensesRes, categoriesRes] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
  ]);

  const initialExpenses = expensesRes.success && expensesRes.data ? expensesRes.data.expenses : [];
  const initialSummary =
    expensesRes.success && expensesRes.data
      ? expensesRes.data.summary
      : {
          totalExpenseAmount: 0,
          cashExpenseAmount: 0,
          upiExpenseAmount: 0,
          cardExpenseAmount: 0,
          totalCount: 0,
          categoryBreakdown: [],
        };
  const initialCategories = categoriesRes.success && categoriesRes.categories ? categoriesRes.categories : [];

  return (
    <DashboardShell title="Expense & Petty Cash Tracker">
      <ExpensesClient
        initialExpenses={initialExpenses}
        initialSummary={initialSummary}
        initialCategories={initialCategories}
      />
    </DashboardShell>
  );
}

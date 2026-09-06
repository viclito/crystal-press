"use client";

import { create } from "zustand";

export type SnackbarType = "success" | "error" | "info" | "warning";

export interface SnackbarItem {
  id: string;
  type: SnackbarType;
  title?: string;
  message: string;
  duration?: number;
}

interface SnackbarState {
  snackbars: SnackbarItem[];
  addSnackbar: (item: Omit<SnackbarItem, "id">) => string;
  removeSnackbar: (id: string) => void;
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
  snackbars: [],
  addSnackbar: (item) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newItem: SnackbarItem = {
      ...item,
      id,
      duration: item.duration ?? 4000,
    };

    set((state) => ({
      // Keep at most 4 visible snackbars to avoid clutter
      snackbars: [newItem, ...state.snackbars.slice(0, 3)],
    }));

    if (newItem.duration && newItem.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          snackbars: state.snackbars.filter((s) => s.id !== id),
        }));
      }, newItem.duration);
    }

    return id;
  },
  removeSnackbar: (id) => {
    set((state) => ({
      snackbars: state.snackbars.filter((s) => s.id !== id),
    }));
  },
}));

// Ergonomic global helper
export const toast = {
  success: (message: string, title: string = "Success") => {
    return useSnackbarStore.getState().addSnackbar({
      type: "success",
      title,
      message,
    });
  },
  error: (message: string, title: string = "Error") => {
    return useSnackbarStore.getState().addSnackbar({
      type: "error",
      title,
      message,
      duration: 5000, // keep errors slightly longer
    });
  },
  info: (message: string, title: string = "Information") => {
    return useSnackbarStore.getState().addSnackbar({
      type: "info",
      title,
      message,
    });
  },
  warning: (message: string, title: string = "Notice") => {
    return useSnackbarStore.getState().addSnackbar({
      type: "warning",
      title,
      message,
    });
  },
  dismiss: (id: string) => {
    useSnackbarStore.getState().removeSnackbar(id);
  },
};

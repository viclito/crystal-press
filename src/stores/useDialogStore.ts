"use client";

import { create } from "zustand";

export type DialogType = "info" | "success" | "warning" | "danger";

export interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
}

interface DialogState {
  isOpen: boolean;
  options: DialogOptions;
  resolve: (value: boolean) => void;
  showDialog: (options: DialogOptions) => Promise<boolean>;
  closeDialog: (result: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  isOpen: false,
  options: {
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
    cancelText: "Cancel",
    isConfirm: false,
  },
  resolve: () => {},
  showDialog: (options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options: {
          title: options.title || (options.type === "danger" ? "Confirm Action" : "Notice"),
          message: options.message,
          type: options.type || "info",
          confirmText: options.confirmText || (options.isConfirm ? "Confirm" : "OK"),
          cancelText: options.cancelText || "Cancel",
          isConfirm: !!options.isConfirm,
        },
        resolve,
      });
    });
  },
  closeDialog: (result: boolean) => {
    const { resolve } = get();
    set({ isOpen: false });
    if (resolve) resolve(result);
  },
}));

// Quick utility functions
export const modal = {
  alert: (message: string, title?: string, type: DialogType = "warning") => {
    return useDialogStore.getState().showDialog({
      title,
      message,
      type,
      isConfirm: false,
      confirmText: "Understood",
    });
  },
  error: (message: string, title: string = "Something went wrong") => {
    return useDialogStore.getState().showDialog({
      title,
      message,
      type: "danger",
      isConfirm: false,
      confirmText: "Close",
    });
  },
  success: (message: string, title: string = "Success") => {
    return useDialogStore.getState().showDialog({
      title,
      message,
      type: "success",
      isConfirm: false,
      confirmText: "Great",
    });
  },
  confirm: ({
    title = "Are you sure?",
    message,
    confirmText = "Yes, Continue",
    cancelText = "Cancel",
    type = "danger",
  }: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: DialogType;
  }) => {
    return useDialogStore.getState().showDialog({
      title,
      message,
      confirmText,
      cancelText,
      type,
      isConfirm: true,
    });
  },
};

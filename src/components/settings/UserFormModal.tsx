"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Shield, User, Lock, Trash2, AlertCircle } from "lucide-react";
import { upsertUser, deleteUser } from "@/actions/users";
import { UserRole } from "@prisma/client";
import { modal } from "@/stores/useDialogStore";
import { toast } from "@/stores/useSnackbarStore";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: any | null;
}

export function UserFormModal({ isOpen, onClose, userToEdit }: UserFormModalProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.CASHIER);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userToEdit) {
      setFullName(userToEdit.fullName || "");
      setUsername(userToEdit.username || "");
      setPassword(""); // Leave blank if not changing
      setRole(userToEdit.role || UserRole.CASHIER);
      setIsActive(userToEdit.isActive !== false);
      setError("");
    } else {
      setFullName("");
      setUsername("");
      setPassword("");
      setRole(UserRole.CASHIER);
      setIsActive(true);
      setError("");
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      setError("Please fill in full name and username");
      return;
    }

    if (!userToEdit && (!password || password.length < 4)) {
      setError("Password must be at least 4 characters for new accounts");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const res = await upsertUser({
      id: userToEdit?.id,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
      password: password ? password.trim() : undefined,
      role,
      isActive,
    });

    setIsSubmitting(false);
    if (res.success) {
      toast.success(
        userToEdit ? `Account for "${fullName}" updated` : `Staff account created for "${fullName}"`,
        userToEdit ? "User Updated" : "User Created"
      );
      onClose();
    } else {
      setError((res as any).error || "Failed to save user account");
      toast.error((res as any).error || "Failed to save user account");
    }
  };

  const handleDelete = async () => {
    if (!userToEdit?.id) return;
    const confirmed = await modal.confirm({
      title: "Delete / Deactivate User?",
      message: `Are you sure you want to delete or deactivate account "${userToEdit.fullName}"?`,
      confirmText: "Delete Account",
      type: "danger",
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    const res = await deleteUser(userToEdit.id);
    setIsSubmitting(false);

    if (res.success) {
      toast.success(`Account for "${userToEdit.fullName}" deactivated/deleted`, "User Removed");
      onClose();
    } else {
      setError((res as any).error || "Failed to delete user");
      toast.error((res as any).error || "Failed to delete user");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {userToEdit ? "Edit Staff Account" : "Create New Staff Account"}
              </h3>
              <p className="text-xs text-slate-400">Manage permissions and login credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-rose-50 rounded-2xl border border-rose-200/80 text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 my-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Username (Login ID) *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ramesh_pos"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Used by staff to log in at the counter.</span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {userToEdit ? "New Password (Leave blank to keep unchanged)" : "Password *"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={userToEdit ? "••••••••" : "At least 4 characters"}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Role & Access Level *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: UserRole.CASHIER, label: "Cashier", desc: "POS Billing & Jobs" },
                { id: UserRole.MANAGER, label: "Manager", desc: "Stock, Jobs, Udhaar" },
                { id: UserRole.ADMIN, label: "Admin (Owner)", desc: "Full Access" },
              ].map((r) => {
                const active = role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center text-center transition-all ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-xs font-bold">{r.label}</span>
                    <span className={`text-[9px] mt-0.5 ${active ? "text-slate-300" : "text-slate-400"}`}>
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Status */}
          {userToEdit && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Account Active</span>
                <p className="text-[10px] text-slate-400">Allow staff to sign in</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  isActive ? "bg-lime-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2 border-t border-slate-100">
            {userToEdit && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="px-3.5 py-3 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-1"
                title="Delete or Deactivate User"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Check className="w-4 h-4 text-lime-400" />
              <span>{isSubmitting ? "Saving..." : userToEdit ? "Update User" : "Create Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

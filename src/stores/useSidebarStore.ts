import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SidebarLayoutMode = "tree" | "classic";
export type MobileNavStyle = "bottom_bar" | "drawer";

interface SidebarStoreState {
  layout: SidebarLayoutMode;
  collapsedCategories: string[];
  mobileNavStyle: MobileNavStyle;
  isMobileOpen: boolean;
  setLayout: (mode: SidebarLayoutMode) => void;
  setMobileNavStyle: (style: MobileNavStyle) => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
  toggleCategory: (categoryKey: string) => void;
  expandAll: () => void;
  collapseAll: (allKeys: string[]) => void;
}

export const useSidebarStore = create<SidebarStoreState>()(
  persist(
    (set) => ({
      layout: "tree",
      collapsedCategories: [],
      mobileNavStyle: "bottom_bar",
      isMobileOpen: false,
      setLayout: (mode) => set({ layout: mode }),
      setMobileNavStyle: (style) => set({ mobileNavStyle: style }),
      setMobileOpen: (open) => set({ isMobileOpen: open }),
      toggleMobileOpen: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      toggleCategory: (key) =>
        set((state) => ({
          collapsedCategories: state.collapsedCategories.includes(key)
            ? state.collapsedCategories.filter((k) => k !== key)
            : [...state.collapsedCategories, key],
        })),
      expandAll: () => set({ collapsedCategories: [] }),
      collapseAll: (allKeys) => set({ collapsedCategories: allKeys }),
    }),
    {
      name: "crystalpress_sidebar_preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        layout: state.layout,
        collapsedCategories: state.collapsedCategories,
        mobileNavStyle: state.mobileNavStyle,
      }),
    }
  )
);

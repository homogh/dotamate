import { create } from "zustand";

interface ConfirmOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmState {
  request: ConfirmRequest | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  settle: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      set({ request: { ...options, resolve } });
    }),
  settle: (value) => {
    get().request?.resolve(value);
    set({ request: null });
  },
}));

export function useConfirm() {
  return useConfirmStore((s) => s.ask);
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Modals, type ModalId } from "@/components/modals";
import { AdminModals } from "@/components/admin-modals";
import { NouvelEmployeModal } from "@/components/nouvel-employe";

/* ===== Toasts (équivalent toast() de la maquette) ===== */
type Toast = { id: number; msg: string };
const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/* ===== Modales (équivalent om()/cm() de la maquette) ===== */
type ModalCtx = { open: ModalId | null; om: (id: ModalId) => void; cm: () => void };
const ModalContext = createContext<ModalCtx>({ open: null, om: () => {}, cm: () => {} });
export const useModal = () => useContext(ModalContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [open, setOpen] = useState<ModalId | null>(null);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const om = useCallback((id: ModalId) => setOpen(id), []);
  const cm = useCallback(() => setOpen(null), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <ModalContext.Provider value={{ open, om, cm }}>
        {children}
        <Modals />
        <AdminModals />
        <NouvelEmployeModal />
        <div id="toast">
          {toasts.map((t) => (
            <div key={t.id} className="tst">
              <i>✓</i>
              {t.msg}
            </div>
          ))}
        </div>
      </ModalContext.Provider>
    </ToastContext.Provider>
  );
}

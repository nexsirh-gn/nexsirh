"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useModal, useToast } from "@/components/providers";
import { createClient } from "@/lib/supabase/client";
import type { ModalId } from "@/components/modals";

type MenuLink = {
  icon: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

export function ProfileMenu({
  initials,
  avatarClass = "av g",
  name,
  email,
  roleBadge,
  footer,
  links,
  logoutHref,
  logoutMessage,
  chipStyle,
  nameStyle,
  smallStyle,
  chevStyle,
}: {
  initials: string;
  avatarClass?: string;
  name: string;
  email: string;
  roleBadge: React.ReactNode;
  footer?: string;
  links: MenuLink[];
  logoutHref: string;
  logoutMessage: string;
  chipStyle?: React.CSSProperties;
  nameStyle?: React.CSSProperties;
  smallStyle?: React.CSSProperties;
  chevStyle?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className={`pmenu${open ? " open" : ""}`} ref={ref}>
      <button className="pchip" style={chipStyle} onClick={() => setOpen((o) => !o)}>
        <span className={avatarClass}>{initials}</span>
        <span className="pinfo">
          <b style={nameStyle}>{name}</b>
          <small style={smallStyle}>{email}</small>
        </span>
        <span className="chev" style={chevStyle}>⌄</span>
      </button>
      <div className={`pdrop${open ? " on" : ""}`}>
        <div className="ph">
          <span className={avatarClass} style={{ width: 40, height: 40, fontSize: 14 }}>{initials}</span>
          <div>
            <b>{name}</b>
            <small>{email}</small>
            <small>{roleBadge}</small>
          </div>
        </div>
        {links.map((l) => (
          <a
            key={l.label}
            className={l.danger ? "dgr" : undefined}
            onClick={() => {
              setOpen(false);
              l.onSelect();
            }}
          >
            <span className="pi">{l.icon}</span> {l.label}
          </a>
        ))}
        <div className="dv" />
        <a
          className="dgr"
          onClick={async () => {
            setOpen(false);
            await createClient().auth.signOut();
            toast(logoutMessage);
            router.push(logoutHref);
            router.refresh();
          }}
        >
          <span className="pi">⏻</span> Se déconnecter
        </a>
        {footer && <div className="foot">{footer}</div>}
      </div>
    </div>
  );
}

export function useModalLink(id: ModalId) {
  const { om } = useModal();
  return () => om(id);
}

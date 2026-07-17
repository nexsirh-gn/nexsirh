-- ============================================================
-- 0005 — ABONNEMENTS (plans, souscriptions, factures, promos)
--        + CONSOLE ADMIN (support, annonces, incidents, équipe, crons)
-- ============================================================

-- ----- Plans (GLOBALE) -----
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- starter, business, cabinet
  name text not null,
  price_gnf bigint,                    -- null = sur devis
  max_employees int,
  max_users int,                       -- null = illimité
  features jsonb not null default '[]',
  highlighted boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Souscriptions -----
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) unique,
  plan_id uuid references public.plans(id),
  status text not null default 'trial' check (status in
    ('trial','active','past_due','canceled','paused')),
  trial_ends_at date,
  current_period_start date,
  current_period_end date,
  payment_method text default 'card',  -- card | virement | offert
  stripe_customer_id text,
  stripe_subscription_id text,
  failed_payments int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Factures -----
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  number text not null unique,          -- F-2026-0812
  amount_gnf bigint not null,
  period_start date,
  period_end date,
  status text not null default 'due' check (status in ('due','paid','failed','void')),
  paid_at timestamptz,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.invoices (company_id);

-- ----- Codes promo (GLOBALE) -----
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent numeric not null,
  duration_months int,
  max_uses int,
  used_count int not null default 0,
  expires_at date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Tickets support -----
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number serial,
  company_id uuid not null references public.companies(id),
  subject text not null,
  priority text not null default 'normal' check (priority in ('basse','normal','urgent')),
  status text not null default 'ouvert' check (status in
    ('ouvert','en_cours','attente_client','resolu','ferme')),
  assigned_to text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.support_tickets (company_id, status);

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_type text not null check (author_type in ('client','support')),
  author_name text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.support_ticket_messages (ticket_id);

-- ----- Annonces plateforme -----
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text,
  channel text not null default 'banniere' check (channel in ('banniere','email','banniere_email','email_auto')),
  target text not null default 'tous',
  status text not null default 'brouillon' check (status in ('brouillon','programmee','envoyee','annulee')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  stats jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Incidents plateforme -----
create table public.platform_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text not null default 'mineur' check (severity in ('mineur','majeur','maintenance','info')),
  description text,
  started_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Équipe console (informationnel — l'auth réelle passe par profiles.role) -----
create table public.admin_team_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  name text not null,
  email text not null unique,
  console_role text not null default 'support' check (console_role in
    ('super_admin','support','technique','commercial')),
  twofa_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- Historique des tâches planifiées -----
create table public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  task_name text not null,
  frequency text,
  ran_at timestamptz not null default now(),
  duration_ms int,
  status text not null default 'ok' check (status in ('ok','warn','error')),
  detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.cron_runs (task_name, ran_at desc);

-- ----- Triggers -----
create trigger t_upd before update on public.plans for each row execute function set_updated_at();
create trigger t_upd before update on public.subscriptions for each row execute function set_updated_at();
create trigger t_upd before update on public.invoices for each row execute function set_updated_at();
create trigger t_upd before update on public.promo_codes for each row execute function set_updated_at();
create trigger t_upd before update on public.support_tickets for each row execute function set_updated_at();
create trigger t_upd before update on public.support_ticket_messages for each row execute function set_updated_at();
create trigger t_upd before update on public.announcements for each row execute function set_updated_at();
create trigger t_upd before update on public.platform_incidents for each row execute function set_updated_at();
create trigger t_upd before update on public.admin_team_members for each row execute function set_updated_at();
create trigger t_upd before update on public.cron_runs for each row execute function set_updated_at();

-- Audit sur subscriptions (CLAUDE.md §5.5)
create trigger t_audit after insert or update or delete on public.subscriptions
  for each row execute function write_audit();

-- ============================================================
-- RLS
-- ============================================================
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.promo_codes enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.announcements enable row level security;
alter table public.platform_incidents enable row level security;
alter table public.admin_team_members enable row level security;
alter table public.cron_runs enable row level security;

-- plans : lecture authentifiée ; écriture super_admin
create policy plans_select on public.plans for select using (auth.uid() is not null);
create policy plans_write_i on public.plans for insert with check (is_super_admin());
create policy plans_write_u on public.plans for update using (is_super_admin());

-- subscriptions / invoices : admin/dg de la société (lecture) ; super_admin tout
create policy subs_select on public.subscriptions for select
  using ((company_id = current_company_id() and has_role('admin','rh','dg')) or is_super_admin());
create policy subs_insert on public.subscriptions for insert with check (is_super_admin());
create policy subs_update on public.subscriptions for update using (is_super_admin());

create policy inv_select on public.invoices for select
  using ((company_id = current_company_id() and has_role('admin','rh','dg','comptable')) or is_super_admin());
create policy inv_insert on public.invoices for insert with check (is_super_admin());
create policy inv_update on public.invoices for update using (is_super_admin());

-- promo_codes : super_admin uniquement
create policy promo_select on public.promo_codes for select using (is_super_admin());
create policy promo_insert on public.promo_codes for insert with check (is_super_admin());
create policy promo_update on public.promo_codes for update using (is_super_admin());
create policy promo_delete on public.promo_codes for delete using (is_super_admin());

-- support : le client (admin/rh) voit et crée SES tickets ; super_admin tout
create policy tickets_select on public.support_tickets for select
  using ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy tickets_insert on public.support_tickets for insert
  with check ((company_id = current_company_id() and has_role('admin','rh')) or is_super_admin());
create policy tickets_update on public.support_tickets for update using (is_super_admin());

create policy tmsg_select on public.support_ticket_messages for select using (
  is_super_admin() or exists (
    select 1 from support_tickets t
    where t.id = ticket_id and t.company_id = current_company_id() and has_role('admin','rh')
  )
);
create policy tmsg_insert on public.support_ticket_messages for insert with check (
  is_super_admin() or exists (
    select 1 from support_tickets t
    where t.id = ticket_id and t.company_id = current_company_id() and has_role('admin','rh')
  )
);

-- annonces : bannières envoyées lisibles par tous les authentifiés ; gestion super_admin
create policy ann_select on public.announcements for select
  using (is_super_admin() or (auth.uid() is not null and status in ('envoyee','programmee')));
create policy ann_insert on public.announcements for insert with check (is_super_admin());
create policy ann_update on public.announcements for update using (is_super_admin());
create policy ann_delete on public.announcements for delete using (is_super_admin());

-- incidents / équipe / crons : console uniquement
create policy inc_all_s on public.platform_incidents for select using (is_super_admin());
create policy inc_all_i on public.platform_incidents for insert with check (is_super_admin());
create policy inc_all_u on public.platform_incidents for update using (is_super_admin());

create policy team_s on public.admin_team_members for select using (is_super_admin());
create policy team_i on public.admin_team_members for insert with check (is_super_admin());
create policy team_u on public.admin_team_members for update using (is_super_admin());
create policy team_d on public.admin_team_members for delete using (is_super_admin());

create policy cron_s on public.cron_runs for select using (is_super_admin());
create policy cron_i on public.cron_runs for insert with check (is_super_admin());

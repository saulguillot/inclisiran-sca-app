-- Esquema inicial propuesto para fase de sincronización compartida.
-- No ejecutar en producción sin revisión de seguridad, roles y aprobación institucional.
create extension if not exists pgcrypto;

create table if not exists public.study_patients (
  id uuid primary key default gen_random_uuid(),
  study_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  treatment_group text not null check (treatment_group in (
    'Inclisiran temprano + tratamiento habitual','Tratamiento habitual'
  )),
  admission_date date,
  age integer check (age between 18 and 120),
  sex text,
  acs_type text,
  pci_date date,
  inclisiran_date date,
  diabetes boolean,
  hypertension boolean,
  dyslipidemia boolean,
  smoking boolean,
  prior_ascvd boolean,
  ckd boolean,
  statin text,
  ezetimibe text,
  ldl_baseline numeric,
  total_cholesterol numeric,
  hdl numeric,
  triglycerides numeric,
  ldl_discharge numeric,
  ldl_m1 numeric,
  ldl_m3 numeric,
  ldl_m6 numeric,
  ldl_m12 numeric,
  adherence text,
  oct_done text,
  oct_date date,
  eat_baseline_mm numeric,
  eat_followup_mm numeric,
  cv_event text,
  event_type text,
  notes text,
  version integer not null default 1
);

alter table public.study_patients enable row level security;

-- Base conservadora: usuarios autenticados pueden leer registros del estudio.
-- Insertar/editar/eliminar solo debe permitirse a usuarios aprobados, idealmente
-- mediante una tabla de membresías/roles y políticas más específicas.
-- NO activar políticas genéricas de escritura en un proyecto con datos reales.
create policy "authenticated_read_study_patients"
on public.study_patients for select
to authenticated using (true);

-- Fase de sincronización: implementar trigger updated_at, tabla study_members,
-- roles (investigator/data_manager/admin), registro de auditoría y política RLS
-- de INSERT/UPDATE/DELETE vinculada a la membresía autorizada.

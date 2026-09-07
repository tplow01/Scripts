-- Editable email copy.
--
-- The wording of the order emails lived only in TypeScript, so changing a
-- sentence meant a developer, a commit and a deploy. That is the wrong shape:
-- the words are Heath's, and BRAND.md's voice is his to tune. The structure
-- stays in code; only the sentences move.
--
-- One row per template, fields as jsonb. Anything absent falls back to the
-- default written in code — so an empty table behaves exactly as today, and
-- clearing a field restores the original rather than sending a blank email.

create table if not exists email_copy (
  template   text primary key
             check (template in ('order_confirmation', 'order_shipped', 'order_delivered')),
  copy       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table email_copy enable row level security;
-- No public policy: this is back-office content, reached only via service_role.

drop trigger if exists email_copy_touch_updated_at on email_copy;
create trigger email_copy_touch_updated_at
  before update on email_copy
  for each row execute function touch_updated_at();

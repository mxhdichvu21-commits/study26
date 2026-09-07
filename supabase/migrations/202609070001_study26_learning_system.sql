begin;

-- =========================================================
-- 1. RECIPIENTS: LESSON
-- =========================================================

create table if not exists public.lesson_recipients (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lesson_id, student_id)
);

create index if not exists idx_lesson_recipients_student
  on public.lesson_recipients(student_id);

create index if not exists idx_lesson_recipients_lesson
  on public.lesson_recipients(lesson_id);


-- =========================================================
-- 2. RECIPIENTS: ASSIGNMENT
-- =========================================================

create table if not exists public.assignment_recipients (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

create index if not exists idx_assignment_recipients_student
  on public.assignment_recipients(student_id);

create index if not exists idx_assignment_recipients_assignment
  on public.assignment_recipients(assignment_id);


-- =========================================================
-- 3. LESSON VIEWS
-- =========================================================

create table if not exists public.lesson_views (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (lesson_id, student_id)
);

create index if not exists idx_lesson_views_student
  on public.lesson_views(student_id);

create index if not exists idx_lesson_views_lesson
  on public.lesson_views(lesson_id);


-- =========================================================
-- 4. LESSON ATTACHMENTS
-- =========================================================

create table if not exists public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_attachments_lesson
  on public.lesson_attachments(lesson_id);


-- =========================================================
-- 5. ASSIGNMENT ATTACHMENTS
-- =========================================================

create table if not exists public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_assignment_attachments_assignment
  on public.assignment_attachments(assignment_id);


-- =========================================================
-- 6. SUBMISSION ATTACHMENTS
-- =========================================================

create table if not exists public.submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint not null default 0,
  created_at timestamptz not null default now(),
  delete_after timestamptz not null default (now() + interval '7 days')
);

create index if not exists idx_submission_attachments_submission
  on public.submission_attachments(submission_id);

create index if not exists idx_submission_attachments_delete_after
  on public.submission_attachments(delete_after);


-- =========================================================
-- 7. ENABLE RLS
-- =========================================================

alter table public.lesson_recipients enable row level security;
alter table public.assignment_recipients enable row level security;
alter table public.lesson_views enable row level security;
alter table public.lesson_attachments enable row level security;
alter table public.assignment_attachments enable row level security;
alter table public.submission_attachments enable row level security;


-- =========================================================
-- 8. DROP OLD LESSON/ASSIGNMENT SELECT POLICIES
-- =========================================================

drop policy if exists "lessons_class_access"
  on public.lessons;

drop policy if exists "assignments class access"
  on public.assignments;


-- =========================================================
-- 9. LESSON ACCESS
-- =========================================================

create policy "students can read assigned lessons"
on public.lessons
for select
to authenticated
using (
  exists (
    select 1
    from public.lesson_recipients lr
    where lr.lesson_id = lessons.id
      and lr.student_id = auth.uid()
  )
  or exists (
    select 1
    from public.classes c
    where c.id = lessons.class_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);


-- =========================================================
-- 10. ASSIGNMENT ACCESS
-- =========================================================

create policy "students can read assigned assignments"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.assignment_recipients ar
    where ar.assignment_id = assignments.id
      and ar.student_id = auth.uid()
  )
  or exists (
    select 1
    from public.classes c
    where c.id = assignments.class_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);


-- =========================================================
-- 11. LESSON RECIPIENT ACCESS
-- =========================================================

create policy "lesson recipients student read"
on public.lesson_recipients
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = lesson_recipients.lesson_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);

create policy "lesson recipients teacher manage"
on public.lesson_recipients
for all
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = lesson_recipients.lesson_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
)
with check (
  exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    join public.class_members cm
      on cm.class_id = c.id
     and cm.user_id = lesson_recipients.student_id
     and cm.role = 'student'
    where l.id = lesson_recipients.lesson_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);


-- =========================================================
-- 12. ASSIGNMENT RECIPIENT ACCESS
-- =========================================================

create policy "assignment recipients student read"
on public.assignment_recipients
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_recipients.assignment_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);

create policy "assignment recipients teacher manage"
on public.assignment_recipients
for all
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_recipients.assignment_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
)
with check (
  exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    join public.class_members cm
      on cm.class_id = c.id
     and cm.user_id = assignment_recipients.student_id
     and cm.role = 'student'
    where a.id = assignment_recipients.assignment_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);


-- =========================================================
-- 13. LESSON VIEWS
-- =========================================================

create policy "students read own lesson views"
on public.lesson_views
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = lesson_views.lesson_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);

create policy "students create own lesson view"
on public.lesson_views
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.lesson_recipients lr
    where lr.lesson_id = lesson_views.lesson_id
      and lr.student_id = auth.uid()
  )
);

create policy "students update own lesson view"
on public.lesson_views
for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());


-- =========================================================
-- 14. LESSON ATTACHMENTS
-- =========================================================

create policy "lesson attachment access"
on public.lesson_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.lesson_recipients lr
    where lr.lesson_id = lesson_attachments.lesson_id
      and lr.student_id = auth.uid()
  )
  or exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = lesson_attachments.lesson_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);

create policy "lesson attachment teacher manage"
on public.lesson_attachments
for all
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = lesson_attachments.lesson_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
)
with check (
  exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = lesson_attachments.lesson_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);


-- =========================================================
-- 15. ASSIGNMENT ATTACHMENTS
-- =========================================================

create policy "assignment attachment access"
on public.assignment_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.assignment_recipients ar
    where ar.assignment_id = assignment_attachments.assignment_id
      and ar.student_id = auth.uid()
  )
  or exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_attachments.assignment_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);

create policy "assignment attachment teacher manage"
on public.assignment_attachments
for all
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_attachments.assignment_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
)
with check (
  exists (
    select 1
    from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_attachments.assignment_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);


-- =========================================================
-- 16. SUBMISSION ATTACHMENTS
-- =========================================================

create policy "submission attachments own or teacher"
on public.submission_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.submissions s
    where s.id = submission_attachments.submission_id
      and s.student_id = auth.uid()
  )
  or exists (
    select 1
    from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    join public.classes c on c.id = a.class_id
    where s.id = submission_attachments.submission_id
      and c.teacher_id = auth.uid()
  )
  or is_admin()
);

create policy "students create own submission attachments"
on public.submission_attachments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.submissions s
    where s.id = submission_attachments.submission_id
      and s.student_id = auth.uid()
  )
);

create policy "students delete own submission attachments"
on public.submission_attachments
for delete
to authenticated
using (
  exists (
    select 1
    from public.submissions s
    where s.id = submission_attachments.submission_id
      and s.student_id = auth.uid()
  )
  or is_admin()
);

commit;

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Save, Trash2 } from "lucide-react";
import { saveResume } from "@/lib/actions";

type Experience = { role?: string; company?: string; start?: string; end?: string; bullets?: string[] };
type Education = { school?: string; qualification?: string; start?: string; end?: string };

export type ResumeData = {
  _id: string;
  title: string;
  template: string;
  personal: { fullName?: string; headline?: string; email?: string; phone?: string; location?: string; github?: string; linkedin?: string };
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  achievements: string[];
  atsScore?: number;
};

const TEMPLATES = ["developer", "modern", "minimal", "professional", "creative", "corporate"];

export function ResumeEditor({ resume, projectTitles }: { resume: ResumeData; projectTitles: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<ResumeData>(resume);
  const [ats, setAts] = useState<{ score: number; findings: string[]; strengths: string[] } | null>(
    resume.atsScore !== undefined ? { score: resume.atsScore, findings: [], strengths: [] } : null
  );
  const [saved, setSaved] = useState(false);

  function save() {
    start(async () => {
      const result = await saveResume(form._id, {
        title: form.title,
        template: form.template,
        summary: form.summary,
        personal: form.personal,
        skills: form.skills,
        experience: form.experience,
        education: form.education,
        achievements: form.achievements,
        projects: projectTitles, // linked projects count toward the ATS score
      });
      if (result) setAts({ score: result.atsScore, findings: result.findings, strengths: result.strengths });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  const p = form.personal;
  const setP = (patch: Partial<ResumeData["personal"]>) => setForm((f) => ({ ...f, personal: { ...f.personal, ...patch } }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-6">
        {/* header */}
        <section className="card p-5">
          <p className="eyebrow">Contact</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input className="input" value={p.fullName ?? ""} onChange={(e) => setP({ fullName: e.target.value })} placeholder="Full name" aria-label="Full name" />
            <input className="input" value={p.headline ?? ""} onChange={(e) => setP({ headline: e.target.value })} placeholder="Headline, e.g. Full-stack developer" aria-label="Headline" />
            <input className="input" value={p.email ?? ""} onChange={(e) => setP({ email: e.target.value })} placeholder="Email" aria-label="Email" />
            <input className="input" value={p.phone ?? ""} onChange={(e) => setP({ phone: e.target.value })} placeholder="Phone" aria-label="Phone" />
            <input className="input" value={p.location ?? ""} onChange={(e) => setP({ location: e.target.value })} placeholder="Location" aria-label="Location" />
            <input className="input" value={p.github ?? ""} onChange={(e) => setP({ github: e.target.value })} placeholder="GitHub" aria-label="GitHub" />
          </div>
        </section>

        <section className="card p-5">
          <p className="eyebrow">Summary</p>
          <textarea
            className="input mt-3 min-h-[100px] resize-y"
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder="Two or three sentences. Who you are, what you build, what you are looking for."
            aria-label="Summary"
          />
        </section>

        <section className="card p-5">
          <p className="eyebrow">Skills</p>
          <input
            className="input mt-3"
            value={form.skills.join(", ")}
            onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
            placeholder="TypeScript, React, Node, MongoDB, … (comma separated)"
            aria-label="Skills"
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-faint)" }}>{form.skills.length} skills, 8+ matches most job descriptions.</p>
        </section>

        <ListSection
          title="Experience"
          items={form.experience}
          onChange={(experience) => setForm((f) => ({ ...f, experience }))}
          blank={{ role: "", company: "", start: "", end: "", bullets: [""] }}
          render={(item, update) => (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" value={item.role ?? ""} onChange={(e) => update({ role: e.target.value })} placeholder="Role" aria-label="Role" />
                <input className="input" value={item.company ?? ""} onChange={(e) => update({ company: e.target.value })} placeholder="Company" aria-label="Company" />
                <input className="input" value={item.start ?? ""} onChange={(e) => update({ start: e.target.value })} placeholder="Start (e.g. 2023)" aria-label="Start" />
                <input className="input" value={item.end ?? ""} onChange={(e) => update({ end: e.target.value })} placeholder="End (or Present)" aria-label="End" />
              </div>
              <textarea
                className="input mt-2 min-h-[70px] resize-y text-[13px]"
                value={(item.bullets ?? []).join("\n")}
                onChange={(e) => update({ bullets: e.target.value.split("\n") })}
                placeholder={"One achievement per line. Start with a verb, include a number.\nBuilt X, reducing Y by 30%."}
                aria-label="Bullets"
              />
            </>
          )}
        />

        <ListSection
          title="Education"
          items={form.education}
          onChange={(education) => setForm((f) => ({ ...f, education }))}
          blank={{ school: "", qualification: "", start: "", end: "" }}
          render={(item, update) => (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input" value={item.school ?? ""} onChange={(e) => update({ school: e.target.value })} placeholder="School / bootcamp" aria-label="School" />
              <input className="input" value={item.qualification ?? ""} onChange={(e) => update({ qualification: e.target.value })} placeholder="Qualification" aria-label="Qualification" />
              <input className="input" value={item.start ?? ""} onChange={(e) => update({ start: e.target.value })} placeholder="Start" aria-label="Start" />
              <input className="input" value={item.end ?? ""} onChange={(e) => update({ end: e.target.value })} placeholder="End" aria-label="End" />
            </div>
          )}
        />
      </div>

      {/* sidebar: ATS score + template + save */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-4">
          <p className="eyebrow">ATS score</p>
          <p className="mt-2 text-4xl font-bold tabular-nums" style={{ color: (ats?.score ?? 0) >= 70 ? "var(--success)" : "var(--warning)" }}>
            {ats?.score ?? form.atsScore ?? 0}%
          </p>
          {ats && ats.findings.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {ats.findings.slice(0, 5).map((finding) => (
                <li key={finding} className="text-[12px]" style={{ color: "var(--text-muted)" }}>• {finding}</li>
              ))}
            </ul>
          )}
          {ats && ats.strengths.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {ats.strengths.map((s) => (
                <li key={s} className="flex items-center gap-1 text-[12px]" style={{ color: "var(--success)" }}>
                  <Check size={11} /> {s}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-faint)" }}>Recomputed on every save.</p>
        </div>

        <div className="card p-4">
          <label className="eyebrow" htmlFor="r-template">Template</label>
          <select id="r-template" className="input mt-2" value={form.template} onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}>
            {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button className="btn btn-primary" onClick={save} disabled={pending}>
          <Save size={15} /> {saved ? "Saved" : "Save & score"}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => window.print()}
        >
          Export (print to PDF)
        </button>
      </div>
    </div>
  );
}

function ListSection<T>({
  title,
  items,
  onChange,
  blank,
  render,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  blank: T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{title}</p>
        <button className="btn btn-ghost h-8 px-3 text-[13px]" onClick={() => onChange([...items, { ...blank }])}>
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-[var(--radius-card)] border p-3" style={{ borderColor: "var(--border)" }}>
            {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
            <button
              className="mt-2 flex items-center gap-1 text-[11px]"
              style={{ color: "var(--danger)" }}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 size={11} /> Remove
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm" style={{ color: "var(--text-faint)" }}>Nothing added yet.</p>}
      </div>
    </section>
  );
}

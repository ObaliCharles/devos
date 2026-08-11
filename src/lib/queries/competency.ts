/**
 * Reading competence.
 *
 * Nothing here loads a stored score, because nothing stores one. Each function
 * pulls the evidence rows and hands them to the pure derivation in
 * `lib/competency.ts`. That is the whole design: the judgement is recomputed
 * from the artefacts every time, so changing what counts as competence is a
 * change to one pure function rather than a migration over cached numbers.
 *
 * Reads are cheap because `Evidence` is indexed on `{ user, skill, dimension,
 * createdAt }` and the projections take only the five fields the derivation
 * uses — never the whole document.
 */

import { connectDB } from "../db";
import { Evidence, SkillCompetency } from "../models";
import {
  competencyFrom,
  independenceFrom,
  type Competency,
  type Dimension,
  type EvidenceInput,
  type Independence,
} from "../competency";

/** The only fields the derivation needs. Keep the projection this narrow. */
const FIELDS = "dimension source strength verified assistLevel";

type Row = {
  dimension: string;
  source: string;
  strength: number;
  verified: boolean;
  assistLevel?: number;
};

/**
 * Mongo hands back plain strings for the enums. Cast once, here, rather than at
 * every call site — the schema's `enum` already constrains what can be written.
 */
function toInputs(rows: Row[]): EvidenceInput[] {
  return rows.map((r) => ({
    dimension: r.dimension as Dimension,
    source: r.source as EvidenceInput["source"],
    strength: r.strength,
    verified: r.verified,
    assistLevel: r.assistLevel,
  }));
}

/**
 * Which dimensions a skill is fairly judged on. A conceptual skill has no
 * implementation dimension, and demanding one would leave it permanently
 * unmasterable — so an explicit list on `SkillCompetency` wins, and the absence
 * of one means all eight apply.
 */
async function relevantDimensions(skillId: unknown): Promise<Dimension[] | undefined> {
  const config = await SkillCompetency.findOne({ skill: skillId })
    .select("dimensions")
    .lean<{ dimensions?: string[] } | null>();
  const dims = config?.dimensions ?? [];
  return dims.length > 0 ? (dims as Dimension[]) : undefined;
}

/** Competence in one skill, derived from every artefact recorded for it. */
export async function getSkillCompetency(userId: unknown, skillId: unknown): Promise<Competency> {
  await connectDB();
  const [rows, relevant] = await Promise.all([
    Evidence.find({ user: userId, skill: skillId }).select(FIELDS).lean<Row[]>(),
    relevantDimensions(skillId),
  ]);
  return relevant ? competencyFrom(toInputs(rows), relevant) : competencyFrom(toInputs(rows));
}

/**
 * Competence across many skills in **one** query, not one query per skill.
 *
 * The skill page needs one of these; the roadmap needs all of them at once, and
 * the roadmap is the page that has to be fast. `getRoadmap()` next door builds
 * the entire tree in four queries for the same reason — see the query budget
 * note in ARCHITECTURE.md. Do not turn this into a loop over
 * `getSkillCompetency`.
 */
export async function getCompetencyMap(
  userId: unknown,
  skillIds: unknown[]
): Promise<Map<string, Competency>> {
  await connectDB();
  const out = new Map<string, Competency>();
  if (skillIds.length === 0) return out;

  const [rows, configs] = await Promise.all([
    Evidence.find({ user: userId, skill: { $in: skillIds } })
      .select(`${FIELDS} skill`)
      .lean<(Row & { skill: unknown })[]>(),
    SkillCompetency.find({ skill: { $in: skillIds } })
      .select("skill dimensions")
      .lean<{ skill: unknown; dimensions?: string[] }[]>(),
  ]);

  const bySkill = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(row.skill);
    const list = bySkill.get(key);
    if (list) list.push(row);
    else bySkill.set(key, [row]);
  }

  const relevantBySkill = new Map<string, Dimension[]>();
  for (const c of configs) {
    if (c.dimensions && c.dimensions.length > 0) {
      relevantBySkill.set(String(c.skill), c.dimensions as Dimension[]);
    }
  }

  for (const id of skillIds) {
    const key = String(id);
    const inputs = toInputs(bySkill.get(key) ?? []);
    const relevant = relevantBySkill.get(key);
    out.set(key, relevant ? competencyFrom(inputs, relevant) : competencyFrom(inputs));
  }
  return out;
}

/**
 * The AI dependency metric, over a recent window.
 *
 * **Check `sample` before showing this.** Nothing records an assist level until
 * the hint ladder ships, so `sample` is legitimately 0 today and the three
 * shares are all zero — not "100% independent". A caller that renders the
 * numbers without checking will publish a flattering statistic computed from no
 * measurements at all, which is the exact failure this metric exists to expose.
 */
export async function getIndependence(userId: unknown, days = 30): Promise<Independence> {
  await connectDB();
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await Evidence.find({ user: userId, createdAt: { $gte: since } })
    .select(FIELDS)
    .lean<Row[]>();
  return independenceFrom(toInputs(rows));
}

export type EvidenceItem = {
  id: string;
  dimension: string;
  source: string;
  strength: number;
  verified: boolean;
  detail: string;
  at: Date;
};

/**
 * The artefacts themselves, newest first — "here is why this skill is green",
 * which is the difference between a score and a claim.
 */
export async function listEvidence(userId: unknown, skillId: unknown, limit = 20): Promise<EvidenceItem[]> {
  await connectDB();
  const rows = await Evidence.find({ user: userId, skill: skillId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("dimension source strength verified detail createdAt")
    .lean<
      { _id: unknown; dimension: string; source: string; strength: number; verified: boolean; detail?: string; createdAt: Date }[]
    >();

  return rows.map((r) => ({
    id: String(r._id),
    dimension: r.dimension,
    source: r.source,
    strength: r.strength,
    verified: r.verified,
    detail: r.detail ?? "",
    at: r.createdAt,
  }));
}

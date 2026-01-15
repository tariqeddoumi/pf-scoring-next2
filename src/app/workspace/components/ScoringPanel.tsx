"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeScores, resolveGrade } from "@/lib/scoring";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import type { ProjectRow } from "../types";
import ScoringDetailDialog from "./ScoringDetailDialog";

/** -------- Types DB -------- */
type DimensionRow = { id: number; code: string; weight: number };

type InputType = "select" | "yesno" | "number" | "text" | "range";
type Aggregation = "sum" | "avg" | "max" | "min";

type CriteriaRow = {
  id: number;
  dimension_id: number;
  parent_criterion_id: number | null;
  code: string;
  label: string | null;
  weight: number;
  input_type: InputType;
  aggregation: Aggregation;
  sort_order: number | null;
};

type OptionRow = {
  id: number;
  criterion_id: number;
  value_label: string;
  score: number;
  sort_order: number | null;
};

type EvalStatus = "draft" | "validated" | "archived";

type EvalRow = {
  id: string;
  set_id: string;
  version: number;
  status: EvalStatus;
  answers: Json;
  results: Json;
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
  validated_at: string | null;
};

/** -------- JSON safe -------- */
type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

/** -------- Answer model (ALIGN with lib/scoring) --------
 * IMPORTANT: no boolean here (matches your lib/scoring AnswerValue)
 */
type AnswerValue = string | number | null;
type Answers = Record<
  number,
  { value?: AnswerValue; sub?: Record<number, { value?: AnswerValue }> }
>;

/** -------- Domain structures for computeScores -------- */
type DomainOption = { id: number; value_label: string; score: number };

type DomainSubCriterion = {
  id: number;
  code: string;
  weight: number;
  input_type: InputType;
  options?: DomainOption[];
};

type DomainCriterion = {
  id: number;
  code: string;
  weight: number;
  input_type: InputType;
  aggregation: Aggregation;
  options?: DomainOption[];
  subcriteria?: DomainSubCriterion[];
};

type Domain = {
  id: number;
  code: string;
  weight: number;
  criteria: DomainCriterion[];
};

type GradeBucket = {
  id?: number;
  min: number;
  max: number;
  grade: string;
  pd: number;
};

/** -------- Helpers -------- */
function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asObj(v: Json): Record<string, Json> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, Json>;
}

function jsonToAnswers(v: Json): Answers {
  const root = asObj(v);
  if (!root) return {};

  const out: Answers = {};
  for (const [k, raw] of Object.entries(root)) {
    const id = Number(k);
    if (!Number.isFinite(id)) continue;

    const entry = asObj(raw);
    if (!entry) continue;

    const value = entry.value;
    const subRaw = entry.sub;

    const ans: { value?: AnswerValue; sub?: Record<number, { value?: AnswerValue }> } =
      {};

    // ✅ boolean excluded on purpose (align with lib/scoring)
    if (value === null || typeof value === "string" || typeof value === "number") {
      ans.value = value;
    }

    const subObj = asObj(subRaw ?? null);
    if (subObj) {
      const subOut: Record<number, { value?: AnswerValue }> = {};
      for (const [sk, sv] of Object.entries(subObj)) {
        const sid = Number(sk);
        if (!Number.isFinite(sid)) continue;
        const sEntry = asObj(sv);
        if (!sEntry) continue;

        const sval = sEntry.value;
        if (
          sval === null ||
          typeof sval === "string" ||
          typeof sval === "number"
        ) {
          subOut[sid] = { value: sval };
        }
      }
      ans.sub = subOut;
    }

    out[id] = ans;
  }

  return out;
}

function buildDomains(
  dimensions: DimensionRow[],
  criteria: CriteriaRow[],
  options: OptionRow[]
): Domain[] {
  const optsByCrit = new Map<number, OptionRow[]>();
  for (const o of options) {
    const arr = optsByCrit.get(o.criterion_id) ?? [];
    arr.push(o);
    optsByCrit.set(o.criterion_id, arr);
  }

  const rootsByDim = new Map<number, CriteriaRow[]>();
  const childrenByParent = new Map<number, CriteriaRow[]>();

  for (const c of criteria) {
    if (c.parent_criterion_id == null) {
      const arr = rootsByDim.get(c.dimension_id) ?? [];
      arr.push(c);
      rootsByDim.set(c.dimension_id, arr);
    } else {
      const arr = childrenByParent.get(c.parent_criterion_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_criterion_id, arr);
    }
  }

  const dimsSorted = dimensions.slice().sort((a, b) => a.id - b.id);

  return dimsSorted.map((d) => {
    const roots = (rootsByDim.get(d.id) ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const criteriaStruct: DomainCriterion[] = roots.map((root) => {
      const children = (childrenByParent.get(root.id) ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const rootOptions: DomainOption[] = (optsByCrit.get(root.id) ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((o) => ({
          id: o.id,
          value_label: o.value_label,
          score: toNumber(o.score, 0),
        }));

      const subs: DomainSubCriterion[] | undefined = children.length
        ? children.map((ch) => {
            const chOptions: DomainOption[] = (optsByCrit.get(ch.id) ?? [])
              .slice()
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((o) => ({
                id: o.id,
                value_label: o.value_label,
                score: toNumber(o.score, 0),
              }));

            return {
              id: ch.id,
              code: ch.code,
              weight: toNumber(ch.weight, 0),
              input_type: ch.input_type,
              options: chOptions,
            };
          })
        : undefined;

      return {
        id: root.id,
        code: root.code,
        weight: toNumber(root.weight, 0),
        input_type: root.input_type,
        aggregation: root.aggregation,
        options: rootOptions,
        subcriteria: subs,
      };
    });

    return {
      id: d.id,
      code: d.code,
      weight: toNumber(d.weight, 0),
      criteria: criteriaStruct,
    };
  });
}

/** -------- Component -------- */
export default function ScoringPanel({ project }: { project: ProjectRow }) {
  const [loading, setLoading] = React.useState(true);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  const [dimensions, setDimensions] = React.useState<DimensionRow[]>([]);
  const [criteria, setCriteria] = React.useState<CriteriaRow[]>([]);
  const [options, setOptions] = React.useState<OptionRow[]>([]);
  const [gradeBuckets, setGradeBuckets] = React.useState<GradeBucket[]>([]);
  const [domains, setDomains] = React.useState<Domain[]>([]);

  const [answers, setAnswers] = React.useState<Answers>({});

  const [evalSetId, setEvalSetId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<EvalRow[]>([]);
  const [activeEval, setActiveEval] = React.useState<EvalRow | null>(null);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailEvalId, setDetailEvalId] = React.useState<string | null>(null);

  const computed = React.useMemo(() => {
    if (!domains.length) return { total: 0, domainScores: {} as Record<string, number> };
    // ✅ now our Answers matches lib/scoring expectation
    return computeScores(domains, answers);
  }, [domains, answers]);

  const gradeInfo = React.useMemo(() => {
    if (!gradeBuckets.length) return { grade: "N/A", pd: 0.05 };
    return resolveGrade(computed.total, gradeBuckets);
  }, [computed.total, gradeBuckets]);

  const canEditActive = activeEval?.status === "draft" || !activeEval;

  async function loadParams(): Promise<void> {
    setLoading(true);
    setLoadErr(null);

    const [dRes, cRes, oRes, gbRes] = await Promise.all([
      supabase.from("scoring_dimensions").select("id,code,weight").order("id"),
      supabase
        .from("scoring_criteria")
        .select("id,dimension_id,parent_criterion_id,code,label,weight,input_type,aggregation,sort_order")
        .order("dimension_id")
        .order("sort_order", { ascending: true }),
      supabase
        .from("scoring_options")
        .select("id,criterion_id,value_label,score,sort_order")
        .order("criterion_id"),
      supabase.from("scoring_grade_buckets").select("min,max,grade,pd").order("min"),
    ]);

    const err =
      dRes.error?.message ||
      cRes.error?.message ||
      oRes.error?.message ||
      gbRes.error?.message;

    if (err) {
      setLoadErr(err);
      setDimensions([]);
      setCriteria([]);
      setOptions([]);
      setGradeBuckets([]);
      setDomains([]);
      setLoading(false);
      return;
    }

    const d = (dRes.data ?? []) as DimensionRow[];
    const c = (cRes.data ?? []) as CriteriaRow[];
    const o = (oRes.data ?? []) as OptionRow[];
    const gb = (gbRes.data ?? []) as GradeBucket[];

    setDimensions(d);
    setCriteria(c);
    setOptions(o);
    setGradeBuckets(gb);

    setDomains(buildDomains(d, c, o));
    setLoading(false);
  }

  async function loadHistory(): Promise<void> {
    const { data: sets, error: setsErr } = await supabase
      .from("scoring_evaluation_sets")
      .select("id")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (setsErr) {
      setLoadErr(setsErr.message);
      setEvalSetId(null);
      setHistory([]);
      setActiveEval(null);
      return;
    }

    const found = sets?.[0]?.id ?? null;
    setEvalSetId(found);

    if (!found) {
      setHistory([]);
      setActiveEval(null);
      return;
    }

    const { data: evals, error: evalsErr } = await supabase
      .from("scoring_evaluations")
      .select("id,set_id,version,status,answers,results,total_score,grade,pd,created_at,validated_at")
      .eq("set_id", found)
      .order("version", { ascending: false });

    if (evalsErr) {
      setLoadErr(evalsErr.message);
      setHistory([]);
      setActiveEval(null);
      return;
    }

    const list = (evals ?? []) as EvalRow[];
    setHistory(list);
    setActiveEval(list[0] ?? null);
  }

  React.useEffect(() => {
    void (async () => {
      await loadParams();
      await loadHistory();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  function setCritValue(criterionId: number, value: AnswerValue): void {
    setAnswers((prev) => ({
      ...prev,
      [criterionId]: { ...(prev[criterionId] ?? {}), value },
    }));
  }

  function setSubValue(criterionId: number, subId: number, value: AnswerValue): void {
    setAnswers((prev) => {
      const prevEntry = prev[criterionId] ?? {};
      const prevSub = prevEntry.sub ?? {};
      return {
        ...prev,
        [criterionId]: {
          ...prevEntry,
          sub: {
            ...prevSub,
            [subId]: { value },
          },
        },
      };
    });
  }

  async function ensureSet(): Promise<string> {
    if (evalSetId) return evalSetId;

    const { data, error } = await supabase
      .from("scoring_evaluation_sets")
      .insert({ project_id: project.id, name: "Évaluation" })
      .select("id")
      .single();

    if (error) throw error;
    setEvalSetId((data as { id: string }).id);
    return (data as { id: string }).id;
  }

  function startNewEvaluation(): void {
    setActiveEval(null);
    setAnswers({});
  }

  function loadEvaluationIntoForm(ev: EvalRow): void {
    setActiveEval(ev);
    setAnswers(jsonToAnswers(ev.answers));
  }

  async function archiveEvaluation(ev: EvalRow): Promise<void> {
    const ok = confirm(`Archiver la version V${ev.version} ?`);
    if (!ok) return;

    const { error } = await supabase
      .from("scoring_evaluations")
      .update({ status: "archived" })
      .eq("id", ev.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadHistory();
  }

  async function saveEvaluation(validate: boolean): Promise<void> {
    if (!domains.length) return;

    const setId = await ensureSet();
    const nextVersion = (history?.[0]?.version ?? 0) + 1;

    const payload: {
      set_id: string;
      version: number;
      status: EvalStatus;
      answers: Json;
      results: Json;
      total_score: number;
      grade: string;
      pd: number | null; // ✅ FIX: allow null
      validated_at: string | null;
    } = {
      set_id: setId,
      version: nextVersion,
      status: validate ? "validated" : "draft",
      answers: answers as unknown as Json,
      results: {
        total: computed.total,
        domainScores: computed.domainScores,
      },
      total_score: computed.total,
      grade: gradeInfo.grade,
      pd: gradeInfo.pd ?? null, // ✅ FIX
      validated_at: validate ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("scoring_evaluations").insert(payload);
    if (error) {
      alert(error.message);
      return;
    }

    await loadHistory();
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement scoring…</div>;
  }

  if (loadErr) {
    return (
      <div className="rounded-md border p-4">
        <div className="font-medium mb-1">Impossible de charger le référentiel de scoring</div>
        <div className="text-sm text-red-600">{loadErr}</div>
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void (async () => {
                await loadParams();
                await loadHistory();
              })();
            }}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!dimensions.length || !domains.length) {
    return (
      <div className="rounded-md border p-4">
        <div className="font-medium mb-1">Aucun référentiel de scoring trouvé</div>
        <div className="text-sm text-muted-foreground">
          Les tables de paramétrage sont probablement vides (dimensions/critères/options).
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bandeau score */}
      <div className="sticky top-[72px] z-20">
        <Card className="border bg-background/95 backdrop-blur">
          <CardContent className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Total: {(computed.total * 100).toFixed(1)}%</Badge>
              <Badge variant="secondary">Grade: {gradeInfo.grade}</Badge>
              <Badge variant="secondary">PD: {gradeInfo.pd ?? "—"}</Badge>
              {activeEval ? (
                <Badge variant={activeEval.status === "validated" ? "default" : "secondary"}>
                  V{activeEval.version} · {activeEval.status}
                </Badge>
              ) : (
                <Badge variant="secondary">Nouvelle évaluation</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={startNewEvaluation}>
                + Nouvelle évaluation
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={!canEditActive}
                onClick={() => void saveEvaluation(false)}
              >
                Sauver (draft)
              </Button>

              <Button size="sm" disabled={!canEditActive} onClick={() => void saveEvaluation(true)}>
                Valider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saisie par domaines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Saisie par domaine (style V4)</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={dimensions[0]?.code ?? "D1"} className="w-full">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              {dimensions.map((d) => (
                <TabsTrigger key={d.id} value={d.code} className="gap-2">
                  {d.code}
                  <Badge variant="secondary" className="ml-1">
                    {((computed.domainScores?.[d.code] ?? 0) * 100).toFixed(1)}%
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {domains.map((dom) => (
              <TabsContent key={dom.code} value={dom.code} className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Domaine <strong>{dom.code}</strong> (poids {dom.weight})
                  </div>
                  <Badge variant="secondary">
                    Score domaine: {((computed.domainScores?.[dom.code] ?? 0) * 100).toFixed(1)}%
                  </Badge>
                </div>

                <div className="space-y-3">
                  {dom.criteria.map((c) => {
                    const aC = answers[c.id];
                    const hasSubs = Boolean(c.subcriteria?.length);

                    return (
                      <Card key={c.id} className="border-dashed">
                        <CardContent className="py-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium">
                              {c.code}{" "}
                              <span className="text-muted-foreground font-normal">(w {c.weight})</span>
                            </div>

                            {!hasSubs ? (
                              <SelectInput
                                disabled={!canEditActive}
                                inputType={c.input_type}
                                options={c.options}
                                value={aC?.value ?? null}
                                onChange={(v) => setCritValue(c.id, v)}
                              />
                            ) : null}
                          </div>

                          {hasSubs ? (
                            <div className="space-y-2">
                              {c.subcriteria!.map((s) => {
                                const aS = aC?.sub?.[s.id];
                                return (
                                  <div
                                    key={s.id}
                                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="text-sm">
                                      {s.code}{" "}
                                      <span className="text-muted-foreground">(w {s.weight})</span>
                                    </div>
                                    <SelectInput
                                      disabled={!canEditActive}
                                      inputType={s.input_type}
                                      options={s.options}
                                      value={aS?.value ?? null}
                                      onChange={(v) => setSubValue(c.id, s.id, v)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Historique */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique des évaluations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucune évaluation.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {history.map((ev) => (
                  <TableRow key={ev.id} className={activeEval?.id === ev.id ? "bg-muted/40" : ""}>
                    <TableCell>V{ev.version}</TableCell>
                    <TableCell>
                      <Badge variant={ev.status === "validated" ? "default" : "secondary"}>{ev.status}</Badge>
                    </TableCell>
                    <TableCell>{(toNumber(ev.total_score, 0) * 100).toFixed(1)}%</TableCell>
                    <TableCell>{ev.grade ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => loadEvaluationIntoForm(ev)}>
                        Charger
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDetailEvalId(ev.id);
                          setDetailOpen(true);
                        }}
                      >
                        Voir détail
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void archiveEvaluation(ev)}
                        disabled={ev.status === "archived"}
                      >
                        Archiver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Separator />
          <div className="text-xs text-muted-foreground">
            Chaque sauvegarde crée une <strong>nouvelle version</strong>.
          </div>
        </CardContent>
      </Card>

      <ScoringDetailDialog open={detailOpen} onOpenChange={setDetailOpen} evaluationId={detailEvalId} />
    </div>
  );
}

/** Input compact */
function SelectInput(props: {
  disabled?: boolean;
  inputType: InputType;
  options?: DomainOption[];
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  const { disabled, inputType, options, value, onChange } = props;

  if (inputType === "select" || inputType === "yesno") {
    return (
      <select
        className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
        disabled={disabled}
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      >
        <option value="">— Choisir —</option>
        {(options ?? []).map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.value_label}
          </option>
        ))}
      </select>
    );
  }

  if (inputType === "number" || inputType === "range") {
    return (
      <input
        className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
        disabled={disabled}
        type="number"
        step="0.01"
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        placeholder="0..1"
      />
    );
  }

  return (
    <input
      className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
      disabled={disabled}
      value={value == null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Texte"
    />
  );
}

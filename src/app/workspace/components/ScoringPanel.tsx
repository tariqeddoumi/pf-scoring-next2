"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  computeScores,
  resolveGrade,
  type Domain,
  type Answers,
  type AnswerValue,
  type GradeBucket,
  type InputType,
  type Aggregation,
} from "@/lib/scoring";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import type { ProjectRow } from "../types";
import ScoringDetailDialog from "./ScoringCompareDialog";

/** -----------------------------
 * DB rows (adaptés à ta base)
 * ----------------------------- */

type DimensionRow = {
  id: number;
  code: string;
  weight: number;
  sort_order: number;
  active: boolean;
};

type CriteriaRow = {
  id: number;
  dimension_id: number;
  code: string;
  label: string;
  weight: number;
  input_type: InputType;
  aggregation: Aggregation;
  sort_order: number;
  active: boolean;
  parent_criterion_id: number | null;
};

type SubcriterionCompatRow = {
  criterion_id: number;
  subcriterion_id: number;
  code: string;
  label: string;
  description: string | null;
  weight: number;
  input_type: InputType;
  sort_order: number;
  active: boolean;
};

type OptionCompatRow = {
  id: number;
  // IMPORTANT: chez toi la vue expose criterion_id (owner_kind = "subcriterion" => criterion_id = subcriterion_id)
  criterion_id: number | null;
  value_label: string;
  score: number;
  sort_order: number;
  active: boolean;

  owner_kind: string;
  owner_id: number;
  value_code: string;
};

type GradeBucketRow = {
  id: number;
  model_name: string;
  min_score: number;
  max_score: number;
  grade: string;
  pd: number;
  sort_order: number;
};

type EvalRow = {
  id: string;
  set_id: string;
  version: number;
  status: "draft" | "validated" | "archived";
  answers: Record<string, unknown>;
  results: Record<string, unknown>;
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
  validated_at: string | null;
};

function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildDomains(params: {
  dimensions: DimensionRow[];
  criteria: CriteriaRow[];
  subcriteria: SubcriterionCompatRow[];
  options: OptionCompatRow[];
}): Domain[] {
  const { dimensions, criteria, subcriteria, options } = params;

  const dims = dimensions
    .filter((d) => d.active)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Critères racines (parent_criterion_id null) groupés par dimension
  const rootsByDim = new Map<number, CriteriaRow[]>();
  for (const c of criteria) {
    if (!c.active) continue;
    if (c.parent_criterion_id != null) continue;
    const arr = rootsByDim.get(c.dimension_id) ?? [];
    arr.push(c);
    rootsByDim.set(c.dimension_id, arr);
  }
  for (const [k, arr] of rootsByDim.entries()) {
    arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    rootsByDim.set(k, arr);
  }

  // Sous-critères groupés par critère parent
  const subsByCrit = new Map<number, SubcriterionCompatRow[]>();
  for (const s of subcriteria) {
    if (!s.active) continue;
    const arr = subsByCrit.get(s.criterion_id) ?? [];
    arr.push(s);
    subsByCrit.set(s.criterion_id, arr);
  }
  for (const [k, arr] of subsByCrit.entries()) {
    arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    subsByCrit.set(k, arr);
  }

  // Options groupées par "criterion_id" de la vue compat
  // (critère leaf => criterion_id = crit.id ; sous-critère => criterion_id = subcriterion_id)
  const optsByOwner = new Map<number, OptionCompatRow[]>();
  for (const o of options) {
    if (!o.active) continue;
    if (o.criterion_id == null) continue;
    const arr = optsByOwner.get(o.criterion_id) ?? [];
    arr.push(o);
    optsByOwner.set(o.criterion_id, arr);
  }
  for (const [k, arr] of optsByOwner.entries()) {
    arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    optsByOwner.set(k, arr);
  }

  // Build Domain[] conforme à lib/scoring.ts
  return dims.map((d) => {
    const roots = rootsByDim.get(d.id) ?? [];

    return {
      id: d.id,
      code: d.code,
      weight: safeNum(d.weight, 0),
      criteria: roots.map((r) => {
        const subs = subsByCrit.get(r.id) ?? [];
        const hasSubs = subs.length > 0;

        return {
          id: r.id,
          code: r.code,
          weight: safeNum(r.weight, 0),
          input_type: r.input_type,
          aggregation: r.aggregation,
          options: hasSubs
            ? undefined
            : (optsByOwner.get(r.id) ?? []).map((o) => ({
                id: o.id,
                value_label: o.value_label,
                score: safeNum(o.score, 0),
              })),
          subcriteria: hasSubs
            ? subs.map((s) => ({
                id: s.subcriterion_id,
                code: s.code,
                weight: safeNum(s.weight, 0),
                input_type: s.input_type,
                options: (optsByOwner.get(s.subcriterion_id) ?? []).map((o) => ({
                  id: o.id,
                  value_label: o.value_label,
                  score: safeNum(o.score, 0),
                })),
              }))
            : undefined,
        };
      }),
    };
  });
}

function mapGradeBuckets(rows: GradeBucketRow[]): GradeBucket[] {
  // ta lib/scoring.ts attend {min,max,grade,pd}
  return (rows ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((r) => ({
      grade: r.grade,
      min: safeNum(r.min_score, 0),
      max: safeNum(r.max_score, 1),
      pd: safeNum(r.pd, 0),
    }));
}

export default function ScoringPanel({ project }: { project: ProjectRow }) {
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [dimensions, setDimensions] = React.useState<DimensionRow[]>([]);
  const [criteria, setCriteria] = React.useState<CriteriaRow[]>([]);
  const [subcriteria, setSubcriteria] = React.useState<SubcriterionCompatRow[]>([]);
  const [options, setOptions] = React.useState<OptionCompatRow[]>([]);
  const [gradeBuckets, setGradeBuckets] = React.useState<GradeBucket[]>([]);

  const [domains, setDomains] = React.useState<Domain[]>([]);
  const [answers, setAnswers] = React.useState<Answers>({});

  // Historique/versionning
  const [evalSetId, setEvalSetId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<EvalRow[]>([]);
  const [activeEval, setActiveEval] = React.useState<EvalRow | null>(null);

  // "Modifier" = copier une ancienne version et produire V+1
  const [editingFrom, setEditingFrom] = React.useState<string | null>(null);

  // Détail
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailEvalId, setDetailEvalId] = React.useState<string | null>(null);

  const computed = React.useMemo(() => {
    if (!domains.length) return { total: 0, domainScores: {} as Record<string, number> };
    return computeScores(domains, answers);
  }, [domains, answers]);

  const gradeInfo = React.useMemo(() => {
    const r = resolveGrade(computed.total, gradeBuckets);
    return {
      grade: r.grade ?? "N/A",
      pd: r.pd,
    };
  }, [computed.total, gradeBuckets]);

  async function loadParams() {
    setLoading(true);
    setLoadError(null);

    const [
      { data: d, error: ed },
      { data: c, error: ec },
      { data: sc, error: esc },
      { data: o, error: eo },
      { data: gb, error: egb },
    ] = await Promise.all([
      supabase.from("scoring_dimensions").select("id,code,weight,sort_order,active").order("sort_order", { ascending: true }),
      supabase
        .from("scoring_criteria")
        .select("id,dimension_id,code,label,weight,input_type,aggregation,sort_order,active,parent_criterion_id")
        .order("dimension_id", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("v_scoring_subcriteria_compat")
        .select("criterion_id,subcriterion_id,code,label,description,weight,input_type,sort_order,active")
        .order("criterion_id", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("v_scoring_options_compat")
        .select("id,criterion_id,value_label,score,sort_order,active,owner_kind,owner_id,value_code")
        .eq("active", true)
        .order("criterion_id", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("scoring_grade_buckets")
        .select("id,model_name,min_score,max_score,grade,pd,sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    const firstErr = ed?.message || ec?.message || esc?.message || eo?.message || egb?.message;
    if (firstErr) {
      setLoadError(firstErr);
      setLoading(false);
      return;
    }

    const dims = (d ?? []) as DimensionRow[];
    const crit = (c ?? []) as CriteriaRow[];
    const subs = (sc ?? []) as SubcriterionCompatRow[];
    const opts = (o ?? []) as OptionCompatRow[];
    const buckets = mapGradeBuckets((gb ?? []) as GradeBucketRow[]);

    setDimensions(dims);
    setCriteria(crit);
    setSubcriteria(subs);
    setOptions(opts);
    setGradeBuckets(buckets);

    const built = buildDomains({ dimensions: dims, criteria: crit, subcriteria: subs, options: opts });
    setDomains(built);

    setLoading(false);
  }

  async function loadHistory() {
    // on récupère (ou pas) le set du projet
    const { data: sets, error: esets } = await supabase
      .from("scoring_evaluation_sets")
      .select("id,project_id,name,created_at,updated_at")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (esets) {
      console.error(esets);
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

    const { data: evals, error: eevals } = await supabase
      .from("scoring_evaluations")
      .select("id,set_id,version,status,answers,results,total_score,grade,pd,created_at,validated_at")
      .eq("set_id", found)
      .order("version", { ascending: false });

    if (eevals) {
      console.error(eevals);
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
      // par défaut: nouvelle évaluation
      setEditingFrom(null);
      setAnswers({});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  function newEvaluation() {
    setEditingFrom(null);
    setAnswers({});
  }

  function loadEvaluationIntoForm(ev: EvalRow) {
    setActiveEval(ev);
    setEditingFrom(ev.id);
    setAnswers((ev.answers ?? {}) as unknown as Answers);
  }

  async function ensureSet(): Promise<string> {
    if (evalSetId) return evalSetId;

    const { data, error } = await supabase
      .from("scoring_evaluation_sets")
      .insert({ project_id: project.id, name: "Évaluation" })
      .select("id")
      .single();

    if (error) throw error;
    setEvalSetId(data.id);
    return data.id;
  }

  async function saveEvaluation(validate: boolean) {
    const setId = await ensureSet();
    const nextVersion = (history?.[0]?.version ?? 0) + 1;

    const payload = {
      set_id: setId,
      version: nextVersion,
      status: validate ? "validated" : "draft",
      answers: answers as any,
      results: {
        total: computed.total,
        domainScores: computed.domainScores,
        editing_from: editingFrom,
      },
      total_score: computed.total,
      grade: gradeInfo.grade,
      pd: gradeInfo.pd,
      validated_at: validate ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("scoring_evaluations").insert(payload);
    if (error) throw error;

    await loadHistory();
    setEditingFrom(null);
  }

  async function archiveEvaluation(evId: string) {
    const ok = confirm("Archiver cette évaluation ? (elle restera visible dans l’historique)");
    if (!ok) return;

    const { error } = await supabase.from("scoring_evaluations").update({ status: "archived" }).eq("id", evId);
    if (error) throw error;

    await loadHistory();
  }

  async function deleteEvaluation(ev: EvalRow) {
    const ok = confirm(
      ev.status === "validated"
        ? "Supprimer une évaluation VALIDÉE ? (à éviter en production)"
        : "Supprimer cette évaluation ?"
    );
    if (!ok) return;

    const { error } = await supabase.from("scoring_evaluations").delete().eq("id", ev.id);
    if (error) throw error;

    if (activeEval?.id === ev.id) {
      setEditingFrom(null);
      setAnswers({});
      setActiveEval(null);
    }

    await loadHistory();
  }

  function setCritValue(criterionId: number, value: AnswerValue | undefined) {
    setAnswers((prev) => {
      const next: Answers = { ...prev };
      const cur = next[criterionId] ?? {};
      next[criterionId] = { ...cur, value };
      return next;
    });
  }

  function setSubValue(criterionId: number, subId: number, value: AnswerValue | undefined) {
    setAnswers((prev) => {
      const next: Answers = { ...prev };
      const cur = next[criterionId] ?? {};
      const sub = { ...(cur.sub ?? {}) };
      sub[subId] = { value };
      next[criterionId] = { ...cur, sub };
      return next;
    });
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement scoring…</div>;
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Impossible de charger le référentiel de scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-red-600">{loadError}</div>
          <Button variant="outline" size="sm" onClick={() => void loadParams()}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const firstTab = dimensions.find((d) => d.active)?.code ?? "D1";

  return (
    <div className="space-y-3">
      {/* Header sticky */}
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
                <Badge variant="secondary">Aucune version</Badge>
              )}

              {editingFrom ? (
                <Badge variant="secondary">Mode: modification → V+1</Badge>
              ) : (
                <Badge variant="secondary">Mode: nouvelle évaluation</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={newEvaluation}>
                Nouvelle évaluation
              </Button>

              <Button variant="outline" size="sm" onClick={() => setAnswers({})}>
                Vider la saisie
              </Button>

              <Button variant="secondary" size="sm" onClick={() => void saveEvaluation(false)}>
                Sauver (draft)
              </Button>

              <Button size="sm" onClick={() => void saveEvaluation(true)}>
                Valider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saisie par domaines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Saisie par domaine</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={firstTab} className="w-full">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              {dimensions
                .filter((d) => d.active)
                .map((d) => (
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
                    const hasSubs = (c.subcriteria?.length ?? 0) > 0;

                    return (
                      <Card key={c.id} className="border-dashed">
                        <CardContent className="py-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium">
                              {c.code} <span className="text-muted-foreground font-normal">(w {c.weight})</span>
                            </div>

                            {!hasSubs && (
                              <SelectInput
                                inputType={c.input_type}
                                options={c.options}
                                value={aC?.value}
                                onChange={(v) => setCritValue(c.id, v)}
                              />
                            )}
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
                                      {s.code} <span className="text-muted-foreground">(w {s.weight})</span>
                                    </div>

                                    <SelectInput
                                      inputType={s.input_type}
                                      options={s.options}
                                      value={aS?.value}
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
                    <TableCell>{(safeNum(ev.total_score, 0) * 100).toFixed(1)}%</TableCell>
                    <TableCell>{ev.grade ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => loadEvaluationIntoForm(ev)}>
                        Modifier (V+1)
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
                        variant="outline"
                        onClick={() => void archiveEvaluation(ev.id)}
                        disabled={ev.status === "archived"}
                      >
                        Archiver
                      </Button>

                      <Button size="sm" variant="destructive" onClick={() => void deleteEvaluation(ev)}>
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Separator />

          <div className="text-xs text-muted-foreground">
            ✔️ “Modifier (V+1)” charge une ancienne version, puis <strong>Sauver</strong> / <strong>Valider</strong> crée
            une <strong>nouvelle version</strong> (audit-friendly).
          </div>
        </CardContent>
      </Card>

      {/* Modal détail */}
      <ScoringDetailDialog open={detailOpen} onOpenChange={setDetailOpen} evaluationId={detailEvalId} />
    </div>
  );
}

/** Input compact */
function SelectInput(props: {
  inputType: InputType;
  options?: Array<{ id: number; value_label: string; score: number }>;
  value?: AnswerValue;
  onChange: (v: AnswerValue | undefined) => void;
}) {
  const { inputType, options, value, onChange } = props;

  if (inputType === "select" || inputType === "yesno") {
    return (
      <select
        className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
        value={value == null ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return onChange(undefined);

          // l’UI stocke l’optionId (number), compatible avec findOptionScore()
          const asN = Number(v);
          onChange(Number.isFinite(asN) ? asN : v);
        }}
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
        type="number"
        step="0.01"
        min="0"
        max="1"
        value={value == null ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) return onChange(undefined);
          const n = Number(v);
          onChange(Number.isFinite(n) ? n : undefined);
        }}
        placeholder="0..1"
      />
    );
  }

  return (
    <input
      className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
      value={value == null ? "" : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v ? v : undefined);
      }}
      placeholder="Texte"
    />
  );
}

// src/app/workspace/components/ScoringPanel.tsx
"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  computeScores,
  resolveGrade,
  type Answers,
  type Domain,
  type GradeBucket,
  type InputType,
  type Aggregation,
  type ScoringOption,
} from "@/lib/scoring";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ProjectRow } from "../types";
import EvaluationCompareDialog from "./ScoringCompareDialog";

/** ===== DB types (strict, no any) ===== */
type DimensionRow = { id: number; code: string; weight: number };

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
  answers: Answers;
  results: {
    total: number;
    domainScores: Record<string, number>;
  } | null;
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
  validated_at: string | null;
};

/** ===== Detail modal types (strict) ===== */
type DetailSub = {
  id: number;
  code: string;
  weight: number;
  input_type: InputType;
  selectedLabel: string;
  score: number;
};
type DetailCrit = {
  id: number;
  code: string;
  weight: number;
  input_type: InputType;
  aggregation: Aggregation;
  selectedLabel: string;
  score: number;
  subs?: DetailSub[];
};
type DetailDomain = {
  id: number;
  code: string;
  weight: number;
  score: number;
  criteria: DetailCrit[];
};
type EvaluationDetail = {
  total: number;
  domainScores: Record<string, number>;
  domains: DetailDomain[];
};

function fmtPct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function sortByOrder<T extends { sort_order: number | null }>(arr: T[]): T[] {
  return arr
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

function buildDomains(
  dimensions: DimensionRow[],
  criteria: CriteriaRow[],
  options: OptionRow[]
): Domain[] {
  const optsByCrit = new Map<number, OptionRow[]>();
  for (const o of options) {
    const list = optsByCrit.get(o.criterion_id) ?? [];
    list.push(o);
    optsByCrit.set(o.criterion_id, list);
  }

  const rootsByDim = new Map<number, CriteriaRow[]>();
  const childrenByParent = new Map<number, CriteriaRow[]>();

  for (const c of criteria) {
    if (c.parent_criterion_id == null) {
      const list = rootsByDim.get(c.dimension_id) ?? [];
      list.push(c);
      rootsByDim.set(c.dimension_id, list);
    } else {
      const list = childrenByParent.get(c.parent_criterion_id) ?? [];
      list.push(c);
      childrenByParent.set(c.parent_criterion_id, list);
    }
  }

  const toOptions = (criterionId: number): ScoringOption[] => {
    const list = sortByOrder(optsByCrit.get(criterionId) ?? []);
    return list.map((o) => ({
      id: o.id,
      value_label: o.value_label,
      score: Number(o.score),
    }));
  };

  const dims = dimensions.slice().sort((a, b) => a.id - b.id);

  return dims.map((d) => {
    const roots = sortByOrder(rootsByDim.get(d.id) ?? []);

    const mappedCriteria = roots.map((root) => {
      const children = sortByOrder(childrenByParent.get(root.id) ?? []);

      return {
        id: root.id,
        code: root.code,
        weight: Number(root.weight),
        input_type: root.input_type,
        aggregation: root.aggregation,
        options: toOptions(root.id),
        subcriteria:
          children.length > 0
            ? children.map((ch) => ({
                id: ch.id,
                code: ch.code,
                weight: Number(ch.weight),
                input_type: ch.input_type,
                options: toOptions(ch.id),
              }))
            : undefined,
      };
    });

    return {
      id: d.id,
      code: d.code,
      weight: Number(d.weight),
      criteria: mappedCriteria,
    };
  });
}

/** label choisi + score pour un leaf */
function getLeafSelectedLabelAndScore(
  inputType: InputType,
  options: ScoringOption[] | undefined,
  rawValue: unknown
): { label: string; score: number } {
  if ((inputType === "select" || inputType === "yesno") && options) {
    const v =
      typeof rawValue === "string" || typeof rawValue === "number"
        ? String(rawValue)
        : "";
    if (!v) return { label: "—", score: 0 };

    // v peut être option.id en string
    const optById = options.find((o) => String(o.id) === v);
    if (optById) return { label: optById.value_label, score: optById.score };

    // fallback par label
    const optByLabel = options.find((o) => o.value_label === v);
    if (optByLabel) return { label: optByLabel.value_label, score: optByLabel.score };

    return { label: v, score: 0 };
  }

  if (inputType === "number" || inputType === "range") {
    const n =
      typeof rawValue === "number"
        ? rawValue
        : typeof rawValue === "string" && rawValue.trim()
        ? Number(rawValue.replace(",", "."))
        : NaN;
    if (!Number.isFinite(n)) return { label: "—", score: 0 };
    return { label: String(n), score: n };
  }

  if (inputType === "text") {
    const t = typeof rawValue === "string" ? rawValue : "";
    return { label: t || "—", score: 0 };
  }

  return { label: "—", score: 0 };
}

function buildDetail(domains: Domain[], answers: Answers): EvaluationDetail {
  const computed = computeScores(domains, answers);

  // On calcule "score critère" avec la même fonction computeScores, mais on veut un détail lisible
  const detailDomains: DetailDomain[] = domains.map((d) => {
    const dScore = computed.domainScores[d.code] ?? 0;

    const criteria: DetailCrit[] = d.criteria.map((c) => {
      const aC = answers[c.id];
      const hasSubs = !!c.subcriteria?.length;

      if (!hasSubs) {
        const leaf = getLeafSelectedLabelAndScore(
          c.input_type,
          c.options,
          aC?.value
        );
        const cScore = computed.criterionScores?.[c.id] ?? leaf.score ?? 0;
        return {
          id: c.id,
          code: c.code,
          weight: c.weight,
          input_type: c.input_type,
          aggregation: c.aggregation,
          selectedLabel: leaf.label,
          score: cScore,
        };
      }

      const subs: DetailSub[] =
        c.subcriteria?.map((s) => {
          const aS = aC?.sub?.[s.id];
          const leaf = getLeafSelectedLabelAndScore(
            s.input_type,
            s.options,
            aS?.value
          );
          const sScore = computed.subScores?.[s.id] ?? leaf.score ?? 0;
          return {
            id: s.id,
            code: s.code,
            weight: s.weight,
            input_type: s.input_type,
            selectedLabel: leaf.label,
            score: sScore,
          };
        }) ?? [];

      const cScore = computed.criterionScores?.[c.id] ?? 0;

      return {
        id: c.id,
        code: c.code,
        weight: c.weight,
        input_type: c.input_type,
        aggregation: c.aggregation,
        selectedLabel: "—",
        score: cScore,
        subs,
      };
    });

    return {
      id: d.id,
      code: d.code,
      weight: d.weight,
      score: dScore,
      criteria,
    };
  });

  return {
    total: computed.total,
    domainScores: computed.domainScores,
    domains: detailDomains,
  };
}

/** ===== Component ===== */
export default function ScoringPanel({ project }: { project: ProjectRow }) {
  const [loading, setLoading] = React.useState(true);

  // paramètres scoring
  const [dimensions, setDimensions] = React.useState<DimensionRow[]>([]);
  const [criteriaRows, setCriteriaRows] = React.useState<CriteriaRow[]>([]);
  const [optionRows, setOptionRows] = React.useState<OptionRow[]>([]);
  const [gradeBuckets, setGradeBuckets] = React.useState<GradeBucket[]>([]);

  const [domains, setDomains] = React.useState<Domain[]>([]);
  const [answers, setAnswers] = React.useState<Answers>({});

  // Historique
  const [evalSetId, setEvalSetId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<EvalRow[]>([]);
  const [activeEval, setActiveEval] = React.useState<EvalRow | null>(null);

  // Compare
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareA, setCompareA] = React.useState<string | null>(null);
  const [compareB, setCompareB] = React.useState<string | null>(null);

  // Voir détail
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailTitle, setDetailTitle] = React.useState<string>("Détail");
  const [detailData, setDetailData] = React.useState<EvaluationDetail | null>(null);

  const computed = React.useMemo(() => {
    if (!domains.length) return computeScores([], {});
    return computeScores(domains, answers);
  }, [domains, answers]);

  const gradeInfo = React.useMemo(() => {
    if (!gradeBuckets.length) return { grade: "N/A", pd: null as number | null };
    return resolveGrade(computed.total, gradeBuckets);
  }, [computed.total, gradeBuckets]);

  const loadParams = React.useCallback(async () => {
    setLoading(true);

    const [dRes, cRes, oRes, gRes] = await Promise.all([
      supabase.from("scoring_dimensions").select("id,code,weight").order("id"),
      supabase
        .from("scoring_criteria")
        .select(
          "id,dimension_id,parent_criterion_id,code,label,weight,input_type,aggregation,sort_order"
        )
        .order("dimension_id")
        .order("sort_order", { ascending: true }),
      supabase
        .from("scoring_options")
        .select("id,criterion_id,value_label,score,sort_order")
        .order("criterion_id"),
      supabase.from("scoring_grade_buckets").select("grade,min,max,pd").order("min"),
    ]);

    setDimensions((dRes.data ?? []) as DimensionRow[]);
    setCriteriaRows((cRes.data ?? []) as CriteriaRow[]);
    setOptionRows((oRes.data ?? []) as OptionRow[]);
    setGradeBuckets((gRes.data ?? []) as GradeBucket[]);

    const built = buildDomains(
      (dRes.data ?? []) as DimensionRow[],
      (cRes.data ?? []) as CriteriaRow[],
      (oRes.data ?? []) as OptionRow[]
    );
    setDomains(built);

    setLoading(false);
  }, []);

  const loadHistory = React.useCallback(async () => {
    // 1) set_id du projet
    const { data: sets, error: setErr } = await supabase
      .from("scoring_evaluation_sets")
      .select("id,project_id,name,created_at,updated_at")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (setErr) {
      // ne bloque pas l’UI
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

    const { data: evals, error: evErr } = await supabase
      .from("scoring_evaluations")
      .select(
        "id,set_id,version,status,answers,results,total_score,grade,pd,created_at,validated_at"
      )
      .eq("set_id", found)
      .order("version", { ascending: false });

    if (evErr) {
      setHistory([]);
      setActiveEval(null);
      return;
    }

    const list = (evals ?? []) as EvalRow[];
    setHistory(list);
    setActiveEval(list[0] ?? null);
  }, [project.id]);

  React.useEffect(() => {
    void (async () => {
      await loadParams();
      await loadHistory();
    })();
  }, [loadParams, loadHistory]);

  const setCritValue = React.useCallback((criterionId: number, value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [criterionId]: { ...(prev[criterionId] ?? {}), value },
    }));
  }, []);

  const setSubValue = React.useCallback(
    (criterionId: number, subId: number, value: unknown) => {
      setAnswers((prev) => ({
        ...prev,
        [criterionId]: {
          ...(prev[criterionId] ?? {}),
          sub: {
            ...(prev[criterionId]?.sub ?? {}),
            [subId]: { value },
          },
        },
      }));
    },
    []
  );

  const ensureSet = React.useCallback(async (): Promise<string> => {
    if (evalSetId) return evalSetId;

    const { data, error } = await supabase
      .from("scoring_evaluation_sets")
      .insert({ project_id: project.id, name: "Évaluation" })
      .select("id")
      .single();

    if (error) throw error;
    setEvalSetId(data.id);
    return data.id;
  }, [evalSetId, project.id]);

  async function saveEvaluation(validate: boolean) {
    const setId = await ensureSet();

    // versioning append-only
    const version = (history?.[0]?.version ?? 0) + 1;

    const payload: Omit<EvalRow, "id" | "created_at"> & { id?: string; created_at?: string } = {
      set_id: setId,
      version,
      status: validate ? "validated" : "draft",
      answers,
      results: {
        total: computed.total,
        domainScores: computed.domainScores,
      },
      total_score: computed.total,
      grade: gradeInfo.grade,
      pd: gradeInfo.pd,
      validated_at: validate ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("scoring_evaluations").insert(payload);
    if (error) throw error;

    await loadHistory();
  }

  function loadEvaluationIntoForm(ev: EvalRow) {
    setActiveEval(ev);
    setAnswers(ev.answers ?? {});
  }

  async function deleteSet() {
    if (!evalSetId) return;

    const ok = confirm("Supprimer TOUT l’historique de scoring de ce projet ?");
    if (!ok) return;

    const { error } = await supabase.rpc("fn_scoring_eval_delete", {
      p_set_id: evalSetId,
    });
    if (error) throw error;

    setEvalSetId(null);
    setHistory([]);
    setActiveEval(null);
    setAnswers({});
  }

  function openDetailForCurrent() {
    const data = buildDetail(domains, answers);
    setDetailTitle(
      activeEval ? `Détail — V${activeEval.version} · ${activeEval.status}` : "Détail — saisie en cours"
    );
    setDetailData(data);
    setDetailOpen(true);
  }

  function openDetailForHistory(ev: EvalRow) {
    const data = buildDetail(domains, ev.answers ?? {});
    setDetailTitle(`Détail — V${ev.version} · ${ev.status}`);
    setDetailData(data);
    setDetailOpen(true);
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Chargement scoring…</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sticky score header */}
      <div className="sticky top-[72px] z-20">
        <Card className="border bg-background/95 backdrop-blur">
          <CardContent className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Total: {fmtPct(computed.total)}</Badge>
              <Badge variant="secondary">Grade: {gradeInfo.grade}</Badge>
              <Badge variant="secondary">PD: {gradeInfo.pd ?? "—"}</Badge>

              {activeEval && (
                <Badge
                  variant={activeEval.status === "validated" ? "default" : "secondary"}
                >
                  V{activeEval.version} · {activeEval.status}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAnswers({})}>
                Réinitialiser
              </Button>
              <Button variant="outline" size="sm" onClick={openDetailForCurrent}>
                Voir détail
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void saveEvaluation(false)}
              >
                Sauver (draft)
              </Button>
              <Button size="sm" onClick={() => void saveEvaluation(true)}>
                Valider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs domaines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Saisie par domaine (style V4, ultra compact)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue={dimensions?.[0]?.code ?? "D1"}
            className="w-full"
          >
            <TabsList className="flex flex-wrap gap-1 h-auto">
              {dimensions.map((d) => (
                <TabsTrigger key={d.id} value={d.code} className="gap-2">
                  {d.code}
                  <Badge variant="secondary" className="ml-1">
                    {fmtPct(computed.domainScores?.[d.code] ?? 0)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {domains.map((dom) => (
              <TabsContent
                key={dom.code}
                value={dom.code}
                className="mt-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Domaine <strong>{dom.code}</strong> (poids {dom.weight})
                  </div>
                  <Badge variant="secondary">
                    Score domaine: {fmtPct(computed.domainScores?.[dom.code] ?? 0)}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {dom.criteria.map((c) => {
                    const aC = answers[c.id];
                    const hasSubs = !!c.subcriteria?.length;

                    return (
                      <Card key={c.id} className="border-dashed">
                        <CardContent className="py-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium">
                              {c.code}{" "}
                              <span className="text-muted-foreground font-normal">
                                (w {c.weight})
                              </span>
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
                              {c.subcriteria?.map((s) => {
                                const aS = aC?.sub?.[s.id];
                                return (
                                  <div
                                    key={s.id}
                                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="text-sm">
                                      {s.code}{" "}
                                      <span className="text-muted-foreground">
                                        (w {s.weight})
                                      </span>
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

      {/* Historique + opérations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique & opérations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => void deleteSet()} disabled={!evalSetId}>
              Supprimer l’historique
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCompareOpen(true)}
              disabled={history.length < 2}
            >
              Comparaison A/B
            </Button>
          </div>

          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucune évaluation enregistrée.
            </div>
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
                  <TableRow
                    key={ev.id}
                    className={activeEval?.id === ev.id ? "bg-muted/40" : ""}
                  >
                    <TableCell>V{ev.version}</TableCell>
                    <TableCell>
                      <Badge
                        variant={ev.status === "validated" ? "default" : "secondary"}
                      >
                        {ev.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtPct(Number(ev.total_score))}</TableCell>
                    <TableCell>{ev.grade ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => loadEvaluationIntoForm(ev)}>
                        Charger
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openDetailForHistory(ev)}>
                        Voir détail
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          // choisir A puis B
                          setCompareA((prev) => prev ?? ev.id);
                          if (compareA && compareA !== ev.id) setCompareB(ev.id);
                          setCompareOpen(true);
                        }}
                      >
                        A/B
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Separator />

          <div className="text-xs text-muted-foreground">
            Règle : chaque sauvegarde crée une <strong>nouvelle version</strong>.
            On ne modifie jamais une version passée.
          </div>
        </CardContent>
      </Card>

      {/* Compare dialog */}
      <EvaluationCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        evaluations={history}
        defaultA={compareA ?? history?.[0]?.id ?? null}
        defaultB={compareB ?? history?.[1]?.id ?? null}
      />

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{detailTitle}</DialogTitle>
          </DialogHeader>

          {!detailData ? (
            <div className="text-sm text-muted-foreground">Aucun détail.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Total: {fmtPct(detailData.total)}</Badge>
                {Object.entries(detailData.domainScores).map(([k, v]) => (
                  <Badge key={k} variant="secondary">
                    {k}: {fmtPct(v)}
                  </Badge>
                ))}
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-auto pr-2">
                {detailData.domains.map((d) => (
                  <Card key={d.code} className="border">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">
                        {d.code} — score {fmtPct(d.score)} (w {d.weight})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {d.criteria.map((c) => (
                        <div key={c.id} className="rounded-md border p-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="font-medium">
                              {c.code}{" "}
                              <span className="text-muted-foreground font-normal">
                                (w {c.weight}) · score {fmtPct(c.score)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {c.subs?.length ? `Agg: ${c.aggregation}` : c.selectedLabel}
                            </div>
                          </div>

                          {c.subs?.length ? (
                            <div className="mt-3 grid gap-2">
                              {c.subs.map((s) => (
                                <div
                                  key={s.id}
                                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border rounded-md px-3 py-2"
                                >
                                  <div className="text-sm">
                                    {s.code}{" "}
                                    <span className="text-muted-foreground">
                                      (w {s.weight}) · score {fmtPct(s.score)}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {s.selectedLabel}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Input compact : select/yesno/number/range/text */
function SelectInput({
  inputType,
  options,
  value,
  onChange,
}: {
  inputType: InputType;
  options?: ScoringOption[];
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (inputType === "select" || inputType === "yesno") {
    return (
      <select
        className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
        value={
          typeof value === "string" || typeof value === "number"
            ? String(value)
            : ""
        }
        onChange={(e) => onChange(e.target.value)}
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
        value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0..1"
      />
    );
  }

  return (
    <input
      className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Texte"
    />
  );
}

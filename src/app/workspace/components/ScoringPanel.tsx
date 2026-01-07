"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";
import { computeScores, resolveGrade } from "@/lib/scoring";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import type { ProjectRow } from "../types";
import EvaluationCompareDialog from "./ScoringCompareDialog";

type DimensionRow = { id: number; code: string; weight: number };
type CriteriaRow = {
  id: number;
  dimension_id: number;
  parent_criterion_id: number | null; // null => critère racine, sinon sous-critère
  code: string;
  label: string | null;
  weight: number;
  input_type: "select" | "yesno" | "number" | "text" | "range";
  aggregation: "sum" | "avg" | "max" | "min";
  sort_order: number | null;
};

type OptionRow = { id: number; criterion_id: number; value_label: string; score: number; sort_order: number | null };

type EvalRow = {
  id: string;
  set_id: string;
  version: number;
  status: "draft" | "validated" | "archived";
  answers: any;   // JSONB
  results: any;   // JSONB
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
  validated_at: string | null;
};

type Answers =
  Record<number, { value?: any; sub?: Record<number, { value?: any }> }>;

function buildDomains(dimensions: DimensionRow[], criteria: CriteriaRow[], options: OptionRow[]) {
  // Convertit les tables DB en structure Domain[] attendue par computeScores()
  const byDim = new Map<number, DimensionRow>();
  dimensions.forEach(d => byDim.set(d.id, d));

  const optsByCrit = new Map<number, OptionRow[]>();
  options.forEach(o => {
    const arr = optsByCrit.get(o.criterion_id) ?? [];
    arr.push(o);
    optsByCrit.set(o.criterion_id, arr);
  });

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

  const domains = dimensions
    .slice()
    .sort((a, b) => a.id - b.id)
    .map(d => {
      const roots = (rootsByDim.get(d.id) ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const criteriaStruct = roots.map(root => {
        const children = (childrenByParent.get(root.id) ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return {
          id: root.id,
          code: root.code,
          weight: Number(root.weight),
          input_type: root.input_type,
          aggregation: root.aggregation,
          options: (optsByCrit.get(root.id) ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(o => ({ id: o.id, value_label: o.value_label, score: Number(o.score) })),
          subcriteria: children.length
            ? children.map(ch => ({
                id: ch.id,
                code: ch.code,
                weight: Number(ch.weight),
                input_type: ch.input_type,
                options: (optsByCrit.get(ch.id) ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map(o => ({ id: o.id, value_label: o.value_label, score: Number(o.score) })),
              }))
            : undefined,
        };
      });

      return {
        id: d.id,
        code: d.code,
        weight: Number(d.weight),
        criteria: criteriaStruct,
      };
    });

  return domains;
}

export default function ScoringPanel({ project }: { project: ProjectRow }) {
  const [loading, setLoading] = React.useState(true);

  const [dimensions, setDimensions] = React.useState<DimensionRow[]>([]);
  const [criteria, setCriteria] = React.useState<CriteriaRow[]>([]);
  const [options, setOptions] = React.useState<OptionRow[]>([]);
  const [gradeBuckets, setGradeBuckets] = React.useState<any[]>([]);

  const [domains, setDomains] = React.useState<any[]>([]);
  const [answers, setAnswers] = React.useState<Answers>({});

  // Historique
  const [evalSetId, setEvalSetId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<EvalRow[]>([]);
  const [activeEval, setActiveEval] = React.useState<EvalRow | null>(null);

  // Compare
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareA, setCompareA] = React.useState<string | null>(null);
  const [compareB, setCompareB] = React.useState<string | null>(null);

  const computed = React.useMemo(() => {
    if (!domains.length) return { total: 0, domainScores: {} as Record<string, number> };
    return computeScores(domains, answers);
  }, [domains, answers]);

  const gradeInfo = React.useMemo(() => {
    if (!gradeBuckets?.length) return { grade: "N/A", pd: 0.05 };
    return resolveGrade(computed.total, gradeBuckets);
  }, [computed.total, gradeBuckets]);

  async function loadParams() {
    setLoading(true);

    const [{ data: d }, { data: c }, { data: o }, { data: gb }] = await Promise.all([
      supabase.from("scoring_dimensions").select("id,code,weight").order("id"),
      supabase
        .from("scoring_criteria")
        .select("id,dimension_id,parent_criterion_id,code,label,weight,input_type,aggregation,sort_order")
        .order("dimension_id")
        .order("sort_order", { ascending: true }),
      supabase.from("scoring_options").select("id,criterion_id,value_label,score,sort_order").order("criterion_id"),
      supabase.from("scoring_grade_buckets").select("*").order("min"),
    ]);

    setDimensions((d ?? []) as any);
    setCriteria((c ?? []) as any);
    setOptions((o ?? []) as any);
    setGradeBuckets((gb ?? []) as any);

    const built = buildDomains((d ?? []) as any, (c ?? []) as any, (o ?? []) as any);
    setDomains(built);

    setLoading(false);
  }

  async function loadHistory() {
    // 1) retrouver (ou créer) le set_id associé au projet
    const { data: sets } = await supabase
      .from("scoring_evaluation_sets")
      .select("id,project_id,name,created_at,updated_at")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    const found = sets?.[0]?.id ?? null;
    setEvalSetId(found);

    if (!found) {
      setHistory([]);
      setActiveEval(null);
      return;
    }

    const { data: evals } = await supabase
      .from("scoring_evaluations")
      .select("id,set_id,version,status,answers,results,total_score,grade,pd,created_at,validated_at")
      .eq("set_id", found)
      .order("version", { ascending: false });

    const list = (evals ?? []) as any as EvalRow[];
    setHistory(list);
    setActiveEval(list[0] ?? null);
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadParams().then(loadHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  function setCritValue(criterionId: number, value: any) {
    setAnswers(prev => ({
      ...prev,
      [criterionId]: { ...(prev[criterionId] ?? {}), value },
    }));
  }

  function setSubValue(criterionId: number, subId: number, value: any) {
    setAnswers(prev => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] ?? {}),
        sub: {
          ...((prev[criterionId]?.sub ?? {}) as any),
          [subId]: { value },
        },
      },
    }));
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

    // append-only : on crée une nouvelle version
    const payload = {
      set_id: setId,
      version: (history?.[0]?.version ?? 0) + 1,
      status: validate ? "validated" : "draft",
      answers: answers as any,
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
    setAnswers((ev.answers ?? {}) as Answers);
  }

  async function deleteSet() {
    if (!evalSetId) return;
    const ok = confirm("Supprimer TOUT l’historique de scoring de ce projet ?");
    if (!ok) return;

    const { error } = await supabase.rpc("fn_scoring_eval_delete", { p_set_id: evalSetId });
    if (error) throw error;

    setEvalSetId(null);
    setHistory([]);
    setActiveEval(null);
    setAnswers({});
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement scoring…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Sticky score header */}
      <div className="sticky top-[72px] z-20">
        <Card className="border bg-background/95 backdrop-blur">
          <CardContent className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Total: {(computed.total * 100).toFixed(1)}%</Badge>
              <Badge variant="secondary">Grade: {gradeInfo.grade}</Badge>
              <Badge variant="secondary">PD: {gradeInfo.pd ?? "—"}</Badge>
              {activeEval && (
                <Badge variant={activeEval.status === "validated" ? "default" : "secondary"}>
                  V{activeEval.version} · {activeEval.status}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAnswers({})}>
                Réinitialiser saisie
              </Button>
              <Button variant="secondary" size="sm" onClick={() => saveEvaluation(false)}>
                Sauver (draft)
              </Button>
              <Button size="sm" onClick={() => saveEvaluation(true)}>
                Valider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs domaines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Saisie par domaine (style V4, ultra compact)</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={dimensions?.[0]?.code ?? "D1"} className="w-full">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              {dimensions.map(d => (
                <TabsTrigger key={d.id} value={d.code} className="gap-2">
                  {d.code}
                  <Badge variant="secondary" className="ml-1">
                    {((computed.domainScores?.[d.code] ?? 0) * 100).toFixed(1)}%
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {domains.map((dom: any) => (
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
                  {dom.criteria.map((c: any) => {
                    const aC = answers[c.id];
                    const hasSubs = c.subcriteria?.length;
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
                              {c.subcriteria.map((s: any) => {
                                const aS = aC?.sub?.[s.id];
                                return (
                                  <div key={s.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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

      {/* Historique + actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique & opérations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={deleteSet} disabled={!evalSetId}>
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
            <div className="text-sm text-muted-foreground">Aucune évaluation enregistrée.</div>
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
                {history.map(ev => (
                  <TableRow key={ev.id} className={activeEval?.id === ev.id ? "bg-muted/40" : ""}>
                    <TableCell>V{ev.version}</TableCell>
                    <TableCell>
                      <Badge variant={ev.status === "validated" ? "default" : "secondary"}>{ev.status}</Badge>
                    </TableCell>
                    <TableCell>{(Number(ev.total_score) * 100).toFixed(1)}%</TableCell>
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
                          // pick A then B
                          setCompareA(prev => prev ?? ev.id);
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
            Règle: chaque sauvegarde crée une <strong>nouvelle version</strong>. On ne “modifie” jamais une version passée.
          </div>
        </CardContent>
      </Card>

      <EvaluationCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        evaluations={history}
        defaultA={compareA ?? history?.[0]?.id ?? null}
        defaultB={compareB ?? history?.[1]?.id ?? null}
      />
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
  inputType: "select" | "yesno" | "number" | "text" | "range";
  options?: Array<{ id: number; value_label: string; score: number }>;
  value: any;
  onChange: (v: any) => void;
}) {
  if (inputType === "select" || inputType === "yesno") {
    return (
      <select
        className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Choisir —</option>
        {(options ?? []).map(o => (
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
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0..1"
      />
    );
  }

  return (
    <input
      className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Texte"
    />
  );
}

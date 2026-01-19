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
import type {
  Domain,
  Criterion,
  SubCriterion,
  InputType,
  ScoringOption,
  GradeBucket,
  Answers as LibAnswers,
  AnswerValue,
} from "@/lib/scoring";

import ScoringDetailDialog from "./ScoringCompareDialog"; // (⚠️ ton fichier s'appelle ScoringCompareDialog.tsx mais export default = ScoringDetailDialog)

type DimensionRow = { id: number; code: string; weight: number; sort_order: number | null; active: boolean };
type CriteriaRow = {
  id: number;
  dimension_id: number;
  parent_criterion_id: number | null; // null => critère racine, sinon sous-critère (si tu utilises parent_criterion_id)
  code: string;
  label: string | null;
  weight: number;
  input_type: InputType;
  aggregation: "sum" | "avg" | "max" | "min";
  sort_order: number | null;
  active: boolean;
};
type SubCriteriaRow = {
  id: number;
  criterion_id: number;
  code: string;
  label: string | null;
  weight: number;
  input_type: InputType;
  sort_order: number | null;
  active: boolean;
};
type OptionDbRow = {
  id: number;
  owner_kind: "criterion" | "subcriterion";
  owner_id: number;
  value_code: string;
  value_label: string;
  score: number;
  sort_order: number | null;
  active: boolean;
  criterion_id: number | null; // présent mais on n’en dépend pas
};

type EvalStatus = "draft" | "validated" | "archived";

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

type EvalRow = {
  id: string;
  set_id: string;
  version: number;
  status: EvalStatus;
  answers: Json; // jsonb
  results: Json; // jsonb
  total_score: number;
  grade: string | null;
  pd: number | null;
  created_at: string;
  validated_at: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function jsonToAnswers(v: Json): LibAnswers {
  // On accepte le JSON stocké et on le cast proprement en LibAnswers (structure attendue par computeScores)
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  // v est un objet clé=string (id critère) -> { value, sub }
  // computeScores utilise des keys number (Record<number,...>) mais JS stocke en string, OK.
  return v as unknown as LibAnswers;
}

function buildDomains(params: {
  dimensions: DimensionRow[];
  criteria: CriteriaRow[];
  subcriteria: SubCriteriaRow[];
  options: OptionDbRow[];
}): Domain[] {
  const { dimensions, criteria, subcriteria, options } = params;

  const dims = dimensions
    .filter((d) => d.active)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Options par owner
  const optByCriterion = new Map<number, ScoringOption[]>();
  const optBySub = new Map<number, ScoringOption[]>();

  for (const o of options) {
    if (!o.active) continue;
    const list = (o.owner_kind === "criterion" ? optByCriterion : optBySub).get(o.owner_id) ?? [];
    list.push({ id: o.id, value_label: o.value_label, score: Number(o.score) });
    (o.owner_kind === "criterion" ? optByCriterion : optBySub).set(o.owner_id, list);
  }

  // Sous-critères par critère
  const subsByCrit = new Map<number, SubCriterion[]>();
  for (const s of subcriteria.filter((x) => x.active)) {
    const list = subsByCrit.get(s.criterion_id) ?? [];
    list.push({
      id: s.id,
      code: s.code,
      weight: Number(s.weight),
      input_type: s.input_type,
      options: (optBySub.get(s.id) ?? []).slice().sort((a, b) => a.id - b.id),
    });
    subsByCrit.set(s.criterion_id, list);
  }

  // Critères racines par dimension (si tu utilises parent_criterion_id, on garde seulement ceux qui sont root)
  const rootsByDim = new Map<number, Criterion[]>();
  for (const c of criteria.filter((x) => x.active && x.parent_criterion_id == null)) {
    const list = rootsByDim.get(c.dimension_id) ?? [];
    const subs = (subsByCrit.get(c.id) ?? []).slice().sort((a, b) => a.id - b.id);

    list.push({
      id: c.id,
      code: c.code,
      weight: Number(c.weight),
      input_type: c.input_type,
      aggregation: c.aggregation,
      options: (optByCriterion.get(c.id) ?? []).slice().sort((a, b) => a.id - b.id),
      subcriteria: subs.length ? subs : undefined,
    });
    rootsByDim.set(c.dimension_id, list);
  }

  // Domain[]
  const domains: Domain[] = dims.map((d) => ({
    id: d.id,
    code: d.code,
    weight: Number(d.weight),
    criteria: (rootsByDim.get(d.id) ?? []).slice().sort((a, b) => a.code.localeCompare(b.code)),
  }));

  return domains;
}

export default function ScoringPanel({ project }: { project: ProjectRow }) {
  const [loading, setLoading] = React.useState(true);

  // Paramétrage scoring
  const [dimensions, setDimensions] = React.useState<DimensionRow[]>([]);
  const [criteria, setCriteria] = React.useState<CriteriaRow[]>([]);
  const [subcriteria, setSubcriteria] = React.useState<SubCriteriaRow[]>([]);
  const [options, setOptions] = React.useState<OptionDbRow[]>([]);
  const [gradeBuckets, setGradeBuckets] = React.useState<GradeBucket[]>([]);
  const [domains, setDomains] = React.useState<Domain[]>([]);

  // Saisie
  const [answers, setAnswers] = React.useState<LibAnswers>({});

  // Historique
  const [evalSetId, setEvalSetId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<EvalRow[]>([]);
  const [activeEval, setActiveEval] = React.useState<EvalRow | null>(null);

  // Mode édition (copie depuis une version existante)
  const [editingFrom, setEditingFrom] = React.useState<string | null>(null);

  // Detail modal
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailEvalId, setDetailEvalId] = React.useState<string | null>(null);

  const computed = React.useMemo(() => {
    if (!domains.length) return { total: 0, domainScores: {} as Record<string, number> };
    return computeScores(domains, answers);
  }, [domains, answers]);

  const gradeInfo = React.useMemo(() => {
    if (!gradeBuckets.length) return { grade: "N/A", pd: null as number | null };
    // tes buckets dans la base utilisent min_score/max_score
    const normalized = gradeBuckets.map((b) => ({
      grade: b.grade,
      min: (b as unknown as { min_score: number }).min_score ?? (b as unknown as { min: number }).min,
      max: (b as unknown as { max_score: number }).max_score ?? (b as unknown as { max: number }).max,
      pd: b.pd ?? null,
    })) as unknown as { grade: string; min: number; max: number; pd?: number | null }[];

    return resolveGrade(computed.total, normalized as any);
  }, [computed.total, gradeBuckets]);

  async function loadParams() {
    setLoading(true);

    const [dRes, cRes, sRes, oRes, gbRes] = await Promise.all([
      supabase.from("scoring_dimensions").select("id,code,weight,sort_order,active").order("sort_order", { ascending: true }),
      supabase
        .from("scoring_criteria")
        .select("id,dimension_id,parent_criterion_id,code,label,weight,input_type,aggregation,sort_order,active")
        .order("dimension_id", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("scoring_subcriteria")
        .select("id,criterion_id,code,label,weight,input_type,sort_order,active")
        .order("criterion_id", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase
        .from("scoring_options")
        .select("id,owner_kind,owner_id,value_code,value_label,score,sort_order,active,criterion_id")
        .order("owner_kind", { ascending: true })
        .order("owner_id", { ascending: true })
        .order("sort_order", { ascending: true }),
      supabase.from("scoring_grade_buckets").select("*").order("sort_order", { ascending: true }),
    ]);

    setDimensions((dRes.data ?? []) as DimensionRow[]);
    setCriteria((cRes.data ?? []) as CriteriaRow[]);
    setSubcriteria((sRes.data ?? []) as SubCriteriaRow[]);
    setOptions((oRes.data ?? []) as OptionDbRow[]);
    setGradeBuckets((gbRes.data ?? []) as GradeBucket[]);

    const built = buildDomains({
      dimensions: (dRes.data ?? []) as DimensionRow[],
      criteria: (cRes.data ?? []) as CriteriaRow[],
      subcriteria: (sRes.data ?? []) as SubCriteriaRow[],
      options: (oRes.data ?? []) as OptionDbRow[],
    });
    setDomains(built);

    setLoading(false);
  }

  async function loadHistory() {
    // 1) set_id du projet
    const { data: sets, error: setErr } = await supabase
      .from("scoring_evaluation_sets")
      .select("id")
      .eq("project_id", project.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (setErr) {
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

    const { data: evals, error: evalErr } = await supabase
      .from("scoring_evaluations")
      .select("id,set_id,version,status,answers,results,total_score,grade,pd,created_at,validated_at")
      .eq("set_id", found)
      .order("version", { ascending: false });

    if (evalErr) {
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
      // Nouvelle saisie par défaut
      setAnswers({});
      setEditingFrom(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  function setCritValue(criterionId: number, value: AnswerValue) {
    setAnswers((prev) => ({
      ...prev,
      [criterionId]: { ...(prev[criterionId] ?? {}), value },
    }));
  }

  function setSubValue(criterionId: number, subId: number, value: AnswerValue) {
    setAnswers((prev) => {
      const base = prev[criterionId] ?? {};
      const subMap = base.sub ?? {};
      return {
        ...prev,
        [criterionId]: {
          ...base,
          sub: {
            ...subMap,
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

  async function saveEvaluation(validate: boolean) {
    const setId = await ensureSet();
    const nextVersion = (history?.[0]?.version ?? 0) + 1;

    const payload = {
      set_id: setId,
      version: nextVersion,
      status: (validate ? "validated" : "draft") as EvalStatus,
      answers: answers as unknown as Json, // ✅ plus de any
      results: {
        total: computed.total,
        domainScores: computed.domainScores,
        editing_from: editingFrom,
      } as unknown as Json,
      total_score: computed.total,
      grade: gradeInfo.grade,
      pd: gradeInfo.pd,
      validated_at: validate ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("scoring_evaluations").insert(payload);
    if (error) throw error;

    // reset edit flag après sauvegarde
    setEditingFrom(null);

    await loadHistory();
  }

  function startNewEvaluation() {
    setAnswers({});
    setEditingFrom(null);
    setActiveEval(null);
  }

  function editFromEvaluation(ev: EvalRow) {
    setAnswers(jsonToAnswers(ev.answers));
    setEditingFrom(ev.id); // indique qu'on crée une nouvelle version dérivée
    setActiveEval(ev);
  }

  async function archiveEvaluation(ev: EvalRow) {
    if (ev.status === "archived") return;
    const ok = confirm(`Archiver la version V${ev.version} ?`);
    if (!ok) return;

    const { error } = await supabase
      .from("scoring_evaluations")
      .update({ status: "archived" })
      .eq("id", ev.id);

    if (error) throw error;
    await loadHistory();
  }

  async function deleteAllHistory() {
    if (!evalSetId) return;
    const ok = confirm("Supprimer TOUT l’historique de scoring de ce projet ?");
    if (!ok) return;

    // Si tu as une RPC de delete, utilise-la. Sinon on delete manuellement.
    // Ici: delete evaluations puis delete set
    await supabase.from("scoring_evaluations").delete().eq("set_id", evalSetId);
    await supabase.from("scoring_evaluation_sets").delete().eq("id", evalSetId);

    setEvalSetId(null);
    setHistory([]);
    setActiveEval(null);
    setAnswers({});
    setEditingFrom(null);
  }

  function openDetail(evId: string) {
    setDetailEvalId(evId);
    setDetailOpen(true);
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement scoring…</div>;
  }

  const defaultTab = domains?.[0]?.code ?? "D1";

  return (
    <div className="space-y-3">
      {/* Sticky header */}
      <div className="sticky top-[72px] z-20">
        <Card className="border bg-background/95 backdrop-blur">
          <CardContent className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Total: {(computed.total * 100).toFixed(1)}%</Badge>
              <Badge variant="secondary">Grade: {gradeInfo.grade}</Badge>
              <Badge variant="secondary">PD: {gradeInfo.pd ?? "—"}</Badge>

              {editingFrom ? (
                <Badge variant="secondary">Mode édition (copie)</Badge>
              ) : (
                <Badge variant="secondary">Nouvelle saisie</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={startNewEvaluation}>
                + Nouvelle évaluation
              </Button>

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
          <CardTitle className="text-base">Saisie par domaine (style V4)</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              {domains.map((d) => (
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
                    const hasSubs = !!(c.subcriteria && c.subcriteria.length);

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
                              {c.subcriteria!.map((s) => {
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

      {/* Historique */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={deleteAllHistory} disabled={!evalSetId}>
              Supprimer l’historique
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
                {history.map((ev) => (
                  <TableRow key={ev.id} className={activeEval?.id === ev.id ? "bg-muted/40" : ""}>
                    <TableCell>V{ev.version}</TableCell>
                    <TableCell>
                      <Badge variant={ev.status === "validated" ? "default" : "secondary"}>
                        {ev.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{(Number(ev.total_score) * 100).toFixed(1)}%</TableCell>
                    <TableCell>{ev.grade ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openDetail(ev.id)}>
                        Voir détail
                      </Button>

                      <Button size="sm" variant="secondary" onClick={() => editFromEvaluation(ev)}>
                        Modifier
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => archiveEvaluation(ev)}
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
            Règle : une “modification” crée une <strong>nouvelle version</strong> (append-only). La source est tracée via{" "}
            <code>results.editing_from</code>.
          </div>
        </CardContent>
      </Card>

      {/* Modal détail */}
      <ScoringDetailDialog open={detailOpen} onOpenChange={setDetailOpen} evaluationId={detailEvalId} />
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
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  if (inputType === "select" || inputType === "yesno") {
    return (
      <select
        className="h-9 w-full sm:w-[360px] rounded-md border bg-background px-3 text-sm"
        value={value ?? ""}
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

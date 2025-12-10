"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Client } from "./ClientSelector";
import type { Project } from "./ProjectList";

type Dimension = {
  id: number;
  code: string;
  label: string;
  weight: number;
};

type Criterion = {
  id: number;
  dimension_id: number;
  code: string;
  label: string;
  weight: number;
  input_type: "select" | "yesno" | "number" | "text" | "range";
  aggregation: "sum" | "avg" | "max" | "min";
};

type Subcriterion = {
  id: number;
  criterion_id: number;
  code: string;
  label: string;
  weight: number;
  input_type: "select" | "yesno" | "number" | "text" | "range";
};

type OptionRow = {
  id: number;
  owner_kind: "criterion" | "subcriterion";
  owner_id: number;
  value_code: string;
  value_label: string;
  score: number;
};

type Answers = Record<
  number,
  {
    value?: string;
    sub?: Record<number, { value?: string }>;
  }
>;

type Props = {
  client: Client;
  project: Project;
  onScoringSaved: (res: {
    total_score: number;
    grade: string;
    pd: number;
  }) => void;
};

export default function ScoringPanel({ client, project, onScoringSaved }: Props) {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [subcriteria, setSubcriteria] = useState<Subcriterion[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [activeDim, setActiveDim] = useState<string | undefined>(undefined);

  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState<{
    total_score: number;
    grade: string;
    pd: number;
  } | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      const [dRes, cRes, sRes, oRes] = await Promise.all([
        supabase
          .from("scoring_dimensions")
          .select("id, code, label, weight")
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("scoring_criteria")
          .select(
            "id, dimension_id, code, label, weight, input_type, aggregation"
          )
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("scoring_subcriteria")
          .select("id, criterion_id, code, label, weight, input_type")
          .eq("active", true)
          .order("sort_order"),
        supabase
          .from("scoring_options")
          .select(
            "id, owner_kind, owner_id, value_code, value_label, score"
          )
          .eq("active", true)
          .order("sort_order"),
      ]);

      if (dRes.data) {
        setDimensions(dRes.data as Dimension[]);
        if (dRes.data.length > 0) {
          setActiveDim(String((dRes.data[0] as any).id));
        }
      }
      if (cRes.data) setCriteria(cRes.data as any);
      if (sRes.data) setSubcriteria(sRes.data as any);
      if (oRes.data) setOptions(oRes.data as any);
    };

    loadModel();
  }, []);

  const criteriaByDim = useMemo(() => {
    const map: Record<number, Criterion[]> = {};
    criteria.forEach((c) => {
      (map[c.dimension_id] ||= []).push(c);
    });
    return map;
  }, [criteria]);

  const subByCrit = useMemo(() => {
    const map: Record<number, Subcriterion[]> = {};
    subcriteria.forEach((s) => {
      (map[s.criterion_id] ||= []).push(s);
    });
    return map;
  }, [subcriteria]);

  const optionsByOwner = useMemo(() => {
    const map: Record<string, OptionRow[]> = {};
    options.forEach((o) => {
      const key = `${o.owner_kind}:${o.owner_id}`;
      (map[key] ||= []).push(o);
    });
    return map;
  }, [options]);

  const setCriterionValue = (criterionId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || {}),
        value,
      },
    }));
  };

  const setSubcriterionValue = (
    criterionId: number,
    subId: number,
    value: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || {}),
        sub: {
          ...(prev[criterionId]?.sub || {}),
          [subId]: { value },
        },
      },
    }));
  };

  const handleCompute = async () => {
    if (!project?.id || !client?.id) {
      alert("Client ou projet manquant.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("compute_pf_score_v5", {
        p_project_id: project.id,
        p_client_id: client.id,
        p_answers: answers,
      });

      if (error) {
        console.error(error);
        alert("Erreur RPC compute_pf_score_v5 : " + error.message);
        setSaving(false);
        return;
      }

      if (data && data.length > 0) {
        const row = data[0] as {
          total_score: number;
          grade: string;
          pd: number;
        };
        setLast(row);
        onScoringSaved(row);
      } else {
        alert("Pas de résultat de la fonction de scoring.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Scoring du projet</CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Modèle PF_V5 — basé sur les tables <code>scoring_*</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {last && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Score : {(last.total_score * 100).toFixed(1)}% • Grade{" "}
              {last.grade} • PD {last.pd}
            </Badge>
          )}
          <Button size="sm" onClick={handleCompute} disabled={saving}>
            {saving ? "Calcul en cours..." : "Calculer & sauvegarder"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {dimensions.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aucun modèle de scoring actif. Vérifiez la table{" "}
            <code>scoring_dimensions</code>.
          </p>
        ) : (
          <Tabs
            value={activeDim}
            onValueChange={setActiveDim}
            className="space-y-4"
          >
            <TabsList>
              {dimensions.map((d) => (
                <TabsTrigger key={d.id} value={String(d.id)}>
                  {d.label} ({d.weight})
                </TabsTrigger>
              ))}
            </TabsList>

            {dimensions.map((d) => (
              <TabsContent key={d.id} value={String(d.id)}>
                <div className="space-y-2">
                  {(criteriaByDim[d.id] || []).map((c) => {
                    const subs = subByCrit[c.id] || [];
                    const ans = answers[c.id];

                    return (
                      <div
                        key={c.id}
                        className="border rounded-md px-3 py-2 bg-white flex flex-col gap-2"
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {c.label}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.code} • poids {c.weight}
                            </div>
                          </div>
                        </div>

                        {subs.length > 0 ? (
                          <div className="space-y-1">
                            {subs.map((s) => {
                              const optKey = `subcriterion:${s.id}`;
                              const opts = optionsByOwner[optKey] || [];
                              const val =
                                ans?.sub?.[s.id]?.value || "";

                              return (
                                <div
                                  key={s.id}
                                  className="grid grid-cols-[2fr,3fr] gap-2 items-center text-xs"
                                >
                                  <div>
                                    <div className="text-slate-700">
                                      {s.label}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      {s.code} • poids {s.weight}
                                    </div>
                                  </div>
                                  <div>
                                    {s.input_type === "select" ||
                                    s.input_type === "yesno" ? (
                                      <select
                                        className="border rounded-md px-2 py-1 w-full text-xs"
                                        value={val}
                                        onChange={(e) =>
                                          setSubcriterionValue(
                                            c.id,
                                            s.id,
                                            e.target.value
                                          )
                                        }
                                      >
                                        <option value="">
                                          — sélectionner —
                                        </option>
                                        {opts.map((o) => (
                                          <option
                                            key={o.id}
                                            value={o.value_code}
                                          >
                                            {o.value_code} —{" "}
                                            {o.value_label}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        className="border rounded-md px-2 py-1 w-full text-xs"
                                        type={
                                          s.input_type === "number" ||
                                          s.input_type === "range"
                                            ? "number"
                                            : "text"
                                        }
                                        value={val}
                                        onChange={(e) =>
                                          setSubcriterionValue(
                                            c.id,
                                            s.id,
                                            e.target.value
                                          )
                                        }
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-[2fr,3fr] gap-2 items-center text-xs">
                            <div />
                            <div>
                              {c.input_type === "select" ||
                              c.input_type === "yesno" ? (
                                <select
                                  className="border rounded-md px-2 py-1 w-full text-xs"
                                  value={ans?.value || ""}
                                  onChange={(e) =>
                                    setCriterionValue(c.id, e.target.value)
                                  }
                                >
                                  <option value="">
                                    — sélectionner —
                                  </option>
                                  {(optionsByOwner[
                                    `criterion:${c.id}`
                                  ] || []).map((o) => (
                                    <option
                                      key={o.id}
                                      value={o.value_code}
                                    >
                                      {o.value_code} — {o.value_label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  className="border rounded-md px-2 py-1 w-full text-xs"
                                  type={
                                    c.input_type === "number" ||
                                    c.input_type === "range"
                                      ? "number"
                                      : "text"
                                  }
                                  value={ans?.value || ""}
                                  onChange={(e) =>
                                    setCriterionValue(
                                      c.id,
                                      e.target.value
                                    )
                                  }
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {criteriaByDim[d.id]?.length === 0 && (
                    <p className="text-xs text-slate-500">
                      Aucun critère défini pour cette dimension.
                    </p>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

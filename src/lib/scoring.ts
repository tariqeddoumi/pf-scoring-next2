// src/lib/scoring.ts

export type InputType = "select" | "yesno" | "number" | "text" | "range";
export type Aggregation = "sum" | "avg" | "max" | "min";

export type ScoringOption = {
  id: number;
  value_label: string;
  score: number; // attendu dans [0..1] (ou tout autre échelle si tu assumes)
};

export type SubCriterion = {
  id: number;
  code: string;
  weight: number; // poids relatif dans le critère parent (ex: 0.3, 0.7, etc.)
  input_type: InputType;
  options?: ScoringOption[];
};

export type Criterion = {
  id: number;
  code: string;
  weight: number; // poids relatif dans le domaine
  input_type: InputType; // utilisé si pas de sous-critères
  aggregation: Aggregation; // utilisé si sous-critères
  options?: ScoringOption[];
  subcriteria?: SubCriterion[];
};

export type Domain = {
  id: number;
  code: string; // ex: "D1", "D2"
  weight: number; // poids relatif du domaine dans le score final
  criteria: Criterion[];
};

export type AnswerValue = string | number | null | undefined;

export type Answers = Record<
  number,
  {
    value?: AnswerValue;
    sub?: Record<number, { value?: AnswerValue }>;
  }
>;

export type ComputeResult = {
  total: number; // [0..1]
  domainScores: Record<string, number>; // chaque domaine => [0..1]
  criterionScores?: Record<number, number>; // optionnel: critère => [0..1]
  subScores?: Record<number, number>; // optionnel: sous-critère => [0..1]
};

export type GradeBucket = {
  grade: string;
  min: number; // borne incluse
  max: number; // borne incluse
  pd?: number | null;
};

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function toNumber(v: AnswerValue): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim().replace(",", ".");
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Pour select/yesno : l’UI met souvent optionId sous forme string.
 * Ex: value="12" => optionId=12
 */
function findOptionScore(options: ScoringOption[] | undefined, value: AnswerValue): number {
  if (!options || options.length === 0) return 0;

  // 1) si value correspond à un id (string ou number)
  const id = toNumber(value);
  if (id !== null) {
    const opt = options.find((o) => o.id === id);
    if (opt) return opt.score;
  }

  // 2) sinon tentative par libellé (value_label)
  if (typeof value === "string") {
    const opt2 = options.find((o) => o.value_label === value);
    if (opt2) return opt2.score;
  }

  return 0;
}

function weightNormalize(items: Array<{ weight: number }>): number {
  const s = items.reduce((acc, it) => acc + (Number.isFinite(it.weight) ? it.weight : 0), 0);
  return s > 0 ? s : 0;
}


/**
 * Calcule le score d'un sous-critère en fonction de son input_type.
 * - select/yesno => score de l'option
 * - number/range => valeur numérique (supposée 0..1)
 * - text => 0 (par défaut, à améliorer si tu veux scoring text)
 */
function scoreLeaf(
  inputType: InputType,
  options: ScoringOption[] | undefined,
  value: AnswerValue
): number {
  if (inputType === "select" || inputType === "yesno") {
    return clamp01(findOptionScore(options, value));
  }
  if (inputType === "number" || inputType === "range") {
    const n = toNumber(value);
    return n === null ? 0 : clamp01(n);
  }
  // text
  return 0;
}

/**
 * Calcule un critère:
 * - sans sous-critères : leaf
 * - avec sous-critères : agrégation des sous-critères (pondérée + aggregation)
 */
function scoreCriterion(c: Criterion, answers: Answers, subScoresOut?: Record<number, number>): number {
  const entry = answers[c.id];

  // Cas 1: leaf
  if (!c.subcriteria || c.subcriteria.length === 0) {
    const leaf = scoreLeaf(c.input_type, c.options, entry?.value);
    return clamp01(leaf);
  }

  // Cas 2: sous-critères
  const subs = c.subcriteria;
  const wsum = weightNormalize(subs);

  // On calcule les scores de chaque sous-critère
  const scoredSubs: Array<{ id: number; w: number; s: number }> = subs.map((s) => {
    const v = entry?.sub?.[s.id]?.value;
    const sc = scoreLeaf(s.input_type, s.options, v);
    const weight = Number.isFinite(s.weight) ? s.weight : 0;
    const normalized = wsum > 0 ? weight / wsum : 0;
    return { id: s.id, w: normalized, s: clamp01(sc) };
  });

  // Agrégation
  if (c.aggregation === "sum") {
    const sum = scoredSubs.reduce((acc, it) => acc + it.s * it.w, 0);
    scoredSubs.forEach((it) => {
      if (subScoresOut) subScoresOut[it.id] = clamp01(it.s);
    });
    return clamp01(sum);
  }

  if (c.aggregation === "avg") {
    // avg pondéré = sum(s*w) (w déjà normalisé)
    const avg = scoredSubs.reduce((acc, it) => acc + it.s * it.w, 0);
    scoredSubs.forEach((it) => {
      if (subScoresOut) subScoresOut[it.id] = clamp01(it.s);
    });
    return clamp01(avg);
  }

  if (c.aggregation === "max") {
    const m = Math.max(...scoredSubs.map((it) => it.s));
    scoredSubs.forEach((it) => {
      if (subScoresOut) subScoresOut[it.id] = clamp01(it.s);
    });
    return clamp01(m);
  }

  // min
  const mn = Math.min(...scoredSubs.map((it) => it.s));
  scoredSubs.forEach((it) => {
    if (subScoresOut) subScoresOut[it.id] = clamp01(it.s);
  });
  return clamp01(mn);
}

/**
 * computeScores(domains, answers)
 * => total & score par domaine
 *
 * Convention:
 * - Tous les scores sont en [0..1]
 * - weights sont "relatifs" (on normalise par somme)
 */
export function computeScores(domains: Domain[], answers: Answers): ComputeResult {
  const domainWeightSum = weightNormalize(domains);

  const domainScores: Record<string, number> = {};
  const criterionScores: Record<number, number> = {};
  const subScores: Record<number, number> = {};

  // Score total = somme(domainScore * domainWeightNormalized)
  let total = 0;

  for (const d of domains) {
    const criteria = d.criteria ?? [];
    const critWeightSum = weightNormalize(criteria);

    let domScore = 0;

    for (const c of criteria) {
      const cw = Number.isFinite(c.weight) ? c.weight : 0;
      const cwNorm = critWeightSum > 0 ? cw / critWeightSum : 0;

      const cScore = scoreCriterion(c, answers, subScores);
      criterionScores[c.id] = cScore;

      domScore += cScore * cwNorm;
    }

    domScore = clamp01(domScore);
    domainScores[d.code] = domScore;

    const dw = Number.isFinite(d.weight) ? d.weight : 0;
    const dwNorm = domainWeightSum > 0 ? dw / domainWeightSum : 0;

    total += domScore * dwNorm;
  }

  total = clamp01(total);

  return {
    total,
    domainScores,
    criterionScores,
    subScores,
  };
}

/**
 * resolveGrade(total, gradeBuckets)
 * gradeBuckets: [{min,max,grade,pd}]
 *
 * Remarque:
 * - total est supposé [0..1]
 * - min/max peuvent être en [0..1] aussi (recommandé)
 */
export function resolveGrade(
  total: number,
  gradeBuckets: GradeBucket[]
): { grade: string; pd: number | null } {
  const t = clamp01(total);

  const found = gradeBuckets.find((b) => t >= b.min && t <= b.max);
  if (!found) return { grade: "N/A", pd: null };

  return {
    grade: found.grade,
    pd: found.pd ?? null,
  };
}

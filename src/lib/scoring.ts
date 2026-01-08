// lib/scoring.ts

export type GradeBucket = { min: number; max: number; grade: string; pd: number }

export type Subcriterion = {
  id: number
  code: string
  weight: number
  input_type: 'select'|'yesno'|'number'|'text'|'range'
  options?: Array<{ id:number; value_label:string; score:number }>
}

export type Criterion = {
  id: number
  code: string
  weight: number
  input_type: 'select'|'yesno'|'number'|'text'|'range'
  aggregation: 'sum'|'avg'|'max'|'min'
  options?: Array<{ id:number; value_label:string; score:number }>
  subcriteria?: Subcriterion[]
}

export type Domain = {
  id: number
  code: string
  weight: number
  criteria: Criterion[]
}

export type Answers =
  Record<number, {           // key = criterion_id
    value?: any              // option_id (select/yesno) OU number/text
    sub?: Record<number, {   // key = subcriterion_id
      value?: any            // option_id OU number/text
    }>
  }>

export function computeScores(domains: Domain[], answers: Answers) {
  const domainScores: Record<string, number> = {}
  let total = 0

  for (const d of domains) {
    let sumCrit = 0

    for (const c of d.criteria) {
      const aC = answers[c.id]
      let critScore = 0

      if (c.subcriteria && c.subcriteria.length > 0) {
        // agrégation de sous-critères
        const partials: number[] = []
        for (const s of c.subcriteria) {
          const aS = aC?.sub?.[s.id]
          const sScore = scoreFromInput(s.input_type, aS?.value, s.options)
          partials.push(clamp01(s.weight * sScore))
        }
        let agg = 0
        if (partials.length > 0) {
          if (c.aggregation === 'avg') agg = partials.reduce((x,y)=>x+y,0)/partials.length
          else if (c.aggregation === 'max') agg = Math.max(...partials)
          else if (c.aggregation === 'min') agg = Math.min(...partials)
          else agg = partials.reduce((x,y)=>x+y,0) // sum
        }
        critScore = clamp01(c.weight * agg)
      } else {
        // critère direct
        const base = scoreFromInput(c.input_type, aC?.value, c.options)
        critScore = clamp01(c.weight * base)
      }

      sumCrit += critScore
    }

    const dScore = clamp01(d.weight * sumCrit)
    domainScores[d.code] = round4(dScore)
    total += dScore
  }

  total = clamp01(total)
  return { total, domainScores }
}

export function resolveGrade(total: number, buckets: GradeBucket[]) {
  const t = clamp01(total)
  const found =
    buckets.find(b => t >= b.min && t < b.max) ||
    buckets.find(b => t === b.max) ||
    buckets[buckets.length - 1]
  return found || { grade: 'N/A', pd: 0.05, min: 0, max: 1 }
}

function scoreFromInput(
  input: 'select'|'yesno'|'number'|'text'|'range',
  value: any,
  options?: Array<{ id:number; value_label:string; score:number }>
): number {
  if (input === 'select' || input === 'yesno') {
    const opt = options?.find(o => String(o.id) === String(value))
    return typeof opt?.score === 'number' ? clamp01(opt.score) : 0
  }
  if (input === 'number' || input === 'range') {
    const n = Number(value)
    return Number.isFinite(n) ? clamp01(n) : 0
  }
  // text: non noté par défaut
  return 0
}

function round4(n: number) { return Math.round(n * 10000) / 10000 }
function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

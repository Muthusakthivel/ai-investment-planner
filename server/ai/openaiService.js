/**
 * Gemini integration — explanations only. Never used for allocation math.
 */

const SYSTEM_PROMPT = `You are a financial literacy educator for Indian investors. Explain allocations in simple language.

STRICT RULES:
- Do NOT change, invent, or contradict any numbers from the user message. The projected value, targets, and ratios are computed by the app.
- Only interpret what is given.

Stream rules from the app:
- Monthly SIP allocation excludes Bonds by design and focuses on disciplined growth over time.
- Lumpsum allocation can include Bonds for stability and capital preservation.
- If lumpsum is 0, do not discuss bonds usage as part of an active allocation.

When the goal is short-term (e.g. goalType "short_term") or high-priority (e.g. house, marriage, education):
- Explain why safe instruments (RD, FD, Bonds, Debt funds) are prioritized for capital protection.
- Explain why RD and Fixed Deposits are recommended for near-term goals.
- Explain why equity is limited for such goals (volatility, capital preservation).

In 4-5 short sentences cover: (1) why monthly SIP allocation fits the user and goal type, (2) why SIP avoids bonds, (3) why lumpsum uses bonds for stability when present, (4) whether the goal looks achievable from the metrics, (5) one practical habit (e.g. review yearly).

If success ratio is below 1, acknowledge the gap gently without prescribing exact new SIP amounts.`;

function buildUserMessage(profile) {
  const {
    age,
    riskAppetite,
    incomeStability,
    monthlyInvestment,
    lumpsumInvestment,
    goalName,
    horizonYears,
    monthlyAllocation,
    lumpsumAllocation,
    combinedAllocation,
    targetAmount,
    inflatedTarget,
    projectedValue,
    successRatio,
    goalStatus,
    goalType,
    priority,
    monthlySafeAllocationPercentage,
    monthlyGrowthAllocationPercentage,
    lumpsumSafeAllocationPercentage,
    lumpsumGrowthAllocationPercentage,
    monthlyInvestmentAllocated,
    lumpsumInvestmentAllocated,
    monthlyRupeeAllocation,
    lumpsumRupeeAllocation,
    instrumentBreakdown,
  } = profile;

  const monthlyAllocationJson = JSON.stringify(monthlyAllocation || {}, null, 0);
  const lumpsumAllocationJson = JSON.stringify(lumpsumAllocation || {}, null, 0);
  const combinedAllocationJson = JSON.stringify(combinedAllocation || {}, null, 0);
  const sr =
    successRatio != null && Number.isFinite(Number(successRatio))
      ? Number(successRatio).toFixed(3)
      : 'n/a';
  const tgt = targetAmount != null ? `₹${Number(targetAmount).toLocaleString('en-IN')}` : 'n/a';
  const inf = inflatedTarget != null ? `₹${Number(inflatedTarget).toLocaleString('en-IN')}` : 'n/a';
  const pv = projectedValue != null ? `₹${Number(projectedValue).toLocaleString('en-IN')}` : 'n/a';
  const monthlyInv = monthlyInvestment != null ? `₹${Number(monthlyInvestment).toLocaleString('en-IN')}` : '₹0';
  const lumpsumInv = lumpsumInvestment != null ? `₹${Number(lumpsumInvestment).toLocaleString('en-IN')}` : '₹0';
  const monthlyGoalInv = monthlyInvestmentAllocated != null ? `₹${Number(monthlyInvestmentAllocated).toLocaleString('en-IN')}` : '₹0';
  const lumpsumGoalInv = lumpsumInvestmentAllocated != null ? `₹${Number(lumpsumInvestmentAllocated).toLocaleString('en-IN')}` : '₹0';
  const instJson =
    instrumentBreakdown && typeof instrumentBreakdown === 'object'
      ? JSON.stringify(instrumentBreakdown, null, 0)
      : 'n/a';
  const monthlyRupeeJson =
    monthlyRupeeAllocation && typeof monthlyRupeeAllocation === 'object'
      ? JSON.stringify(monthlyRupeeAllocation, null, 0)
      : 'n/a';
  const lumpsumRupeeJson =
    lumpsumRupeeAllocation && typeof lumpsumRupeeAllocation === 'object'
      ? JSON.stringify(lumpsumRupeeAllocation, null, 0)
      : 'n/a';

  return `User Profile:
Age: ${age}
Risk appetite: ${riskAppetite}
Income stability: ${incomeStability}
Monthly investment: ${monthlyInv}
Lumpsum investment: ${lumpsumInv}
Goal: ${goalName}
Time horizon (years): ${horizonYears}

Goal classification (app — do not alter):
- Goal type: ${goalType ?? 'standard'}
- Priority: ${priority ?? 'normal'}

Goal metrics (computed by app — do not alter):
- Target amount: ${tgt}
- Inflation-adjusted target: ${inf}
- Projected value (expected return scenario): ${pv}
- Success ratio (projected ÷ inflation-adjusted target): ${sr}
- Goal status: ${goalStatus ?? 'n/a'}

Goal-level contribution split:
- Monthly SIP to this goal: ${monthlyGoalInv}
- Lumpsum to this goal: ${lumpsumGoalInv}

Monthly SIP safe vs growth allocation:
- Safe allocation: ${monthlySafeAllocationPercentage != null ? `${monthlySafeAllocationPercentage}%` : 'n/a'}
- Growth allocation: ${monthlyGrowthAllocationPercentage != null ? `${monthlyGrowthAllocationPercentage}%` : 'n/a'}

Lumpsum safe vs growth allocation:
- Safe allocation: ${lumpsumSafeAllocationPercentage != null ? `${lumpsumSafeAllocationPercentage}%` : 'n/a'}
- Growth allocation: ${lumpsumGrowthAllocationPercentage != null ? `${lumpsumGrowthAllocationPercentage}%` : 'n/a'}

Instrument breakdown (% of total): RD, FD, Bonds, Debt funds, Equity, Mutual Funds
${instJson}

Monthly SIP allocation (% by bucket):
${monthlyAllocationJson}

Lumpsum allocation (% by bucket):
${lumpsumAllocationJson}

Combined allocation (% by bucket):
${combinedAllocationJson}

Monthly SIP rupee allocation:
${monthlyRupeeJson}

Lumpsum rupee allocation:
${lumpsumRupeeJson}

Task:
Explain why this plan works for this user and goal type, explicitly covering why bonds are used only in lumpsum and avoided in SIP. Mention how lumpsum adds stability when present. For short-term or high-priority goals, explain why safe instruments are prioritized and why equity is limited. Do not suggest different percentages or new numeric targets.`;
}

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {object} opts.profile - single goal explanation context
 * @param {AbortSignal} [opts.signal]
 */
export async function explainAllocation({ apiKey, profile, signal }) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const body = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: buildUserMessage(profile) }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 320,
      temperature: 0.5,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API error: ${res.status}`);
    err.status = res.status;
    err.detail = errText;
    throw err;
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim();
  if (!text) {
    throw new Error('Empty explanation from Gemini');
  }
  return text;
}

/**
 * Batch explanations for multiple goals (sequential to respect rate limits).
 */
export async function explainAllocationsBatch({ apiKey, items, signal }) {
  const explanations = [];
  for (const item of items) {
    const text = await explainAllocation({
      apiKey,
      profile: item,
      signal,
    });
    explanations.push({ goalName: item.goalName, text });
  }
  return explanations;
}

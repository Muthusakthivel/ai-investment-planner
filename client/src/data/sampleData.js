/** Demo presets for onboarding / screenshots */

export const sampleAggressive = {
  age: 28,
  monthlyIncome: 120000,
  monthlyInvestment: 35000,
  incomeStability: 'Stable',
  riskAppetite: 'High',
  goals: [
    { name: 'Emergency fund top-up', targetAmount: 200000, horizonYears: 2 },
    { name: 'Home down payment', targetAmount: 2500000, horizonYears: 7 },
    { name: 'Retirement', targetAmount: 15000000, horizonYears: 25 },
  ],
};

export const sampleConservative = {
  age: 52,
  monthlyIncome: 85000,
  monthlyInvestment: 15000,
  incomeStability: 'Stable',
  riskAppetite: 'Low',
  goals: [
    { name: 'Child education', targetAmount: 800000, horizonYears: 4 },
    { name: 'Retirement corpus', targetAmount: 8000000, horizonYears: 12 },
  ],
};

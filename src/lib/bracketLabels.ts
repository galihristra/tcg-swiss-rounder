export function singleRoundLabels(n: number): string[] {
  const labels: string[] = [];
  for (let r = n; r >= 1; r--)
    labels.push(
      r === 1 ? 'Final' : r === 2 ? 'Semifinal' : `Round of ${Math.pow(2, r)}`,
    );
  return labels;
}

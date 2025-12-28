export const formatIndicatorName = (name: string, year: number | string) => {
  if (!name) return name;
  const numYear = Number(year);
  if (isNaN(numYear)) return name;

  const previousYear = numYear - 1;
  const replacements: Record<string, string> = {
    "{CURRENT_YEAR}": numYear.toString(),
    "{PREVIOUS_YEAR}": previousYear.toString(),
    "{JAN_OCT_CURRENT_YEAR}": `January to October ${numYear}`,
    "{JAN_TO_OCT_CURRENT_YEAR}": `January to October ${numYear}`,
    "{JUL_SEP_CURRENT_YEAR}": `July-September ${numYear}`,
    "{JUL_TO_SEP_CURRENT_YEAR}": `July-September ${numYear}`,
    "{Q1_Q3_CURRENT_YEAR}": `1st to 3rd quarter of CY ${numYear}`,
    "{DEC_31_CURRENT_YEAR}": `December 31, ${numYear}`,
    "{DEC_31_PREVIOUS_YEAR}": `December 31, ${previousYear}`,
    "{CY_CURRENT_YEAR}": `CY ${numYear}`,
    "{CY_PREVIOUS_YEAR}": `CY ${previousYear}`,
    "{MARCH_CURRENT_YEAR}": `March ${numYear}`,
    "{OCT_31_CURRENT_YEAR}": `October 31, ${numYear}`,
  };

  let result = name;
  for (const key in replacements) {
    if (result.includes(key)) {
      result = result.split(key).join(replacements[key]);
    }
  }
  return result;
};

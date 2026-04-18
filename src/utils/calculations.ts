
import { boyBMIData, girlBMIData } from '../data/growthData';
import { boyBoneAgeTable, girlBoneAgeTable } from '../data/boneAgeData';

export function interpolateValue(value: number, x1: number, x2: number, y1: number, y2: number): number {
  if (x1 === x2) return y1;
  return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
}

export type MaturityCategory = 'accelerated' | 'average' | 'retarded';

export function calculateBoneAgePredictedHeight(
  gender: 'boy' | 'girl', 
  boneAge: number, 
  chronologicalAge: number, 
  currentHeight: number,
  manualMaturity?: MaturityCategory
): number | null {
  const tables = gender === 'boy' ? boyBoneAgeTable : girlBoneAgeTable;
  
  // Determine which table to use based on maturity
  let table: Record<number, number>;
  
  if (manualMaturity) {
    table = tables[manualMaturity];
  } else {
    const diff = boneAge - chronologicalAge;
    if (diff >= 1) {
      table = tables.accelerated;
    } else if (diff <= -1) {
      table = tables.retarded;
    } else {
      table = tables.average;
    }
  }

  const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
  
  if (boneAge < ages[0] || boneAge > ages[ages.length - 1]) {
    // If bone age is out of range, we can't accurately predict using this table
    // But for bone age 18+, it's 100%
    if (boneAge >= 18) return currentHeight;
    return null;
  }

  let lowerIndex = -1;
  let upperIndex = -1;
  for (let i = 0; i < ages.length; i++) {
    if (ages[i] <= boneAge) lowerIndex = i;
    if (ages[i] >= boneAge && upperIndex === -1) upperIndex = i;
  }

  if (lowerIndex === -1 || upperIndex === -1) return null;

  const percentage = interpolateValue(
    boneAge,
    ages[lowerIndex],
    ages[upperIndex],
    table[ages[lowerIndex]],
    table[ages[upperIndex]]
  );

  return (currentHeight / percentage) * 100;
}

export function findClosestIndices(value: number, array: number[]): [number, number] {
  let lowIndex = 0;
  let highIndex = array.length - 1;

  while (lowIndex <= highIndex) {
    let midIndex = Math.floor((lowIndex + highIndex) / 2);
    if (array[midIndex] < value) {
      lowIndex = midIndex + 1;
    } else if (array[midIndex] > value) {
      highIndex = midIndex - 1;
    } else {
      return [midIndex, midIndex];
    }
  }

  // Clamp to valid range so interpolation doesn't produce NaN for out-of-range inputs.
  // - value < array[0]  (e.g. 校正後負年齡): highIndex=-1, lowIndex=0  → [0, 0]
  // - value > array[-1] (超過資料表年齡上限): highIndex=N-1, lowIndex=N → [N-1, N-1]
  const lastIndex = array.length - 1;
  const clampedHigh = Math.max(0, Math.min(highIndex, lastIndex));
  const clampedLow = Math.max(0, Math.min(lowIndex, lastIndex));
  return [clampedHigh, clampedLow];
}

export function calculateBMI(weight: number, height: number): number {
  return parseFloat((weight / Math.pow(height / 100, 2)).toFixed(2));
}

export function determineWeightCategory(bmi: number, age: number, gender: 'boy' | 'girl'): string {
  const bmiData = gender === "boy" ? boyBMIData : girlBMIData;
  const ages = bmiData["Age"];
  const underweight = bmiData["underweight"];
  const overweight = bmiData["overweight"];
  const obesity = bmiData["obesity"];

  let lowerIndex = -1;
  let upperIndex = -1;
  for (let i = 0; i < ages.length; i++) {
    if (ages[i] <= age) lowerIndex = i;
    if (ages[i] >= age && upperIndex === -1) upperIndex = i;
  }

  if (lowerIndex === -1 || upperIndex === -1) return "無法判斷";

  const uw = interpolateValue(age, ages[lowerIndex], ages[upperIndex], underweight[lowerIndex], underweight[upperIndex]);
  const ow = interpolateValue(age, ages[lowerIndex], ages[upperIndex], overweight[lowerIndex], overweight[upperIndex]);
  const ob = interpolateValue(age, ages[lowerIndex], ages[upperIndex], obesity[lowerIndex], obesity[upperIndex]);

  if (bmi < uw) return "體重過輕";
  if (bmi < ow) return "體重適中";
  if (bmi < ob) return "體重過重";
  return "肥胖";
}

export function calculateInheritedHeight(gender: 'boy' | 'girl', fatherHeight: number, motherHeight: number) {
  let inheritedHeight = 0;
  let range = 0;

  if (gender === 'boy') {
    inheritedHeight = (fatherHeight + motherHeight + 13) / 2;
    range = 7.5;
  } else {
    inheritedHeight = (fatherHeight + motherHeight - 13) / 2;
    range = 6;
  }

  return {
    median: inheritedHeight,
    min: inheritedHeight - range,
    max: inheritedHeight + range
  };
}

export function calculatePercentileFromValue(val: number, dataAtAge: Record<string, number>): number {
  const p3 = dataAtAge[" 3rd"];
  const p15 = dataAtAge["15th"];
  const p25 = dataAtAge["25th"];
  const p50 = dataAtAge["50th"];
  const p75 = dataAtAge["75th"];
  const p85 = dataAtAge["85th"];
  const p97 = dataAtAge["97th"];

  if (val <= p3) return interpolateValue(val, 0, p3, 0, 3);
  if (val <= p15) return interpolateValue(val, p3, p15, 3, 15);
  if (val <= p25) return interpolateValue(val, p15, p25, 15, 25);
  if (val <= p50) return interpolateValue(val, p25, p50, 25, 50);
  if (val <= p75) return interpolateValue(val, p50, p75, 50, 75);
  if (val <= p85) return interpolateValue(val, p75, p85, 75, 85);
  if (val <= p97) return interpolateValue(val, p85, p97, 85, 97);
  return interpolateValue(val, p97, p97 + (p97 - p85), 97, 100);
}

export type GrowthQuadrant = 'slow' | 'fast' | null;

export function checkGrowthQuadrant(gender: 'boy' | 'girl', age: number, heightPercentile: number): GrowthQuadrant {
  // 門檻改成 >= / <=，讓剛好落在 11.0（男）/ 9.0（女）的孩子不會掉進空窗
  if (gender === 'boy') {
    if (heightPercentile < 15 && age >= 11) return 'slow';
    if (heightPercentile > 85 && age <= 11) return 'fast';
  } else {
    if (heightPercentile < 15 && age >= 9) return 'slow';
    if (heightPercentile > 85 && age <= 9) return 'fast';
  }
  return null;
}

export type BoneAgeDeviation = 'extreme_high' | 'high' | 'normal' | 'low' | 'extreme_low' | null;

export function calculateBoneAgeDeviation(predictedHeight: number | null, inheritedMin: number, inheritedMax: number): BoneAgeDeviation {
  if (predictedHeight === null) return null;
  
  if (predictedHeight > inheritedMax + 5) return 'extreme_high';
  if (predictedHeight > inheritedMax) return 'high';
  if (predictedHeight < inheritedMin - 5) return 'extreme_low';
  if (predictedHeight < inheritedMin) return 'low';
  
  return 'normal';
}

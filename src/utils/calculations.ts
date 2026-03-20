
import { boyBMIData, girlBMIData } from '../data/growthData';

export function interpolateValue(value: number, x1: number, x2: number, y1: number, y2: number): number {
  if (x1 === x2) return y1;
  return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
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
  return [highIndex, lowIndex];
}

export function findBoundingValues(value: number, dataset: Record<string, number>): [string, string] {
  let percentiles = Object.keys(dataset).filter(k => k !== 'Age');
  for (let i = 1; i < percentiles.length; i++) {
    if (dataset[percentiles[i]] >= value) {
      return [percentiles[i - 1], percentiles[i]];
    }
  }
  return [percentiles[percentiles.length - 2], percentiles[percentiles.length - 1]];
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
// 讓它同時能抓到 85th 或誤標的 84th
  const p85 = dataAtAge["85th"] || dataAtAge["84th"];
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
  if (gender === 'boy') {
    if (heightPercentile < 15 && age > 11) return 'slow';
    if (heightPercentile > 85 && age < 11) return 'fast';
  } else {
    if (heightPercentile < 15 && age > 9) return 'slow';
    if (heightPercentile > 85 && age < 9) return 'fast';
  }
  return null;
}


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

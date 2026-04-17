/**
 * @license
 * CC-BY-NC-4.0 (姓名標示-非商業性 4.0 國際)
 * SPDX-License-Identifier: CC-BY-NC-4.0
 * * 本專案僅供公益與衛教使用。嚴格禁止任何未經授權之商業營利行為。
 * Copyright © 2026 阿銘醫師｜仨寶爸中醫博士 吳啓銘
 */
import { createPortal } from 'react-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, Copy, Download, HelpCircle, ChevronDown, ChevronUp, Scale,
  User, UserPlus, ExternalLink, Calendar, Ruler, Weight, Activity, Dna,
  Info, Heart, Share2, Trash2, ArrowRight, ArrowLeft, ArrowUp, ArrowDown,
  CheckCircle2, AlertTriangle, RefreshCcw, Target, AlertCircle,
  Facebook, X, Sprout, SlidersHorizontal, Settings2, Bone, TrendingUp, TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  boyWeightData, boyHeightData, girlWeightData, girlHeightData 
} from './data/growthData';
import { 
  interpolateValue, findClosestIndices, calculateBMI, 
  determineWeightCategory, calculateInheritedHeight,
  calculatePercentileFromValue, checkGrowthQuadrant, type GrowthQuadrant,
  calculateBoneAgePredictedHeight, calculateBoneAgeDeviation, type BoneAgeDeviation,
  type MaturityCategory
} from './utils/calculations';
import { Modal } from './components/Modal';

type Gender = 'boy' | 'girl';
type TannerStage = 0 | 1 | 2 | 3;

type PubertyAlertLevel = 'normal' | 'watch' | 'attention';
type PubertyDirection = 'early' | 'late' | 'none';
type PubertySource = 'tanner' | 'percentile';

type PubertyAssessment = {
  source: PubertySource;
  level: PubertyAlertLevel;
  direction: PubertyDirection;
  title: string;
  basisText: string;
  description: string;
};

const ADVICE_TEXTS = {
  underweight: "【體重偏輕建議】\n建議加強均衡飲食，特別是優質蛋白質、足夠熱量與健康油脂的攝取。若同時有食慾差、容易疲倦、腸胃吸收不佳或生長落後等情況，建議進一步評估營養狀態與相關生理因素，必要時可尋求專業中、西醫師協助。",
  overweight: "【體重偏重建議】\n建議調整飲食內容，減少高糖、高油與加工食品，並增加日常活動量與規律運動。若體重持續上升，需留意代謝異常、骨齡超前與性早熟風險，建議由中、西醫師或營養師協助管理。",
  genetic_fast: "【生長表現高於遺傳預期】\n目前身高百分位明顯高於遺傳目標範圍（落差超過 15%），代表現階段生長速度較快。這不一定異常，但仍建議結合骨齡、成長速度與第二性徵發育情況一起判讀，以排除性早熟或骨齡過度超前的可能。",
  genetic_slow: "【生長表現低於遺傳預期】\n目前身高百分位明顯低於遺傳目標範圍（落差超過 15%），建議進一步留意近期身高增加速度、睡眠狀況、營養攝取與腸胃吸收情形。若百分位持續下滑，或年生長速度偏低，建議由專業醫師進一步評估。",
  extreme_high: "【生長明顯超前】\n預估身高明顯高於遺傳目標上限，表示目前生長動能較強。但若同時合併骨齡超前或第二性徵提早出現，仍需留意是否有提早成熟的情況。建議定期追蹤骨齡與生長曲線變化，必要時由專業醫師進一步判讀。",
  high: "【生長表現良好】\n預估身高優於遺傳目標，顯示目前生長條件不錯。但仍建議結合骨齡與發育時機一起觀察，以確認生長節奏是否穩定。",
  normal: "【發育大致符合遺傳預期】\n目前預估身高與遺傳目標大致相符，整體生長發育屬穩定範圍。建議持續觀察，並維持良好的飲食、作息與運動習慣。",
  low: "【生長動能稍弱】\n預估身高略低於遺傳目標下限，建議檢視日常蛋白質攝取、睡眠品質與運動習慣。若生長曲線有持續下滑，或年生長速度不理想，建議進一步諮詢專業中、西醫師。",
  extreme_low: "【生長遲緩風險提醒】\n預估身高明顯低於遺傳潛力，建議進一步評估是否存在生長速度不足、骨齡異常、營養問題或內分泌因素。建議由小兒內分泌科醫師或相關專業中、西醫師進行進一步判讀。",
  th_formula: "【關於遺傳目標身高（TH）】\n遺傳目標身高（Target Height, TH）是依據父母身高推估孩子可能的成年身高區間，屬於 mid-parental height 的臨床估算方法，最早由 Tanner 等學者提出。\n\n● 男孩：(父親身高 + 母親身高 + 13) ÷ 2\n● 女孩：(父親身高 + 母親身高 - 13) ÷ 2\n\n臨床上，多數孩子的最終身高通常會落在遺傳目標約 ±8–10 cm 的範圍內。\n\n進一步觀察台灣孩童常見的變異範圍為：\n● 男孩：約 ±7.5 cm\n● 女孩：約 ±6 cm\n\n實際評估仍需考量個體差異（如青春期時機、營養、睡眠與生長速度等），因此建議結合生長曲線、骨齡與年生長速度綜合判讀。\n\n需注意的是，TH 反映的是先天遺傳潛力，並非最終身高的精準預測值。",
  bp_standard: "【關於 BP 預估模型與熟成度判別】\n本系統採用 Bayley–Pinneau（BP）預估模型，並依據骨齡與實際年齡的差距，選用相對應的熟成度參考表。\n\n● 早熟（Accelerated）：骨齡較實際年齡超前 1 歲（含）以上。\n● 晚熟（Retarded）：骨齡較實際年齡落後 1 歲（含）以上。\n● 平均（Average）：骨齡與實際年齡差距小於 1 歲。\n\n需注意的是，BP 模型主要提供趨勢參考，實際判讀仍應結合遺傳目標身高、青春期發育狀態、年生長速度與臨床評估綜合判斷。",
};

export default function App() {
  const [gender, setGender] = useState<Gender>('boy');
  const [showTannerGuide, setShowTannerGuide] = useState(false);
  const [childName, setChildName] = useState<string>(''); 
  const [birthdateInput, setBirthdateInput] = useState('');
  const [isPreterm, setIsPreterm] = useState(false);
  const [gestationalWeeks, setGestationalWeeks] = useState('');
  const [gestationalDays, setGestationalDays] = useState('');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [debouncedWeight, setDebouncedWeight] = useState('');
  const [boneAge, setBoneAge] = useState<string>('');
  const [fatherHeight, setFatherHeight] = useState<string>('');
  const [motherHeight, setMotherHeight] = useState<string>('');
  const [manualMaturity, setManualMaturity] = useState<MaturityCategory | null>(null);
  const [tannerStage, setTannerStage] = useState<TannerStage | null>(null);
  const [showMaturityControls, setShowMaturityControls] = useState(false);
  const [showParents, setShowParents] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const [openQA, setOpenQA] = useState<number | null>(null);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: string }>({
    isOpen: false,
    title: '',
    content: ''
  });

  const weeksError =
    gestationalWeeks !== '' &&
    (Number(gestationalWeeks) < 20 || Number(gestationalWeeks) > 36);

  const daysError =
    gestationalDays !== '' &&
    (Number(gestationalDays) < 0 || Number(gestationalDays) > 6);
  
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  // --- 1. ⚡ 優先抓取姓名 (原本漏掉的這味藥補上去) ---
  const n = params.get('n');
  if (n) setChildName(n);

  // 定義一個內部的「過濾藥方」 (完全保留你的邏輯)
  const getSafeParam = (key: string, min: number, max: number) => {
    const val = params.get(key);
    if (!val) return null;
    const isPureNumber = /^\d+(\.\d+)?$/.test(val.trim());
    if (!isPureNumber || val.length > 10) return null;
    const numericVal = Number(val);
    if (numericVal >= min && numericVal <= max) {
      return val;
    }
    return null;
  };

  // --- 2. 開始執行抓取與驗證 (完全保留你的範圍限制) ---

  const g = params.get('g');
  if (g === 'boy' || g === 'girl') setGender(g);

  const safeH = getSafeParam('h', 30, 250);
  if (safeH) setHeight(safeH);

  const safeW = getSafeParam('w', 1, 200);
  if (safeW) setWeight(safeW);

  const safeBA = getSafeParam('ba', 0, 20);
  if (safeBA) setBoneAge(safeBA);

  const safeFH = getSafeParam('fh', 100, 250);
  if (safeFH) setFatherHeight(safeFH);

  const safeMH = getSafeParam('mh', 100, 250);
  if (safeMH) setMotherHeight(safeMH);

  // --- 3. ⚡ 早產兒資訊 (從生日括號移出來，獨立執行) ---
  const pt = params.get('pt');
  if (pt === '1') setIsPreterm(true);

  const safeGW = getSafeParam('gw', 20, 36);
  if (safeGW) setGestationalWeeks(safeGW);

  const safeGD = getSafeParam('gd', 0, 6);
  if (safeGD) setGestationalDays(safeGD);

  // --- 4. 生日邏輯 (回歸單純處理生日) ---
  const b = params.get('b');
  if (b) {
    if (/^[\d/-]{6,10}$/.test(b) || (/^\d+(\.\d+)?$/.test(b) && Number(b) <= 18.5)) {
       setBirthdateInput(b);
    }
  }

}, []);
  
// 這裡就是「數位接力棒」：把診間電腦填好的資料，變成一個帶參數的網址
const shareUrl = useMemo(() => {
  const params = new URLSearchParams();
  
  // 1. 基本資料 (補上姓名 n)
  if (childName) params.set('n', childName);
  params.set('g', gender); 
  if (height) params.set('h', height); 
  if (weight) params.set('w', weight); 
  if (birthdateInput) params.set('b', birthdateInput); 

  // 2. 進階資料
  if (boneAge) params.set('ba', boneAge); 
  if (fatherHeight) params.set('fh', fatherHeight); 
  if (motherHeight) params.set('mh', motherHeight); 

  // 3. 早產資訊 (補上勾選狀態與週數)
  if (isPreterm) {
    params.set('pt', '1');
    if (gestationalWeeks) params.set('gw', gestationalWeeks);
    if (gestationalDays) params.set('gd', gestationalDays);
  }

  // 產出連結，家長掃完會直接打開你的 App 並帶入這些數字
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}, [childName, gender, height, weight, birthdateInput, boneAge, fatherHeight, motherHeight, isPreterm, gestationalWeeks, gestationalDays]);

useEffect(() => {
  if (birthdateInput && height && debouncedWeight && ageData && !ageData.isError) {
    setIsCalculating(true);
    const timer = setTimeout(() => setIsCalculating(false), 800);
    return () => clearTimeout(timer);
  } else {
    setIsCalculating(false);
  }
}, [birthdateInput, height, debouncedWeight, boneAge, gender, manualMaturity]);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedWeight(weight);
  }, 400);

  return () => clearTimeout(timer);
}, [weight]);

useEffect(() => {
  setManualMaturity(null);
  setTannerStage(null);
  setShowMaturityControls(false);
}, [birthdateInput, gender]);

useEffect(() => {
  setManualMaturity(null);
}, [boneAge]);

const openAdvice = (type: keyof typeof ADVICE_TEXTS, title: string) => {
  if (title === '發育狀態建議' && results?.pubertyAssessment) {
    setModal({
      isOpen: true,
      title,
      content: `${results.pubertyAssessment.basisText}\n\n${results.pubertyAssessment.description}`
    });
    return;
  }

  setModal({
    isOpen: true,
    title,
    content: ADVICE_TEXTS[type]
  });
};

  
  const GrowthProgressBar = ({ percentile, color, medianValue, unit }: { percentile: number, color: string, medianValue?: number, unit?: string }) => {
    const markers = [3, 15, 50, 85, 97];
    
    return (
      <div className="space-y-1">
        <div className="relative pt-2 pb-8">
          <div className="h-2 w-full bg-slate-100 rounded-full relative border border-slate-200/50">
            {/* Reference markers lines */}
            {markers.map(m => (
              <div key={m} className="absolute top-0 h-full w-px bg-slate-300/50" style={{ left: `${m}%` }} />
            ))}
            
            {/* Result Dot */}
            <motion.div 
              initial={{ left: 0, opacity: 0 }}
              animate={{ left: `${Math.min(Math.max(percentile, 0), 100)}%`, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full ${color} border-2 border-white shadow-md z-10`}
            />
          </div>
          {/* Reference markers labels */}
          <div className="absolute w-full left-0 top-6 flex justify-between px-0">
            {markers.map(m => (
              <div key={m} className="absolute flex flex-col items-center" style={{ left: `${m}%`, transform: 'translateX(-50%)' }}>
                <div className="h-1.5 w-px bg-slate-300 mb-1" />
                <span className="text-[8px] font-bold text-slate-400">{`P${m}`}</span>
                {m === 50 && medianValue && (
                  <span className="text-[9px] font-black text-slate-600 mt-1 whitespace-nowrap bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                    {medianValue.toFixed(1)} {unit}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const GeneticDeviationIndicator = ({ currentPercentile, targetPercentile }: { currentPercentile: number; targetPercentile: number }) => {
    const diff = currentPercentile - targetPercentile;
    const clampedDiff = Math.max(-30, Math.min(30, diff));
    const markerPosition = ((clampedDiff + 30) / 60) * 100;
    const isAlert = Math.abs(diff) > 15;
    const directionLabel = diff > 5 ? '高於基準身高' : diff < -5 ? '低於基準身高' : '接近基準身高';
    const directionColor = diff > 5 ? 'text-rose-600' : diff < -5 ? 'text-blue-600' : 'text-emerald-600';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-slate-600 uppercase tracking-[0.2em]">遺傳基準身高偏差</span>
          <span className={`text-lg font-black ${directionColor}`}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-4 rounded-full bg-gradient-to-r from-blue-100 via-emerald-100 to-rose-100 border-2 border-white shadow-inner">
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-400/50" />
          <motion.div
            initial={{ left: '50%' }}
            animate={{ left: `calc(${markerPosition}% - 12px)` }}
            transition={{ duration: 1.5, ease: "backOut" }}
            className={`absolute -top-2 w-7 h-7 rounded-full border-4 shadow-xl flex items-center justify-center ${
              isAlert ? 'bg-red-500 border-red-100 text-white' : 'bg-accent border-white text-white'
            }`}
          >
            <Target size={14} />
          </motion.div>
        </div>
        <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
          <span className="inline-flex items-center gap-2"><ArrowLeft size={14} />落後</span>
          <span className="text-slate-300">基準線</span>
          <span className="inline-flex items-center gap-2">超前<ArrowRight size={14} /></span>
        </div>
        <div className={`text-sm font-black p-4 rounded-2xl bg-white/50 border border-slate-100 ${directionColor}`}>
          分析結果：{directionLabel}（目前 {currentPercentile.toFixed(1)}% / 遺傳基準身高 {targetPercentile.toFixed(1)}%）
        </div>
      </div>
    );
  };
const getTannerPubertyAssessment = (
  gender: Gender,
  age: number,
  tannerStage: TannerStage
): PubertyAssessment => {
  const isGirl = gender === 'girl';

  let level: PubertyAlertLevel = 'normal';
  let direction: PubertyDirection = 'none';

  if (isGirl) {
    if (age < 8) {
      if (tannerStage === 0) {
        level = 'normal';
      } else {
        level = 'attention';
        direction = 'early';
      }
    } else if (age < 10) {
      if (tannerStage === 0) {
        level = 'watch';
        direction = 'late';
      } else if (tannerStage === 1) {
        level = 'normal';
      } else {
        level = 'watch';
        direction = 'early';
      }
    } else if (age <= 13) {
      if (tannerStage === 0) {
        level = 'attention';
        direction = 'late';
      } else if (tannerStage === 1) {
        level = 'watch';
        direction = 'late';
      } else if (tannerStage === 2) {
        level = 'normal';
      } else {
        level = 'watch';
        direction = 'early';
      }
    } else {
      if (tannerStage === 0 || tannerStage === 1) {
        level = 'attention';
        direction = 'late';
      } else if (tannerStage === 2) {
        level = 'watch';
        direction = 'late';
      } else {
        level = 'normal';
      }
    }
  } else {
    if (age < 9) {
      if (tannerStage === 0) {
        level = 'normal';
      } else {
        level = 'attention';
        direction = 'early';
      }
    } else if (age < 11) {
      if (tannerStage === 0) {
        level = 'watch';
        direction = 'late';
      } else if (tannerStage === 1) {
        level = 'normal';
      } else {
        level = 'watch';
        direction = 'early';
      }
    } else if (age <= 14) {
      if (tannerStage === 0) {
        level = 'attention';
        direction = 'late';
      } else if (tannerStage === 1) {
        level = 'watch';
        direction = 'late';
      } else if (tannerStage === 2) {
        level = 'normal';
      } else {
        level = 'watch';
        direction = 'early';
      }
    } else {
      if (tannerStage === 0 || tannerStage === 1) {
        level = 'attention';
        direction = 'late';
      } else if (tannerStage === 2) {
        level = 'watch';
        direction = 'late';
      } else {
        level = 'normal';
      }
    }
  }

  const title =
    level === 'normal'
      ? '發育大致正常'
      : level === 'watch'
      ? '發育略有偏差'
      : '發育明顯偏離常態';

  const basisText = '本次依據：臨床評估（第二性徵發育）';

  let description = '目前第二性徵發育與年齡大致相符，屬於正常發育範圍。';

if (level === 'normal') {
  description = '目前的發育進展與年齡大致相符，整體屬於正常的發育範圍。建議持續觀察成長速度與生活作息，維持良好的睡眠、營養與運動習慣即可。';
} else if (level === 'watch' && direction === 'early') {
  description = '目前的發育進展相對同齡略為提前。這種情況不一定異常，但建議同步觀察近期身高增加速度、骨齡變化與第二性徵進展。平時可留意規律作息、體重控制與環境荷爾蒙暴露，必要時可進一步評估。';
} else if (level === 'watch' && direction === 'late') {
  description = '目前的發育進展相對同齡略為偏慢。建議先觀察近期成長速度、睡眠品質、營養攝取與運動狀況。若後續發育仍未跟上，或合併年生長速度偏低，可再進一步評估。';
} else if (level === 'attention' && direction === 'early') {
  description = '目前的發育進展明顯早於一般時程。建議同步評估骨齡、年生長速度與第二性徵變化，並留意是否有提早成熟的情況。平時可減少環境荷爾蒙暴露、避免過重，並維持規律作息，必要時由專業中、西醫師進一步判讀。';
} else if (level === 'attention' && direction === 'late') {
  description = '目前的發育進展明顯落後於同齡。建議進一步檢視近期身高增加速度、睡眠、營養與整體健康狀況，必要時可結合骨齡與相關檢查，評估是否有發育延遲或其他影響生長的因素。';
}

  return {
    source: 'tanner',
    level,
    direction,
    title,
    basisText,
    description
  };
};

const getPercentilePubertyAssessment = (
  gender: Gender,
  age: number,
  heightPercentile: number
): PubertyAssessment => {
  let level: PubertyAlertLevel = 'normal';
  let direction: PubertyDirection = 'none';

  const isGirl = gender === 'girl';
  const pubertyStartAge = isGirl ? 8 : 9;
  const pubertyMainWindowEnd = isGirl ? 13 : 14;

  // 先判斷「高百分位 → 可能偏早」
  if (age < pubertyStartAge) {
    if (heightPercentile >= 97) {
      level = 'attention';
      direction = 'early';
    } else if (heightPercentile >= 85) {
      level = 'watch';
      direction = 'early';
    }
  } else if (age <= pubertyMainWindowEnd) {
    if (heightPercentile >= 97) {
      level = 'attention';
      direction = 'early';
    } else if (heightPercentile >= 85) {
      level = 'watch';
      direction = 'early';
    } else if (heightPercentile <= 3) {
      level = 'attention';
      direction = 'late';
    } else if (heightPercentile <= 15) {
      level = 'watch';
      direction = 'late';
    }
  } else {
    // 超過一般青春期主要區間後，低百分位更有意義
    if (heightPercentile <= 3) {
      level = 'attention';
      direction = 'late';
    } else if (heightPercentile <= 15) {
      level = 'watch';
      direction = 'late';
    }
  }

  const title =
    level === 'normal'
      ? '發育大致正常'
      : level === 'watch'
      ? '發育略有偏差'
      : '發育明顯偏離常態';

  const basisText = '本次依據：年齡與身高百分位推估';

  let description =
    '目前結果是依年齡與身高百分位進行推估，整體發育節奏大致平穩。建議持續觀察後續成長速度，並維持良好的睡眠、營養與運動習慣。';

  if (level === 'watch' && direction === 'early') {
    description =
      '目前結果顯示身高位於同齡相對偏高區間，發育節奏可能略為提前。這不一定代表異常，但建議同步觀察近期身高增加速度、骨齡變化與第二性徵發育情況。';
  } else if (level === 'attention' && direction === 'early') {
    description =
      '目前結果顯示身高位於同齡明顯偏高區間，若年齡又偏小，需留意是否有發育提早的可能。建議進一步結合骨齡、年生長速度與第二性徵發育狀況綜合判讀。';
  } else if (level === 'watch' && direction === 'late') {
    description =
      '目前結果顯示身高位於同齡相對偏低區間，發育節奏可能略為偏慢。建議先觀察近期成長速度、睡眠品質、營養攝取與運動狀況；若生長曲線持續下滑，可再進一步評估。';
  } else if (level === 'attention' && direction === 'late') {
    description =
      '目前結果顯示身高相對同齡明顯偏低，且已接近或超過一般應進入發育的年齡。建議進一步結合骨齡、年生長速度與第二性徵發育狀況綜合判讀。';
  }

  return {
    source: 'percentile',
    level,
    direction,
    title,
    basisText,
    description
  };
};
  
// Derived state: Age
const ageData = useMemo(() => {
  if (!birthdateInput) return null;

  // 1. 先處理直接輸入數字（0-18歲）的情況
  const isPureNumber = /^\d+(\.\d+)?$/.test(birthdateInput.trim());
  if (isPureNumber) {
    const numericAge = Number(birthdateInput); 
    if (numericAge >= 0 && numericAge <= 18.5 && birthdateInput.length < 7) {
      return { years: numericAge, display: `${numericAge.toFixed(1)} 歲` };
    }
  }

  // 2. 準備解析日期字串
  // 💉 微調：增加支援橫線 -，並去掉空格，確保 099/08/23 變純數字
  let dateStr = birthdateInput.replace(/[/|-]/g, '').trim(); 
  let birthDate: Date | null = null;

  // A. 處理西元 8 位數 (YYYYMMDD)
  if (/^\d{8}$/.test(dateStr)) {
    const y = parseInt(dateStr.substring(0, 4));
    const m = parseInt(dateStr.substring(4, 6)) - 1; 
    const d = parseInt(dateStr.substring(6, 8));
    const tempDate = new Date(y, m, d);
    if (tempDate.getFullYear() === y && tempDate.getMonth() === m && tempDate.getDate() === d) {
      birthDate = tempDate;
    }
  } 
  // B. 處理民國日期 (支援 6 位 YYMMDD 或 7 位 YYYMMDD)
  else if (/^\d{6,7}$/.test(dateStr)) {
    const isSevenDigit = dateStr.length === 7;
    const yLen = isSevenDigit ? 3 : 2;

    const yStr = dateStr.substring(0, yLen);
    const mStr = dateStr.substring(yLen, yLen + 2);
    const dStr = dateStr.substring(yLen + 2, yLen + 4);

    const y = parseInt(yStr) + 1911;
    const m = parseInt(mStr) - 1;
    const d = parseInt(dStr);

    const tempDate = new Date(y, m, d);
    if (tempDate.getFullYear() === y && tempDate.getMonth() === m && tempDate.getDate() === d) {
      birthDate = tempDate;
    }
  }

  // 3. 如果日期合法，開始計算精確年齡 (這段邏輯你原本的很好，照舊)
  if (birthDate && !isNaN(birthDate.getTime())) {
    const today = new Date();
    const diff = today.getTime() - birthDate.getTime();
    if (diff < 0) return { years: 0, display: "日期在未來喔！", isError: true };
    const ageInYears = diff / (1000 * 60 * 60 * 24 * 365.25);
    if (ageInYears > 18.5) return { years: ageInYears, display: "已超過 18 歲", isError: true };
    const years = Math.floor(ageInYears);
    const months = Math.floor((ageInYears - years) * 12);
    const days = Math.floor(((ageInYears - years) * 12 - months) * 30.44);
    return { years: ageInYears, display: `${years} 歲 ${months} 個月又 ${days} 天` };
  }

  // 4. 最後防線
  // 💉 微調：因為有 6 位數民國生日，所以長度 >= 6 且沒通過上面解析就算無效
  if (dateStr.length >= 6) {
    return { years: 0, display: "日期無效，請檢查", isError: true };
  }

  return null;
}, [birthdateInput]);

const correctedAgeData = useMemo(() => {
  if (!ageData || ageData.isError || ageData.years >= 3) return null;
  if (!isPreterm) return null;
  if (!gestationalWeeks) return null;

  const weeks = Number(gestationalWeeks);
  const daysInput = Number(gestationalDays || 0);

  if (!Number.isInteger(weeks) || weeks < 20 || weeks > 36) return null;
  if (!Number.isInteger(daysInput) || daysInput < 0 || daysInput > 6) return null;

  const gestationalAgeInWeeks = weeks + daysInput / 7;
  const prematureWeeks = 40 - gestationalAgeInWeeks;
  const correctedYears = Math.max(0, ageData.years - prematureWeeks / 52.1775);

  const years = Math.floor(correctedYears);
  const monthsFloat = (correctedYears - years) * 12;
  const months = Math.floor(monthsFloat);
  const days = Math.floor((monthsFloat - months) * 30.44);

  const display =
    years > 0
      ? `${years} 歲 ${months} 個月又 ${days} 天`
      : months > 0
        ? `${months} 個月又 ${days} 天`
        : `${days} 天`;

  return {
    years: correctedYears,
    display,
    prematureWeeks,
    gestationalAgeInWeeks,
  };
}, [ageData, isPreterm, gestationalWeeks, gestationalDays]);

const ageForCalculation = useMemo(() => {
  return correctedAgeData?.years ?? ageData?.years ?? null;
}, [correctedAgeData, ageData]);
  
// Derived state: Percentiles and Results
  const results = useMemo(() => {
    // 💉 阿銘醫師質感優化：三項全齊 + 儀式感動畫跑完 = 才亮牌
    // 修正點：移除多餘分號，並補上正確的大括號區塊
if (
  isCalculating ||
  !ageData ||
  ageData.isError ||
  !height ||
  !debouncedWeight ||
  ageForCalculation === null
) {
  return null;
}

    const h = parseFloat(height);
    const w = parseFloat(weight);
    const age = ageForCalculation;
    const hData = gender === 'boy' ? boyHeightData : girlHeightData;
    const wData = gender === 'boy' ? boyWeightData : girlWeightData;

    const idx = findClosestIndices(age, hData.Age);
    const a0 = hData.Age[idx[0]];
    const a1 = hData.Age[idx[1]];


const getInterpolatedP = (data: any, val: number) => {
  // 1. 定義我們數據庫裡有的七味藥（注意 " 3rd" 前面的空格）
  const percentiles = [3, 15, 25, 50, 75, 85, 97];
  const keys = [" 3rd", "15th", "25th", "50th", "75th", "85th", "97th"];

  // 2. 先算出這孩子在當前年齡，這七條基準線分別代表多少數值
  const pValuesAtAge = keys.map(key => 
    interpolateValue(age, a0, a1, data[key][idx[0]], data[key][idx[1]])
  );

  let percentile = 0;

  // 3. 開始分段內插判讀
  if (val < pValuesAtAge[0]) {
    // 比 3rd 還小：從 0 到 3 內插
    percentile = interpolateValue(val, 0, pValuesAtAge[0], 0, 3);
  } else if (val > pValuesAtAge[6]) {
    // 比 97th 還大：從 97 到 100 內插
    percentile = interpolateValue(val, pValuesAtAge[6], pValuesAtAge[6] * 1.2, 97, 100);
  } else {
    // 落在七條線之間：找出到底是哪一段，精確內插
    for (let i = 0; i < pValuesAtAge.length - 1; i++) {
      if (val >= pValuesAtAge[i] && val <= pValuesAtAge[i + 1]) {
        percentile = interpolateValue(
          val, 
          pValuesAtAge[i], 
          pValuesAtAge[i + 1], 
          percentiles[i], 
          percentiles[i + 1]
        );
        break;
      }
    }
  }

  return {
    value: val,
    percentile: Math.max(0, Math.min(100, percentile)),
    p50: pValuesAtAge[3] // 50th 是索引 3
  };
};


    const hRes = getInterpolatedP(hData, h);
    const wRes = getInterpolatedP(wData, w);
    const bmi = calculateBMI(w, h);
    const bmiCategory = determineWeightCategory(bmi, age, gender);

    // Calculate Bone Age Predicted Height
    let boneAgePredictedHeight = null;
    let boneAgeDeviation: BoneAgeDeviation = null;
    let usedMaturity: MaturityCategory | null = null;

    if (boneAge) {
      const ba = parseFloat(boneAge);
      if (manualMaturity) {
        usedMaturity = manualMaturity;
      } else {
        const diff = ba - age;
        if (diff >= 1) usedMaturity = 'accelerated';
        else if (diff <= -1) usedMaturity = 'retarded';
        else usedMaturity = 'average';
      }

      boneAgePredictedHeight = calculateBoneAgePredictedHeight(gender, ba, age, h, usedMaturity);
      if (fatherHeight && motherHeight) {
        const inherited = calculateInheritedHeight(gender, parseFloat(fatherHeight), parseFloat(motherHeight));
        boneAgeDeviation = calculateBoneAgeDeviation(boneAgePredictedHeight, inherited.min, inherited.max);
      }
    }

    // Calculate Genetic Percentile (MPH Percentile)
    let geneticPercentile = null;
    let geneticComparison = '';
    if (fatherHeight && motherHeight) {
      const inherited = calculateInheritedHeight(gender, parseFloat(fatherHeight), parseFloat(motherHeight));
      const adultData: Record<string, number> = {};
      Object.keys(hData).forEach(key => {
        if (key !== 'Age') {
          adultData[key] = (hData as any)[key][hData.Age.length - 1];
        }
      });
      geneticPercentile = calculatePercentileFromValue(inherited.median, adultData);
      
      const diff = hRes.percentile - geneticPercentile;
      if (diff < -15) {
        geneticComparison = '⚠️ 根據 Tanner 遺傳模型預估，目前生長曲線有偏離現象（落後），建議諮詢專業中西醫調養。';
      } else if (diff > 15) {
        geneticComparison = '⚠️ 根據 Tanner 遺傳模型預估，目前生長曲線有偏離現象（超前），需留意性早熟風險，建議諮詢專業中西醫調養。';
      } else {
        geneticComparison = '符合遺傳預期。';
      }
    }

    const quadrant = checkGrowthQuadrant(gender, age, hRes.percentile);

    const pubertyAssessment =
      tannerStage !== null
        ? getTannerPubertyAssessment(gender, age, tannerStage)
        : getPercentilePubertyAssessment(gender, age, hRes.percentile);

    const bmiAdvice = bmiCategory === "體重過輕" ? "underweight" : (bmiCategory === "體重過重" || bmiCategory === "肥胖" ? "overweight" : null);
    
    let geneticAdvice: keyof typeof ADVICE_TEXTS | null = null;
    if (geneticPercentile !== null) {
      const diff = hRes.percentile - geneticPercentile;
      if (diff > 15) geneticAdvice = "genetic_fast";
      else if (diff < -15) geneticAdvice = "genetic_slow";
    }

    return {
      hRes,
      wRes,
      bmi,
      bmiCategory,
      geneticPercentile,
      geneticComparison,
      quadrant,
      pubertyAssessment,
      bmiAdvice,
      geneticAdvice,
      boneAgePredictedHeight,
      boneAgeDeviation,
      usedMaturity
    };
  }, [ageForCalculation, ageData, height, weight, gender, fatherHeight, motherHeight, boneAge, manualMaturity, tannerStage, isCalculating]);


  const inherited = useMemo(() => {
    if (!fatherHeight || !motherHeight) return null;
    return calculateInheritedHeight(gender, parseFloat(fatherHeight), parseFloat(motherHeight));
  }, [gender, fatherHeight, motherHeight]);

  const formatPercentile = (p: number) => {
    if (p < 3) return { text: '< 3rd', isExtreme: true };
    if (p > 97) return { text: '> 97th', isExtreme: true };
    return { text: `${p.toFixed(1)}`, isExtreme: false };
  };
  
const getTannerOptions = (gender: Gender) => {
  if (gender === 'girl') {
    return [
      {
      value: 0 as TannerStage,
      label: '未開始',
      hint:  '乳房平坦（Stage 1）'
    },
    {
      value: 1 as TannerStage,
      label: '開始',
      hint:  '乳房芽出現（Stage 2）'
    },
    {
      value: 2 as TannerStage,
      label: '發育中',
      hint:  '乳房明顯隆起（Stage 3）'
    },
    {
      value: 3 as TannerStage,
      label: '後期',
      hint:  '月經已來／接近成熟（Stage 4–5）'
      }
    ];
  }

  return [
    {
      value: 0 as TannerStage,
      label: '未開始',
      hint: '無明顯第二性徵（Stage 1）'
    },
    {
      value: 1 as TannerStage,
      label: '開始',
      hint: '睪丸開始變大 ≥4 mL（Stage 2）'
    },
    {
      value: 2 as TannerStage,
      label: '發育中',
      hint: '陰莖開始變長（Stage 3）'
    },
    {
      value: 3 as TannerStage,
      label: '後期',
      hint: '變聲後／接近成熟（Stage 4–5）'
    }
  ];
};
  
const copyResults = () => {
  if (!results || !ageData) return;
  const today = new Date().toLocaleDateString('zh-TW');
  
  // 💡 姓名與性別合併邏輯
  const displayName = childName.trim() ? childName : '小朋友';
  const genderLabel = gender === 'boy' ? '男' : '女';
  const nameAndGenderRow = `姓名：${displayName} (${genderLabel})`;
  
  // --- ✅ 修正：年齡摘要邏輯 ---
  let ageSummary = `年齡：${ageData.display}`;
  if (isPreterm && correctedAgeData) {
    // 這裡把「實際、矯正、註解」通通包起來
    ageSummary = `實際年齡：${ageData.display}\n矯正年齡：${correctedAgeData.display} (${gestationalWeeks}週${gestationalDays || 0}天)\n(註：本次生長評估採用「矯正年齡」計算)`;
  }
  // -----------------------

  const hP = formatPercentile(results.hRes.percentile).text;
  const wP = formatPercentile(results.wRes.percentile).text;
  
  const fHText = fatherHeight ? `父親身高：${fatherHeight} cm` : '';
  const mHText = motherHeight ? `母親身高：${motherHeight} cm` : '';
  const thText = inherited 
    ? `父母遺傳目標身高 (TH)： ${inherited.median.toFixed(1)} cm (${inherited.min.toFixed(1)} - ${inherited.max.toFixed(1)})` 
    : '';
  const pahText = results.boneAgePredictedHeight 
    ? `骨齡預估成年身高 (PAH)：${results.boneAgePredictedHeight.toFixed(1)} cm` 
    : '';

  // 💉 組合最終文字：這裡要把原本的 "年齡：${ageData.display}" 換成 "${ageSummary}"
  const text = `
您好！這是今天 (${today}) 幫【${displayName}】做的成長分析報告 🌱

【兒童成長小幫手 - 數據摘要】
${nameAndGenderRow}
${ageSummary}
身高：${height} cm (百分位: ${hP})
體重：${weight} kg (百分位: ${wP})
體態：${results.bmiCategory} (BMI: ${results.bmi})

${fHText}
${mHText}
${boneAge ? `臨床骨齡：${boneAge} 歲` : ''}
${thText}
${pahText}

阿銘醫師叮嚀：成長發育的黃金期只有一次，除了看數據，記得讓孩子多跳繩、早點睡喔！💪

日期：${today}
  `.trim();

  navigator.clipboard.writeText(text).then(() => {
    setModal({
      isOpen: true,
      title: '複製成功',
      content: `幫 ${displayName} 準備的分析結果（含矯正年齡對照）已複製到剪貼簿！`
    });
  });
};

 const exportCSV = () => {
    if (!results || !ageData) return;
    const hP = formatPercentile(results.hRes.percentile).text;
    const wP = formatPercentile(results.wRes.percentile).text;

    // 1. 準備數據變數
    const thCombined = inherited 
      ? `"${inherited.median.toFixed(1)} (${inherited.min.toFixed(1)} - ${inherited.max.toFixed(1)})"` 
      : '';
    const pahValue = results.boneAgePredictedHeight?.toFixed(1) || '';
    const boneAgeValue = boneAge || '';
    
    // --- 關鍵優化：動態判斷早產欄位 ---
    // 如果沒勾選，這些格子就給空白，維持表格整潔
    const correctedAgeStr = (isPreterm && correctedAgeData) ? `"${correctedAgeData.display}"` : '';
    const pretermInfo = isPreterm ? `${gestationalWeeks}週${gestationalDays || 0}天` : '足月';
    const calculationBasis = isPreterm ? '矯正年齡' : '實際年齡';

    // 2. 標題列 (這部分固定，方便你以後把多份 CSV 整合在一起)
    const headers = "\uFEFF日期,姓名,性別,實際年齡,矯正年齡,出生週數,評估基準,身高(cm),身高百分位,體重(kg),體重百分位,BMI,BMI判定,父親身高(cm),母親身高(cm),遺傳預估身高TH(cm),臨床骨齡,骨齡預估身高PAH(cm)\n";
    
    // 3. 數據列
    const row = [
      new Date().toLocaleDateString('zh-TW'),
      childName || '未填寫',
      gender === 'boy' ? '男' : '女',
      `"${ageData.display}"`,
      correctedAgeStr,      // 沒勾選就噴空白 ""
      pretermInfo,          // 沒勾選顯示 "足月"
      calculationBasis,     // 沒勾選顯示 "實際年齡"
      height,
      hP,
      weight,
      wP,
      results.bmi,
      results.bmiCategory,
      fatherHeight || '',
      motherHeight || '',
      thCombined,
      boneAgeValue,
      pahValue
    ].join(',') + "\n";
    
    const blob = new Blob([headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = childName ? `成長紀錄_${childName}_${dateStr}.csv` : `成長追蹤_${dateStr}.csv`;
    
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

const qaData = [
  { 
    q: "認識設計者：吳啓銘醫師｜仨寶爸中醫博士", 
    a: "「爸，為什麼你會當醫師？」這是我女兒有一天問我的問題 … 我想了想，回答她：「因為我想讓小朋友不要老是跑醫院，把身體顧好一點，長大比較輕鬆。」這句話，其實也是我一路從醫學院、中醫博士班到現在走進臨床的心情縮影。我是阿銘醫師，一位中醫兒科與體質調理專家，也是一位養著三個小孩的爸爸。我相信中醫的智慧可以成為家長的靠山，讓我們不用慌張，而是穩穩地，一步步陪孩子走過最重要的黃金發育期。",
    link: "https://drwu.carrd.co/",
    linkText: "更多資訊：阿銘醫師的個人個人網站"
  },
  {
    q: "本工具之數據引用來源為何？", 
    a: "本工具之判定標準遵循衛生福利部國民健康署公告之建議值：\n\n" +
       "● 0–5 歲判定標準：採用世界衛生組織 (WHO) 公布之「國際嬰幼兒生長標準」。\n" +
       "● 7–18 歲判定標準：依據陳偉德醫師及張美惠醫師 2010 年發表之研究成果（以 1997 年台灣學生體適能檢測資料為基礎）。\n" +
       "● 5–7 歲銜接邏輯：參考 WHO BMI Rebound 趨勢進行數據平滑銜接。\n" +
       "● 遺傳預測模型：採用臨床常用之 Bayley–Pinneau (BP) 預測模型，原始數據源自 J Pediatr (1952;40:423-441)。",
    link: "https://www.pediatr-neonatol.com/article/S1875-9572(10)60014-9/pdf",
    linkText: "參考文獻：台灣兒少生長新曲線研究"
  },
  {
    q: "關於百分位計算邏輯與落差說明", 
    a: "本工具百分位計算採用「精密分段線性內插法」。不同工具即便數據同樣參考國健署標準，若計算邏輯不同，仍會產生微小落差：\n\n" +
       "● 完整還原原始論文七段基準線：\n" +
       "一般工具多採簡化後的五段線（P3, P15, P50, P85, P97）進行估算。本工具嚴格遵循原始論文規格，完整調用數據庫中之七段基準線（含 P25 與 P75），增加量尺刻度的精密密度，能更細膩地定位百分位落點。\n\n" +
       "● 先定時間：精密的實足年齡\n" +
       "系統依據出生年月日，算出精確的實足年齡。即便原始數據為每 0.5 歲一檔，也會先精密推算出「測量當天」專屬的七條基準線，避免因生日邊界導致數據跳躍。\n\n" +
       "● 後定數值：分段精密內插\n" +
       "計算邏輯捨棄跨月估算，先產出當日精密量尺，再進行分段內插。此兩段式邏輯能減少線性誤差，完整還原真實的生長軌跡。\n\n" +
       "阿銘醫師提醒：計算結果僅供參考。比起單次數值，重點應放在孩子在百分位的位置是否短時間內「大幅改變」或「突然跨區」，這才是觀察生長趨勢、評估發育健康的核心指標。",
    link: "https://www.pediatr-neonatol.com/article/S1875-9572(10)60014-9/pdf",
    linkText: "參考文獻：台灣兒少生長新曲線研究"
  },
  {
    q: "為什麼 3 歲以下的早產兒需要計算「矯正年齡」？",
    a: "「實足年齡」是從孩子出生當天算起，而「矯正年齡」則是從原訂預產期開始計算。\n\n" +
       "● 臨床必要性：早產兒在兩歲（甚至三歲）之前的器官發育、大動作發展與身高體重，通常需以「矯正年齡」來對照生長曲線才具參考價值，避免與足月兒比較而產生不必要的焦慮。\n" +
       "● 系統限制：本工具自動設定為「3 歲」門檻。只要孩子實際年齡未滿 3 歲，系統提供矯正功能；一旦滿 3 歲，生長評估將強制回歸實際年齡，這也符合多數臨床追蹤的實務標準。\n" +
       "● 計算公式：矯正年齡 = 實際年齡 - (40 週 - 出生胎齡)。",
    link: "https://www.hpa.gov.tw/Pages/ashx/GetFile.ashx?lang=c&type=1&sid=1fa9b39797af45fbad7859ab302b0099",
    linkText: "參考資料：國健署早產兒居家護理手冊"
  },
  {
    q: "BMI 百分位之判定標準依據為何？",
    a: "本系統採用衛生福利部國民健康署於民國 102 年公布之「台灣兒童及青少年 BMI 參考值」。\n\n判定標準定義如下：\n● 低於第 5 百分位：體重過輕\n● 第 85–95 百分位：過重\n● 高於第 95 百分位：肥胖\n\n此標準係針對台灣本土兒童族群建立，具備高度臨床參考價值。需注意 BMI 為身高與體重之比例指標，無法區分脂肪與肌肉比例，實際判讀仍建議結合體脂監測與醫師評估。",
    link: "https://www.hpa.gov.tw/Pages/ashx/GetFile.ashx?lang=c&type=1&sid=e6eea0f57e5e471b9b7096094746d643",
    linkText: "參考資料：國民健康署公告"
  },
  {
    q: "「發育狀態提醒」的判定邏輯為何？",
    a: "本系統整合「實足年齡」、「身高百分位」與「第二性徵 (Tanner stage)」進行綜合評估，採階層式判讀：\n\n" +
       "● 第一層：臨床發育判讀 (優先準則)\n若提供第二性徵 (Tanner stage) 資訊，系統將優先以「生物年齡發育進展」進行判讀。臨床上，女性以乳房發育 (B2)、男性以睪丸體積增加 (≥ 4 mL) 作為青春期啟動首要指標。若發育時程明顯偏離生理均值（如女孩早於 8 歲、男孩早於 9 歲），系統將提示潛在風險。\n\n" +
       "● 第二層：數據百分位推估 (輔助參考)\n若未填寫第二性徵資訊，則採「身高百分位與年齡之關聯性」進行初步篩檢。例如女孩 8-10 歲或男孩 9-11 歲若身高百分位過高 (> 85th)，可能代表發育節奏提前。此為間接推估，確切狀態仍應以臨床觸診與骨齡評估為準。",
    link: "https://my.clevelandclinic.org/health/body/puberty",
    linkText: "參考資料：Cleveland Clinic"
  },
  { 
    q: "「骨齡預估與遺傳偏差」的判定邏輯為何？", 
    a: "本系統將「骨齡預估成年身高（PAH）」與「遺傳目標身高範圍（TH Range）」進行數據對照，臨床分級邏輯如下：\n\n● 明顯高於預期：PAH 超過遺傳上限 5cm（含）以上。需排除骨齡過度超前或性早熟導致之生長板提早閉合風險。\n● 高於遺傳範圍：PAH 高於遺傳上限，但未達 5cm。代表生長表現優於遺傳基準，建議持續監測發育節奏。\n● 符合遺傳預期：PAH 落在遺傳目標範圍內，顯示生長軌跡發展穩定。\n● 略低於預期：PAH 低於遺傳下限，建議檢視蛋白質攝取、睡眠品質與運動強度。\n● 明顯低於預期：PAH 低於遺傳下限 5cm（含）以上。需高度警覺是否存在生長激素分泌、營養吸收障礙或慢性體質因素，建議由專業醫師進行內分泌與骨齡進階評估。\n\n【補充說明】\n預估數據係依據統計模型趨勢，實際判讀仍應結合骨齡熟成速度與中醫體質辨證綜合考量。"
  },
  {
    q: "「生長軌跡與遺傳基準偏差」的判定邏輯為何？",
    a: "當孩子的「目前身高百分位」與根據父母身高推算出的「遺傳目標百分位 (TH Percentile)」落差超過 15 個百分位時，系統便會判定為生長偏離並觸發提醒。\n\n" +
       "● 生長表現高於預期 (落差 > +15%)：代表現階段生長速度較快。雖不一定異常，但仍建議結合骨齡與第二性徵發育情況，排除性早熟或骨骼過度提早成熟之風險。\n" +
       "● 生長表現低於預期 (落差 < -15%)：顯示目前生長動能稍弱。建議檢視近期睡眠品質、營養攝取（如優質蛋白質與熱量）與腸胃吸收情形。若百分位持續下滑，建議由專業中、西醫師進一步評估。"
  },
  {
    q: "如何計算孩子未來的預估成年身高？", 
    a: "預估成年身高主要區分為「遺傳潛力」與「發育現況」兩個評估維度：\n\n● 遺傳目標身高（Target Height, TH）：\n此為依據父母身高推估之遺傳潛力區間（學術稱 mid-parental height）。多數個體最終身高會落在遺傳目標約 ±8–10 cm 之區間內；台灣常見常態變異範圍為：男孩 ±7.5 cm、女孩 ±6 cm。\n\n● 預估成年身高（PAH, Predicted Adult Height）：\n依據「骨齡（Skeletal Age）」進行推估。本工具整合 Bayley–Pinneau（BP）模型，依據骨骼成熟度自動區分三種類型：\n1. 早熟（Accelerated）：骨齡較實際年齡超前 1 歲（含）以上。\n2. 晚熟（Retarded）：骨齡較實際年齡落後 1 歲（含）以上。\n3. 平均（Average）：兩者差距小於 1 歲。\n\n相較於單純以實足年齡判斷，此法能更精準反映個體之發育動態與剩餘生長空間。\n\n【注意事項】\n預估數據僅供生長趨勢參考，最終成年身高仍受後天營養、睡眠及生理狀態之綜合影響。"
  },
  { 
    q: "骨齡預估成年身高之 BP 模型是否考慮台灣與國際標準之差異？", 
    a: "此為臨床預測中極為專業且關鍵之議題。儘管 Bayley–Pinneau (BP) 模型為目前國際內分泌科之通用標準工具，但受種族基因、營養條件與生活環境影響，台灣兒童之發育節律可能與早期西方族群樣本存在細微偏差。\n\n【臨床判讀原則】\n1. 趨勢參考價值：BP 模型在評估「成長剩餘空間」與「生長趨勢監測」上仍具高度臨床價值。\n2. 多維度綜合比對：為降低單一模型之系統誤差，本工具特別設計「骨齡預估身高 (PAH)」與「遺傳目標身高 (TH)」之交叉比對功能。\n3. 偏差提醒機制：系統透過提醒機制，旨在提供醫師與家長一個多維度的評估視角，而非單一依賴特定模型數據。"
  },
  {
    q: "孩子什麼時候需要安排「骨齡 (Bone Age)」檢查？",
    a: "「實足年齡」是出生證明上的數字，而「骨齡」則是反映生長板成熟度的「生理時鐘」。\n\n阿銘醫師建議，出現以下四種情況時，最需要安排檢查：\n● 生長軌跡偏離：生長曲線突然跨區（例如從 50th 掉到 15th，或突然衝高），代表生長動力不尋常。\n● 身高極端：身高低於第 3 百分位（太矮）或高於第 97 百分位（太高）。\n● 發育時鐘提早：女孩 8 歲前、男孩 9 歲前出現第二性徵，需排除性早熟導致生長板提早閉合的風險。\n● 預測終身高：若想更精準地結合遺傳目標 (TH) 來評估未來的成年身高。\n\n簡單來說，骨齡就像是「看油表」，讓我們知道孩子的成長空間還有多少。建議由醫師評估後，在關鍵轉折點檢查即可，不需頻繁曝露放射線。"
  },
  {
    q: "如果系統跳出生長偏離或提醒按鈕，家長該如何處理？",
    a: "看到提醒請先保持冷靜，數據偏離並不直接代表疾病，而是提醒我們需關注孩子的「生長節奏」。建議採取以下步驟：\n\n1. 觀察趨勢：單次的數據偏離可能是測量誤差或短期的生長波動。建議每 3-6 個月定期追蹤，觀察生長曲線是否持續偏離原有軌跡。\n2. 檢視生活：回想孩子近期的睡眠（是否晚於 10 點）、營養攝取（優質蛋白質是否足夠）以及運動頻率。\n3. 專業諮詢：若連續兩次測量皆顯示偏離，或年生長速度一年小於 4 公分，建議與專業醫師討論是否需安排進一步評估。"
  },
  {
    q: "中醫在兒童生長發育中，扮演什麼樣的角色？",
    a: "生長發育不只是身高的增加，更是全身臟腑氣血平衡的表現。中醫的介入重點在於「調和脾胃」與「補益腎氣」，特別針對以下情況有顯著幫助：\n\n● 脾胃運化：針對食慾不振、挑食或吸收不良的孩子，中醫透過調理脾胃，讓營養能有效轉化為成長動能。\n● 體質干擾：過敏性鼻炎、睡眠品質差或壓力大也會影響生長激素分泌。中醫透過體質調理改善這些「成長阻力」，讓孩子長得更輕鬆。\n● 轉骨時機：中醫強調「因材施教」，針對不同發育階段提供個人化轉骨方，而非盲目進補。透過數據監測，我們能精準掌握介入的黃金期。\n\n阿銘醫師提醒：中、西醫結合能更全方位地守護孩子，讓發育過程長得穩、長得壯。"
  },
  {
    q: "本工具之適用對象與使用建議為何？",
    a: "本工具旨在提供家長及臨床醫療人員作為兒童生長發育之評估參考。系統整合各項數據，輔助監測成長趨勢與發育動態。\n\n【注意事項】\n所有分析數據均係依據統計模型產生，僅供參考。生長發育受個體體質、遺傳與環境等多重因素影響，若數據出現偏離或有臨床疑慮，務必諮詢專業醫師進行詳盡評估，不可單憑數據作為醫療決策之唯一依據。"
  }
];

  return (
    <div className="min-h-screen bg-bg text-ink font-sans pb-32">
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        content={modal.content}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-16 space-y-8 sm:space-y-16">
{/* Header Section */}
<header className="text-center mb-10 sm:mb-16 relative">
  {/* 使用 flex 容器，確保標題與 QR Code 水平對齊 */}
  <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
    
    {/* 左側標題區 */}
    <div className="space-y-4">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-4xl font-black tracking-tight text-ink font-display"
      >
        兒童成長 <span className="text-accent underline decoration-accent/20 underline-offset-8">小幫手</span>
      </motion.h1>
      <p className="text-ink-muted font-semibold text-base sm:text-xl max-w-xl mx-auto leading-relaxed">
        基於台灣本土數據，守護孩子健康成長。
      </p>
    </div>

    {/* 右側 QR Code 區：只在電腦版顯示，不佔用垂直空間 */}
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="hidden lg:flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100"
    >
      <div className="w-28 h-28 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden">
        {/* 這裡放你的 QR Code 圖片網址，或用實體元件 */}
        <img 
          src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://chimungwu.github.io/tw-growth-helper/" 
          alt="QR Code" 
          className="w-24 h-24 mix-blend-multiply"
        />
      </div>
      <span className="text-[12px] font-black text-slate-400 mt-2 tracking-widest uppercase">Scan Me</span>
    </motion.div>

  </div>
</header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Right Column (Desktop): Input Form & Desktop Q&A */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24 order-1 lg:order-2">
            {/* Input Form Section */}
            <div className="glass-card p-5 sm:p-10 space-y-6 sm:space-y-10">
              {/* Gender Selection */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em]">1. 選擇性別</label>
                  <button 
                    onClick={() => {
                      setBirthdateInput(''); setHeight(''); setWeight(''); setBoneAge(''); setIsPreterm(false); setGestationalWeeks('');
                      setGestationalDays(''); setFatherHeight(''); setMotherHeight('');
                      setModal({ isOpen: true, title: '已重置', content: '所有輸入資料已清除。' });
                    }}
                    className="flex items-center gap-2 text-base font-black text-slate-600 hover:text-red-500 transition-colors uppercase tracking-widest"
                     title="重置資料"
                  >
                    <RefreshCcw size={18} />
                    重置
                  </button>
                </div>
                <div className="flex p-2.5 bg-slate-100 rounded-[32px] gap-2.5">
                  <button 
                    onClick={() => setGender('boy')}
                    className={`flex-1 py-5 rounded-[24px] text-lg font-black transition-all flex items-center justify-center gap-3 ${gender === 'boy' ? 'bg-white text-boy shadow-xl shadow-boy/10' : 'text-slate-400 hover:bg-white/50'}`}
                  >
                    <span className="text-2xl">👦</span> 男孩
                  </button>
                  <button 
                    onClick={() => setGender('girl')}
                    className={`flex-1 py-5 rounded-[24px] text-lg font-black transition-all flex items-center justify-center gap-3 ${gender === 'girl' ? 'bg-white text-girl shadow-xl shadow-girl/10' : 'text-slate-400 hover:bg-white/50'}`}
                  >
                    <span className="text-2xl">👧</span> 女孩
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-2">
                    <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em]">2. 生日或年齡</label>
                    <span className="text-xs text-accent font-black uppercase tracking-widest bg-accent/5 px-3 py-1 rounded-full">支援民國、西元、歲數</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-accent group-focus-within:scale-125 transition-transform">
                      <Calendar size={24} />
                    </div>
<input 
    type="text"
    inputMode="decimal"
    placeholder="1020520 or 20130520 or 12"
    value={birthdateInput}
    onChange={(e) => setBirthdateInput(e.target.value)}
className={`input-field pl-16 sm:pl-20 pr-6 sm:pr-10 text-base sm:text-lg transition-all ${
      ageData?.isError 
        ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/10' 
        : 'border-slate-200 focus:border-accent'
    }`}
  />
</div>

{/* ✅ 警示文字也要跟在生日下面 */}
<AnimatePresence>
  {ageData?.isError && (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 ml-4 mt-2 text-rose-500 font-black text-xs"
    >
      <Info size={14} />
      <span>{ageData.display}</span>
    </motion.div>
  )}
</AnimatePresence>
                </div>
    
{ageData && !ageData.isError && ageData.years <= 3 && (
  <div className="space-y-4">
    <div className="flex items-center justify-between ml-2">
      <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em]">
        2-1. 早產資訊
      </label>
      <span className="text-xs text-slate-400">選填</span>
    </div>

    <label className="flex items-center gap-3 ml-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={isPreterm}
        onChange={(e) => {
          const checked = e.target.checked;
          setIsPreterm(checked);
          if (!checked) {
            setGestationalWeeks('');
            setGestationalDays('');
          }
        }}
        className="w-4 h-4"
      />
<span className="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
    早產兒，需評估矯正年齡
  </span>
    </label>

    {isPreterm && (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            min="20"
            max="36"
            step="1"
            placeholder="出生胎齡（週）"
            value={gestationalWeeks}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                setGestationalWeeks('');
                return;
              }
              if (/^\d+$/.test(v)) {
                setGestationalWeeks(v);
              }
            }}
            className={`input-field ${weeksError ? 'border-rose-500 bg-rose-50' : ''}`}
          />

          <input
            type="number"
            min="0"
            max="6"
            step="1"
            placeholder="天數（選填）"
            value={gestationalDays}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') {
                setGestationalDays('');
                return;
              }
              if (/^\d+$/.test(v)) {
                setGestationalDays(v);
              }
            }}
            className={`input-field ${daysError ? 'border-rose-500 bg-rose-50' : ''}`}
          />
        </div>

        {weeksError && (
          <p className="text-xs text-rose-500 ml-2 mt-1">
            請輸入 20～36 週
          </p>
        )}

        {daysError && (
          <p className="text-xs text-rose-500 ml-2 mt-1">
            天數請輸入 0～6
          </p>
        )}

<p className="text-sm font-semibold text-blue-700 leading-relaxed ml-2 bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center gap-2">
  <Info size={16} className="text-blue-400" />
  未滿 3 歲的早產兒，生長評估通常需參考矯正年齡。
</p>
      </div>
    )}
  </div>
)}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em] ml-2">3. 目前身高 (cm)</label>
                    <div className="relative group">
                      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-accent">
                        <Ruler size={24} />
                      </div>
                      <input 
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="120.5"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="input-field pl-16 sm:pl-20 pr-6 sm:pr-8 text-base sm:text-lg"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em] ml-2">4. 目前體重 (kg)</label>
                    <div className="relative group">
                      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-accent">
                        <Weight size={24} />
                      </div>
                      <input 
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="25.0"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="input-field pl-16 sm:pl-20 pr-6 sm:pr-8 text-base sm:text-lg"
                      />
                    </div>
                  </div>
                </div>

{/* 預估成年身高進階選項 (包含父母身高與骨齡) */}
<div className="pt-8 border-t-2 border-slate-100">
  <button 
    onClick={() => setShowParents(!showParents)}
    className="w-full flex items-center justify-between py-3 group"
  >
    <div className="flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${showParents ? 'bg-accent scale-125' : 'bg-slate-200'}`} />
      <span className="text-sm font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-accent transition-colors">進階資料 (選填)</span>
    </div>
    <div className={`w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-accent transition-all duration-500 ${showParents ? 'rotate-180 bg-accent text-white' : ''}`}>
      <ChevronDown size={20} />
    </div>
  </button>
  
  <AnimatePresence>
  {showParents && (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-8 space-y-8 pb-8">

{/* 5. 父母身高區塊 */}
        <div className="space-y-4">
          <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em] ml-2 block">
            5. 父母身高
          </label>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-widest text-center block">
                爸爸身高 (cm)
              </label>
              <input 
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="170"
                value={fatherHeight}
                onChange={(e) => setFatherHeight(e.target.value)}
                className="input-field text-center text-base sm:text-lg"               
              />
            </div>
            <div className="space-y-4">
              <label className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-widest text-center block">
                媽媽身高 (cm)
              </label>
              <input 
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="160"
                value={motherHeight}
                onChange={(e) => setMotherHeight(e.target.value)}
                className="input-field text-center text-base sm:text-lg"
              />
            </div>
          </div>
        </div>

{/* 💉 阿銘醫師補方：琥珀色醒目版 */}
{(!ageData || (ageData && ageData.years < 8)) && (
  <div className="mt-8 p-5 bg-amber-50 rounded-[24px] border-2 border-dashed border-amber-200 shadow-sm">
    <div className="flex items-center gap-3 justify-center text-amber-700">
      <Info size={20} className="shrink-0" />
      <p className="text-sm sm:text-base font-black leading-relaxed">
        滿 8 歲後，系統將自動開啟「臨床骨齡」與「性徵評估」功能 (選填)
      </p>
    </div>
  </div>
)}

        {/* 只有 8 歲以上才顯示「臨床骨齡」與「臨床評估」 */}
        {ageData && ageData.years >= 8 && (
          <div className="space-y-8 pt-8 border-t border-slate-50">
            {/* 6. 臨床骨齡區塊 */}
            <div className="space-y-4">
              <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em] ml-2 block">
                6. 臨床骨齡
              </label>
              <div className="relative group">
                <div className="absolute left-8 top-1/2 -translate-y-1/2 text-accent">
                  <Bone size={24} />
                </div>
                <input 
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="10.5"
                  value={boneAge}
                  onChange={(e) => setBoneAge(e.target.value)}
                  className="input-field pl-16 sm:pl-20 pr-6 sm:pr-8 text-base sm:text-lg"
                />
              </div>
            </div>

            {/* 7. 臨床評估區塊 */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm sm:text-base font-black text-slate-600 uppercase tracking-[0.3em] ml-2">
                  7. 臨床評估
                </label>
                <button
                  type="button"
                  onClick={() => setShowTannerGuide(true)}
                  className="text-xs text-accent font-bold hover:underline"
                >
                  參考圖
                </button>
              </div>

              <span className="block text-[11px] text-slate-400 ml-2">選填</span>

              <p className="text-xs text-slate-500 leading-relaxed">
                供醫師或已接受第二性徵評估者使用。填寫後，系統會優先依臨床發育資訊進行發育提醒判讀。
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-stretch">
                {getTannerOptions(gender).map((option) => {
                  const active = tannerStage === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTannerStage(option.value)}
                      className={`h-full min-h-[88px] rounded-2xl border px-3 py-3 text-left transition-all duration-200 flex flex-col justify-start ${
                        active
                          ? 'border-accent bg-accent/10 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-800 leading-tight">
                        {option.label}
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-slate-500 min-h-[32px]">
                        {option.hint}
                      </div>
                    </button>
                  );
                })}
              </div>

              {tannerStage !== null && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setTannerStage(null)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    清除 Tanner 評估
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
</div>
                
{/* Tanner Guide Modal */}
{showTannerGuide &&
  createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={() => setShowTannerGuide(false)}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg mb-3 text-center">
          Tanner Stage 參考圖
        </h3>

        <img
          src={
            gender === 'girl'
              ? `${import.meta.env.BASE_URL}tanner_girl.png`
              : `${import.meta.env.BASE_URL}tanner_boy.png`
          }
          alt="tanner"
          className="w-full rounded-lg"
        />
        
{/* CC 授權標註區塊：男女作者完全區分版 */}
<div className="mt-3 px-1 text-[10px] text-slate-400 leading-tight border-t pt-2 border-slate-50 text-left">
  <p>
    圖源：
    <a 
      href={gender === 'girl' 
        ? "https://commons.wikimedia.org/wiki/File:Tanner_scale-female.svg" 
        : "https://commons.wikimedia.org/wiki/File:Tanner_scale_male_intact.svg"} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="underline"
    >
      {gender === 'girl' ? 'Tanner scale-female.svg' : 'Tanner scale male intact.svg'}
    </a>
  </p>
  <p>
    作者：
    {gender === 'girl' 
      ? 'Michał Komorniczak (Poland)' 
      : 'MatviiFediura (based on Michał Komorniczak)'}
  </p>
  <p>
    授權：
    <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline ml-1">
      CC BY-SA 3.0
    </a>
  </p>
</div>
        
        <button
          onClick={() => setShowTannerGuide(false)}
          className="mt-4 w-full py-2 bg-slate-100 rounded-xl"
        >
          關閉
        </button>
      </div>
    </div>,
    document.body
  )}
</div>
            {/* Desktop Q&A Preview */}
            <div className="hidden lg:block glass-card rounded-[40px] p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                  <HelpCircle size={20} />
                </div>
                <h3 className="text-lg font-black text-ink font-display">常見問題</h3>
              </div>
              <p className="text-xs text-ink/50 font-medium leading-relaxed">
                有關於生長曲線、遺傳身高或 BMI 的疑問嗎？查看下方的 Q&A 區塊了解更多專業建議。
              </p>
              <button 
                onClick={() => {
                  const qaSection = document.getElementById('qa-section');
                  qaSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-black text-accent hover:underline flex items-center gap-2"
              >
                前往 Q&A 區塊 <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Left Column (Desktop): Results Section */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
            <div ref={resultsRef} className="scroll-mt-24">
              <AnimatePresence mode="wait">
                {isCalculating ? (
                  <motion.div 
                    key="calculating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-card p-8 sm:p-16 flex flex-col items-center justify-center space-y-5 sm:space-y-8"
                  >
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 sm:w-20 sm:h-20 border-8 border-accent/10 border-t-accent rounded-full"
                    />
                    <p className="text-xl font-black text-accent uppercase tracking-[0.3em] animate-pulse">精確分析中</p>
                  </motion.div>
                ) : results ? (
                  <motion.div 
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                  >
                  {/* Main Result Card */}
                  <div className="glass-card p-5 sm:p-10 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 blur-[100px] opacity-30 ${gender === 'boy' ? 'bg-boy' : 'bg-girl'}`} />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full -ml-24 -mb-24 blur-[100px]" />
                    
                    <div className="relative z-10 space-y-10">
                      
  {/* ✅ 插在這裡 */}
{isPreterm && ageData && !ageData.isError && correctedAgeData && (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
    <div className="text-sm text-slate-700">
      <span className="font-bold">實際年齡：</span>
      {ageData.display}
    </div>
    <div className="text-sm text-slate-700">
      <span className="font-bold">矯正年齡：</span>
      {correctedAgeData.display}
    </div>
    <div className="text-sm text-slate-700">
      <span className="font-bold">本次評估採用：</span>
      矯正年齡
    </div>
  </div>
)}
  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b-2 border-slate-100 pb-6 sm:pb-10">
  <div className="flex items-center gap-5 sm:gap-6">
    
<motion.div
  initial={{ scale: 0, rotate: -10 }}
  animate={{ scale: 1, rotate: 0 }}
  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-xl shrink-0 border border-white/50 text-3xl sm:text-4xl font-black ${
    gender === 'boy' ? 'bg-boy-soft text-boy' : 'bg-girl-soft text-girl'
  }`}
>
  {gender === 'boy' ? '♂' : '♀'}
</motion.div>

    <div>
      <p
        className={`text-[2rem] sm:text-3xl font-black tracking-tight ${
          gender === 'boy' ? 'text-boy' : 'text-girl'
        }`}
      >
        {gender === 'boy' ? '男孩' : '女孩'}
      </p>

      <p className="text-[1.55rem] sm:text-2xl font-black text-slate-600 mt-1 tracking-tight">
        {isPreterm && correctedAgeData
          ? `${correctedAgeData.display}（矯正）`
          : ageData?.display}
      </p>
    </div>
  </div>

  <div className="w-full text-center mt-1 sm:w-auto sm:mt-0 sm:text-right">
    <p className="text-base sm:text-lg font-black text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.3em] mb-1">
      BMI 指數
    </p>
<p className="text-[3.4rem] sm:text-4xl font-black text-slate-900 font-display leading-none">
  {results.bmi}
</p>

<span
  className={`inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-sm font-black mt-2.5 sm:mt-3 ${
    results.bmiCategory.includes('適中')
      ? 'bg-emerald-100 text-emerald-700'
      : results.bmiCategory.includes('過輕')
      ? 'bg-sky-100 text-sky-700'
      : results.bmiCategory.includes('過重')
      ? 'bg-amber-100 text-amber-700'
      : results.bmiCategory.includes('肥胖')
      ? 'bg-rose-100 text-rose-700'
      : 'bg-slate-100 text-slate-600'
  }`}
>
  {results.bmiCategory.includes('適中') && <CheckCircle2 size={14} />}
  {results.bmiCategory.includes('過輕') && <TrendingDown size={14} />}
  {results.bmiCategory.includes('過重') && <TrendingUp size={14} />}
  {results.bmiCategory.includes('肥胖') && <AlertCircle size={14} />}
  {results.bmiCategory}
</span>
  </div>
</div>

                      {/* Percentile Bento Grid */}
                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="bento-item p-5 sm:p-10 space-y-4 sm:space-y-8 rounded-3xl sm:rounded-4xl">
                          <div className="flex items-start justify-between">
                            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center ${gender === 'boy' ? 'bg-boy-soft text-boy' : 'bg-girl-soft text-girl'}`}>
                              <Ruler size={20} className="sm:w-7 sm:h-7" />
                            </div>
                            <div className="text-right space-y-0.5">
                              <p className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-[0.1em] mb-1">身高</p>
                              <p className="text-lg sm:text-2xl font-black text-slate-800">{height}<span className="text-xs ml-0.5">cm</span></p>
                            </div>
                          </div>
                          <div className="space-y-2 sm:space-y-6 text-center">
                            {(() => {
                              const { text, isExtreme } = formatPercentile(results.hRes.percentile);
                              return (
                                <div className="space-y-1 sm:space-y-2">
                                  <p className="text-[10px] sm:text-sm font-black text-slate-600 uppercase tracking-widest">身高百分位</p>
                                  <p className={`text-3xl sm:text-5xl font-black tracking-tighter font-display ${isExtreme ? 'text-red-500' : 'text-ink'}`}>
                                    {text}
                                  </p>
                                </div>
                              );
                            })()}
                            <div className="pt-2 text-left">
                              <GrowthProgressBar 
                                percentile={results.hRes.percentile} 
                                color={gender === 'boy' ? 'bg-boy' : 'bg-girl'} 
                                medianValue={results.hRes.p50}
                                unit="cm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bento-item p-5 sm:p-10 space-y-4 sm:space-y-8 rounded-3xl sm:rounded-4xl">
                          <div className="flex items-start justify-between">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-50 rounded-2xl sm:rounded-3xl flex items-center justify-center text-orange-500">
                              <Weight size={20} className="sm:w-7 sm:h-7" />
                            </div>
                            <div className="text-right space-y-0.5">
                              <p className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-[0.1em] mb-1">體重</p>
                              <p className="text-lg sm:text-2xl font-black text-slate-800">{weight}<span className="text-[10px] sm:text-xs ml-0.5 font-bold">kg</span></p>
                            </div>
                          </div>
                          <div className="space-y-2 sm:space-y-6 text-center">
                            {(() => {
                              const { text, isExtreme } = formatPercentile(results.wRes.percentile);
                              return (
                                <div className="space-y-1 sm:space-y-2">
                                  <p className="text-[10px] sm:text-sm font-black text-slate-600 uppercase tracking-widest">體重百分位</p>
                                  <p className={`text-3xl sm:text-5xl font-black tracking-tighter font-display ${isExtreme ? 'text-red-500' : 'text-ink'}`}>
                                    {text}
                                  </p>
                                </div>
                              );
                            })()}
                            <div className="pt-2 text-left">
                              <GrowthProgressBar 
                                percentile={results.wRes.percentile} 
                                color="bg-orange-500" 
                                medianValue={results.wRes.p50}
                                unit="kg"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Adult Prediction Card (Moved here) */}
                      {(inherited || results.boneAgePredictedHeight) && (
                        <motion.div 
                          whileHover={{ scale: 1.01 }}
                          className="bg-accent rounded-[40px] p-8 text-white shadow-2xl shadow-accent/30 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                          
                          <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between">
                              <p className="text-sm sm:text-base font-black uppercase tracking-[0.3em] text-white">預估成年身高對照</p>
                              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg">
                                <Ruler size={24} strokeWidth={2.5} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
{inherited && (
  <div className="space-y-3">
    <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-white/90">
      遺傳目標身高 (TH)
    </p>

    <p className="text-4xl sm:text-5xl font-black tracking-tighter font-display">
      {inherited.median.toFixed(1)} <span className="text-base font-bold">CM</span>
    </p>

    <p className="text-xs sm:text-sm font-bold text-white/90">
      遺傳範圍：{inherited.min.toFixed(1)} - {inherited.max.toFixed(1)}
    </p>

    <div className="flex items-center gap-1 text-white/80">
  <p className="text-[10px] font-bold">基於 mid-parental height（雙親身高推估）</p>
  <button
    onClick={() => openAdvice('th_formula' as any, "關於遺傳目標身高（TH）")}
    className="hover:scale-110 transition-transform"
  >
    <Info size={12} />
  </button>
</div>
  </div>
)}
                              
                              {results.boneAgePredictedHeight && (
                                <div className="space-y-3 border-t sm:border-t-0 sm:border-l border-white/20 pt-6 sm:pt-0 sm:pl-8">
                                  <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-white/90">骨齡預估身高 (PAH)</p>
                                  <p className="text-4xl sm:text-5xl font-black tracking-tighter font-display">{results.boneAgePredictedHeight.toFixed(1)} <span className="text-base font-bold">CM</span></p>
                                  
                                  <div className="space-y-2 mt-4">
                                    {!showMaturityControls ? (
                                      <button 
                                        onClick={() => setShowMaturityControls(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 text-xs font-black uppercase tracking-widest"
                                      >
                                        <SlidersHorizontal size={16} /> 發育成熟度調整
                                      </button>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-between">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-white/50">發育成熟度調整</p>
                                          <button 
                                            onClick={() => setShowMaturityControls(false)}
                                            className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors"
                                          >
                                            收起
                                          </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {(['accelerated', 'average', 'retarded'] as MaturityCategory[]).map((cat) => (
                                            <button
                                              key={cat}
                                              onClick={() => setManualMaturity(cat)}
                                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border flex items-center gap-1.5 ${
                                                results.usedMaturity === cat 
                                                  ? 'bg-white text-accent border-white shadow-sm' 
                                                  : 'bg-white/10 text-white/60 border-white/10 hover:bg-white/20'
                                              }`}
                                            >
                                              {results.usedMaturity === cat && <CheckCircle2 size={8} />}
                                              {cat === 'accelerated' ? '早熟' : cat === 'retarded' ? '晚熟' : '平均'}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 text-white/80">
                                    <p className="text-[10px] font-bold">基於 Bayley–Pinneau 預估模型</p>
                                    <button 
                                      onClick={() => openAdvice('bp_standard' as any, "關於 BP 預估模型")}
                                      className="hover:scale-110 transition-transform"
                                    >
                                      <Info size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>
                        </motion.div>
                      )}
                      
                      {/* Genetic Comparison 大於 8 歲才顯示*/}
                     {results.geneticComparison && ageData.years >= 8 && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-accent/5 p-5 rounded-[28px] border border-dashed border-accent/30"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-accent shadow-sm">
                              <Info size={20} />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <p className="text-base font-bold text-ink leading-relaxed">
                                {results.geneticComparison}
                              </p>
                              {results.geneticPercentile !== null && (
                                <div className="pt-2">
                                  <GeneticDeviationIndicator
                                    currentPercentile={results.hRes.percentile}
                                    targetPercentile={results.geneticPercentile}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                    </div>
                  </div>

{/* 成長紀錄存檔區：電腦（CSV/QR）、手機（複製/分享）精準分工 */}
<div className="mt-8 pt-8 border-t-2 border-slate-100/50">
  <div className="bg-emerald-50/50 p-6 sm:p-8 rounded-[40px] border border-emerald-100">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      
      {/* 左側：文字說明、姓名輸入與操作按鈕 (全部包在 col-span-7 裡面) */}
      <div className="lg:col-span-7 space-y-5">
        <div className="space-y-2 text-center lg:text-left">
          <p className="text-lg font-black text-emerald-900 flex items-center justify-center lg:justify-start gap-2">
            <Share2 size={20} /> 成長分析存檔與分享
          </p>
          <p className="text-sm text-emerald-700/70 font-bold leading-relaxed">
            紀錄今日成長數據，方便日後追蹤或與家人同步。
          </p>
        </div>

{/* 🌟 姓名輸入區：用簡單的標題與邊框強化視覺 */}
<div className="mb-6 space-y-2 relative z-30 px-2">
  <div className="flex items-center gap-2 ml-1">
    <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
    <label className="text-sm font-black text-emerald-800">請輸入小朋友姓名 (選填)</label>
  </div>
  
  <div className="relative group">
    <input
      type="text"
      value={childName} 
      onChange={(e) => {
        const val = e.target.value;
        setChildName(val);
      }}
      placeholder="例如：小紘、阿桃..."
      className="w-full px-6 py-4 bg-white border-2 border-emerald-200 rounded-[20px] text-base font-black text-emerald-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm placeholder:text-emerald-200 pointer-events-auto"
    />
    
    {childName && (
      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm">
        已鎖定
      </div>
    )}
  </div>
</div>

        {/* 按鈕群組 (現在乖乖待在 col-span-7 裡面了) */}
        <div className="flex flex-col gap-3">
          {/* 【電腦版專用：CSV 匯出】 */}
          <button 
            onClick={exportCSV} 
            className="hidden lg:flex w-full px-6 py-4 bg-white text-emerald-700 border border-emerald-200 rounded-2xl text-sm font-black items-center justify-center gap-2 hover:bg-emerald-100 transition-all shadow-sm"
          >
            <Download size={18} /> 匯出專業成長紀錄 (CSV)
          </button>

{/* 【手機版專用：複製與分享】 */}
          <div className="lg:hidden space-y-3">
            <button 
              onClick={copyResults} 
              className="w-full px-6 py-4 bg-white text-accent border border-accent/20 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
            >
              <Copy size={18} /> 複製分析結果文字
            </button>
            
            <button 
              onClick={() => {
                const today = new Date().toLocaleDateString('zh-TW');
                const displayName = childName.trim() ? childName : '小朋友';
                const genderLabel = gender === 'boy' ? '男' : '女';
                const hP = formatPercentile(results?.hRes?.percentile).text;
                const wP = formatPercentile(results?.wRes?.percentile).text;
                
                // 預處理進階數據列
                const thRow = inherited ? `遺傳目標 (TH)：${inherited.median.toFixed(1)} cm (${inherited.min.toFixed(1)} - ${inherited.max.toFixed(1)})` : null;
                const pahRow = results?.boneAgePredictedHeight ? `骨齡預估 (PAH)：${results.boneAgePredictedHeight.toFixed(1)} cm` : null;
                
const summaryRows = [
  `日期：${today}`,
  `姓名：${displayName} (${genderLabel})`,
  `實際年齡：${ageData.display}`, // 👈 建議保留實際年齡作為對照
  // 如果是早產兒，多塞兩行
  ...(isPreterm && correctedAgeData ? [
    `矯正年齡：${correctedAgeData.display} (${gestationalWeeks}週${gestationalDays || 0}天)`,
    `評估基準：⚠️ 採用「矯正年齡」計算` // 加上一個 Emoji 提醒家長
  ] : []),
  `身高：${height} cm (百分位：${hP})`,
  `體重：${weight} kg (百分位：${wP})`,
  `體態：${results?.bmiCategory} (BMI: ${results?.bmi})`,
  thRow,
  pahRow
].filter(Boolean).join('\n');

                // 標題統一為：兒童成長小幫手 - 成長分析報告
                const shareText = `【兒童成長小幫手 - 成長分析報告 🌱】\n\n你好！這是今天 (${today}) 幫 ${displayName} 做的分析：\n\n📊 數據摘要：\n${summaryRows}\n\n阿銘醫師叮嚀：成長發育的黃金期只有一次，除了看數據，記得讓孩子多跳繩、早點睡喔！💪\n\n查看連結：https://chimungwu.github.io/tw-growth-helper/`;

                if (navigator.share) {
                  navigator.share({ 
                    title: '兒童成長分析報告', 
                    text: shareText
                  }).catch(() => {
                    // 備援：若分享取消則複製文字
                    navigator.clipboard.writeText(shareText);
                  });
                } else {
                  navigator.clipboard.writeText(shareText);
                  setModal({
                    isOpen: true,
                    title: '分析報告已複製',
                    content: `已複製幫 ${displayName} 準備的文字與連結，您可以直接貼上傳送給家人。`
                  });
                }
              }}
              className="w-full bg-accent text-white py-4 rounded-[24px] flex items-center justify-center gap-3 text-sm font-black shadow-lg shadow-accent/20"
            >
              <Share2 size={18} /> 傳送分析報告給家人
            </button>
          </div>
        </div>
      </div> {/* 👈 這才是正確關閉 lg:col-span-7 的地方 */}

      {/* 【電腦版專用：QR Code】 */}
      <div className="hidden lg:flex lg:col-span-5 justify-end">
        <div className="bg-white p-5 rounded-[40px] shadow-xl border-4 border-white relative group">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`}
            alt="QR"
            className="w-32 h-32 mix-blend-multiply"
          />
          <div className="absolute -bottom-2 -right-2 bg-accent text-white p-2 rounded-xl shadow-lg">
            <Sprout size={18} />
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
                  {/* Advice Badges (Moved here) */}
                  {(results.pubertyAssessment || results.bmiAdvice || results.geneticAdvice) && (
                    <div className="grid grid-cols-1 gap-3 pt-4">
                     {results.pubertyAssessment && (
  <motion.button 
    whileHover={{ scale: 1.02, x: 5 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => openAdvice(
      results.pubertyAssessment.direction === 'early'
        ? 'fast'
        : results.pubertyAssessment.direction === 'late'
        ? 'slow'
        : 'fast',
      "發育狀態建議"
    )}
    className={`backdrop-blur-sm border p-5 rounded-[28px] flex items-center justify-between text-left group shadow-sm ${
      results.pubertyAssessment.level === 'attention'
        ? 'bg-red-50/80 border-red-100'
        : results.pubertyAssessment.level === 'watch'
        ? 'bg-amber-50/80 border-amber-100'
        : 'bg-emerald-50/80 border-emerald-100'
    }`}
  >
    <div className="flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
          results.pubertyAssessment.level === 'attention'
            ? 'bg-red-100 text-red-600'
            : results.pubertyAssessment.level === 'watch'
            ? 'bg-amber-100 text-amber-600'
            : 'bg-emerald-100 text-emerald-600'
        }`}
      >
        <TrendingUp size={24} />
      </div>
      <div>
        <p
          className={`text-sm font-black ${
            results.pubertyAssessment.level === 'attention'
              ? 'text-red-900'
              : results.pubertyAssessment.level === 'watch'
              ? 'text-amber-900'
              : 'text-emerald-900'
          }`}
        >
          發育狀態提醒
        </p>
        <p
          className={`text-xs font-bold uppercase tracking-wider ${
            results.pubertyAssessment.level === 'attention'
              ? 'text-red-700/60'
              : results.pubertyAssessment.level === 'watch'
              ? 'text-amber-700/60'
              : 'text-emerald-700/60'
          }`}
        >
          {results.pubertyAssessment.title}
        </p>
      </div>
    </div>
    <ArrowRight
      size={18}
      className={`group-hover:translate-x-1 transition-transform ${
        results.pubertyAssessment.level === 'attention'
          ? 'text-red-400'
          : results.pubertyAssessment.level === 'watch'
          ? 'text-amber-400'
          : 'text-emerald-400'
      }`}
    />
  </motion.button>
)}
                      {results.bmiAdvice && (
                        <motion.button 
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openAdvice(results.bmiAdvice as keyof typeof ADVICE_TEXTS, "體位狀態建議")}
                          className="bg-orange-50/80 backdrop-blur-sm border border-orange-100 p-5 rounded-[28px] flex items-center justify-between text-left group shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner">
                              <Scale size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-orange-900">體位狀態提醒</p>
                              <p className="text-xs text-orange-700/60 font-bold uppercase tracking-wider">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                      )}
                      {/* 骨齡預估偏差建議按鈕：鎖死 8 歲門檻 */}
                  {results.boneAgeDeviation && results.boneAgeDeviation !== 'normal' && ageData.years >= 8 && (  // 👈 加上這一行，7歲以下就徹底消失了
                        <motion.button 
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openAdvice(results.boneAgeDeviation as keyof typeof ADVICE_TEXTS, "骨齡預估偏差建議")}
                          className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 p-5 rounded-[28px] flex items-center justify-between text-left group shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                              <Bone size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-indigo-900">骨齡預估身高與遺傳身高偏差提醒</p>
                              <p className="text-xs text-indigo-700/60 font-bold uppercase tracking-wider">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                      )}
                      
                      {/* 生長軌跡與遺傳基準偏差提醒按鈕，大於 8 歲才顯示 */}
                  {results.geneticAdvice && ageData.years >= 8 && (
                        <motion.button 
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openAdvice(results.geneticAdvice as keyof typeof ADVICE_TEXTS, "生長表現與遺傳基準偏差提醒")}
                          className="bg-amber-50/80 backdrop-blur-sm border border-amber-100 p-5 rounded-[28px] flex items-center justify-between text-left group shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                              <Dna size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-amber-900">生長軌跡與遺傳基準偏差提醒</p>
                              <p className="text-xs text-amber-700/60 font-bold uppercase tracking-wider">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                      )}
                    </div>
                  )}
                </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card rounded-[48px] p-16 text-center border-4 border-dashed border-slate-200 space-y-8"
                  >
                    <motion.div 
                      animate={{ y: [0, -15, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-32 h-32 bg-slate-50 rounded-[48px] flex items-center justify-center mx-auto shadow-inner border-2 border-white"
                    >
                      <UserPlus className="text-accent" size={64} />
                    </motion.div>
                    <div className="space-y-4">
                      <h3 className="text-3xl font-black text-ink font-display">開始分析</h3>
                      <p className="text-lg text-slate-400 font-bold max-w-[320px] mx-auto leading-relaxed">請在<span className="lg:hidden">上方</span><span className="hidden lg:inline">右側</span>輸入孩子的資料，系統將為您進行分析</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Q&A Section */}
        <div id="qa-section" className="space-y-10 pb-24">
          <div className="flex items-center gap-6 ml-4">
            <div className="w-14 h-14 bg-white rounded-[24px] flex items-center justify-center shadow-xl border border-slate-100">
              <HelpCircle size={32} className="text-accent" />
            </div>
            <h2 className="text-3xl font-black text-ink font-display">常見問題 Q&A</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {qaData.map((item, index) => (
              <motion.div 
                key={index} 
                initial={false}
                className="bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all"
              >
                <button 
                  onClick={() => setOpenQA(openQA === index ? null : index)}
                  className="w-full px-10 py-8 flex items-center justify-between text-left group"
                >
                  <span className="text-lg font-black text-ink leading-snug group-hover:text-accent transition-colors">{item.q}</span>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${openQA === index ? 'bg-accent text-white rotate-180' : 'bg-slate-50 text-slate-300'}`}>
                    <ChevronDown size={20} />
                  </div>
                </button>
                <AnimatePresence>
                  {openQA === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-10 pb-10"
                    >
                      <div className="pt-4 text-base text-slate-500 font-bold leading-relaxed space-y-6 whitespace-pre-line">
                        {item.a}
                        {item.link && (
                          <motion.a 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-2xl font-black shadow-xl shadow-accent/20 transition-all text-[11px] uppercase tracking-widest"
                          >
                            {item.linkText}
                            <ExternalLink size={12} />
                          </motion.a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/90 backdrop-blur-3xl border-t border-slate-100 py-4 px-6 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl transition-all ${gender === 'boy' ? 'bg-boy shadow-boy/20' : 'bg-girl shadow-girl/20'}`}
            >
              <Heart className="text-white" size={20} fill="currentColor" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-ink tracking-tight leading-none font-display">
                  兒童成長小幫手
                </h1>
                <span className="text-[9px] font-black bg-accent/10 text-accent px-1.5 py-0.5 rounded-md uppercase tracking-widest">v3.0</span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">專業、精確的成長評估工具</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="https://drwu.carrd.co" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-black text-accent hover:opacity-70 transition-opacity bg-accent/5 px-4 py-2 rounded-xl"
            >
              <User size={16} fill="currentColor" />
              <span>仨寶爸中醫博士吳啓銘</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

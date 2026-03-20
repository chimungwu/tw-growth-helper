/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, Copy, Download, HelpCircle, ChevronDown, ChevronUp, 
  User, UserPlus, ExternalLink, Calendar, Ruler, Weight, Activity,
  Info, Heart, Share2, Trash2, ArrowRight, ArrowLeft, CheckCircle2, RefreshCcw, Target,
  Facebook, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { 
  boyWeightData, boyHeightData, girlWeightData, girlHeightData 
} from './data/growthData';
import { 
  interpolateValue, findClosestIndices, calculateBMI, 
  determineWeightCategory, calculateInheritedHeight,
  calculatePercentileFromValue, checkGrowthQuadrant, type GrowthQuadrant
} from './utils/calculations';
import { Modal } from './components/Modal';

type Gender = 'boy' | 'girl';

const ADVICE_TEXTS = {
  slow: "【長太慢組建議】\n強調脾胃運化、確保充足睡眠時間（晚上10點前入睡）與追趕生長。建議諮詢專業醫師評估生長激素或中醫調理。",
  fast: "【衝太快組建議】\n提醒監測骨齡、減少環境賀爾蒙（如塑化劑）、控管 BMI 避免過重，以預防性早熟導致生長板提早閉合。",
  underweight: "【體重過輕建議】\n建議增加營養攝取，特別是優質蛋白質與健康油脂。若伴隨食慾不振，可考慮中醫調理脾胃，並排除寄生蟲或吸收不良等因素。",
  overweight: "【體重過重建議】\n建議調整飲食結構，減少高糖、高油與加工食品。增加戶外運動量，並監測是否有代謝異常或性早熟風險。建議諮詢醫師或營養師進行體重管理。",
  genetic_fast: "【生長超前建議】\n目前生長百分位大幅超越遺傳目標身高，這可能是「性早熟」的徵兆。建議監測骨齡，確認生長板是否提早閉合，並減少環境荷爾蒙接觸。若身高突然衝高但伴隨第二性徵出現，請務必諮詢專業醫師。",
  genetic_slow: "【生長落後建議】\n目前生長百分位顯著落後於遺傳目標身高。建議加強脾胃調理，確保優質蛋白質攝取，並維持充足睡眠（晚上10點前入睡）。若百分位持續下滑，建議諮詢小兒內分泌科醫師排除生長激素不足或其他生理因素。"
};

export default function App() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needUpdate, setNeedUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [gender, setGender] = useState<Gender>('boy');
  const [birthdateInput, setBirthdateInput] = useState('');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [fatherHeight, setFatherHeight] = useState<string>('');
  const [motherHeight, setMotherHeight] = useState<string>('');
  const [showMedian, setShowMedian] = useState(false);
  const [showParents, setShowParents] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const [openQA, setOpenQA] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: string }>({
    isOpen: false,
    title: '',
    content: ''
  });

  useEffect(() => {
    if (birthdateInput || height || weight) {
      setIsCalculating(true);
      const timer = setTimeout(() => setIsCalculating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [birthdateInput, height, weight, gender]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if it's iOS and not standalone
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      setShowInstallBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    } else {
      // iOS manual instruction
      setModal({
        isOpen: true,
        title: '安裝說明',
        content: '請點擊瀏覽器下方的「分享」按鈕，然後選擇「加入主畫面」以安裝此應用程式。'
      });
    }
  };

  const openAdvice = (type: keyof typeof ADVICE_TEXTS, title: string) => {
    setModal({
      isOpen: true,
      title,
      content: ADVICE_TEXTS[type]
    });
  };

  const GrowthProgressBar = ({ percentile, label, color }: { percentile: number, label: string, color: string }) => {
    const isExtreme = percentile < 3 || percentile > 97;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-end">
          <span className="text-xs font-bold text-ink/40 uppercase tracking-widest">{label}</span>
          <span className={`text-xs font-black ${isExtreme ? 'text-red-500' : 'text-accent'}`}>
            {percentile < 3 ? '< 3rd' : percentile > 97 ? '> 97th' : `${percentile.toFixed(1)}%`}
          </span>
        </div>
        <div className="h-1.5 w-full bg-line/30 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentile}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${color}`}
          />
          {/* Reference markers */}
          <div className="absolute top-0 left-[3%] h-full w-px bg-white/50" />
          <div className="absolute top-0 left-[50%] h-full w-px bg-white/50" />
          <div className="absolute top-0 left-[97%] h-full w-px bg-white/50" />
        </div>
      </div>
    );
  };

  const GeneticDeviationIndicator = ({ currentPercentile, targetPercentile }: { currentPercentile: number; targetPercentile: number }) => {
    const diff = currentPercentile - targetPercentile;
    const clampedDiff = Math.max(-30, Math.min(30, diff));
    const markerPosition = ((clampedDiff + 30) / 60) * 100;
    const isAlert = Math.abs(diff) > 15;
    const directionLabel = diff > 2 ? '高於目標' : diff < -2 ? '低於目標' : '接近目標';
    const directionColor = diff > 2 ? 'text-rose-600' : diff < -2 ? 'text-blue-600' : 'text-emerald-600';

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink/40 uppercase tracking-widest">遺傳偏離程度</span>
          <span className={`text-xs font-black ${directionColor}`}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2.5 rounded-full bg-gradient-to-r from-blue-100 via-emerald-100 to-rose-100 overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-px bg-ink/30" />
          <div
            className={`absolute -top-1.5 w-5 h-5 rounded-full border-2 shadow-sm flex items-center justify-center ${
              isAlert ? 'bg-red-500 border-red-200 text-white' : 'bg-accent border-white text-white'
            }`}
            style={{ left: `calc(${markerPosition}% - 10px)` }}
          >
            <Target size={10} />
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-bold text-ink/50">
          <span className="inline-flex items-center gap-1"><ArrowLeft size={12} />落後較多</span>
          <span className="text-ink/70">遺傳目標</span>
          <span className="inline-flex items-center gap-1">超前較多<ArrowRight size={12} /></span>
        </div>
        <div className={`text-xs font-bold ${directionColor}`}>
          {directionLabel}（目前 {currentPercentile.toFixed(1)}% / 目標 {targetPercentile.toFixed(1)}%）
        </div>
      </div>
    );
  };

  // Derived state: Age
  const ageData = useMemo(() => {
    if (!birthdateInput) return null;

    // Handle direct age input (0-18)
    const numericAge = parseFloat(birthdateInput);
    if (!isNaN(numericAge) && birthdateInput.length < 7 && numericAge >= 0 && numericAge <= 18.5) {
      return { years: numericAge, display: `${numericAge.toFixed(1)} 歲` };
    }

    // Handle date formats (YYYYMMDD or YYYY/MM/DD)
    let dateStr = birthdateInput.replace(/\//g, '');
    let birthDate: Date | null = null;

    if (/^\d{8}$/.test(dateStr)) {
      const y = parseInt(dateStr.substring(0, 4));
      const m = parseInt(dateStr.substring(4, 6)) - 1;
      const d = parseInt(dateStr.substring(6, 8));
      birthDate = new Date(y, m, d);
    } else if (/^\d{7}$/.test(dateStr)) {
      const y = parseInt(dateStr.substring(0, 3)) + 1911;
      const m = parseInt(dateStr.substring(3, 5)) - 1;
      const d = parseInt(dateStr.substring(5, 7));
      birthDate = new Date(y, m, d);
    }

    if (birthDate && !isNaN(birthDate.getTime())) {
      const today = new Date();
      const diff = today.getTime() - birthDate.getTime();
      if (diff < 0) return null;

      const ageInYears = diff / (1000 * 60 * 60 * 24 * 365.25);
      if (ageInYears > 18.5) return null;

      const years = Math.floor(ageInYears);
      const months = Math.floor((ageInYears - years) * 12);
      const days = Math.floor(((ageInYears - years) * 12 - months) * 30.44);

      return { 
        years: ageInYears, 
        display: `${years} 歲 ${months} 個月又 ${days} 天` 
      };
    }

    return null;
  }, [birthdateInput]);

  // Derived state: Percentiles and Results
  const results = useMemo(() => {
    if (!ageData || !height || !weight) return null;

    const h = parseFloat(height);
    const w = parseFloat(weight);
    const age = ageData.years;
    const hData = gender === 'boy' ? boyHeightData : girlHeightData;
    const wData = gender === 'boy' ? boyWeightData : girlWeightData;

    const idx = findClosestIndices(age, hData.Age);
    const a0 = hData.Age[idx[0]];
    const a1 = hData.Age[idx[1]];

    const getInterpolatedP = (data: any, val: number) => {
      const p50 = interpolateValue(age, a0, a1, data["50th"][idx[0]], data["50th"][idx[1]]);
      const p3 = interpolateValue(age, a0, a1, data[" 3rd"][idx[0]], data[" 3rd"][idx[1]]);
      const p97 = interpolateValue(age, a0, a1, data["97th"][idx[0]], data["97th"][idx[1]]);
      
      let percentile = 50;
      if (val < p50) {
        percentile = interpolateValue(val, p3, p50, 3, 50);
      } else {
        percentile = interpolateValue(val, p50, p97, 50, 97);
      }

      return {
        value: val,
        percentile: Math.max(0, Math.min(100, percentile)),
        p50
      };
    };

    const hRes = getInterpolatedP(hData, h);
    const wRes = getInterpolatedP(wData, w);
    const bmi = calculateBMI(w, h);
    const bmiCategory = determineWeightCategory(bmi, age, gender);

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
        geneticComparison = '⚠️ 根據 Tanner 遺傳常模預估，目前生長曲線有偏離現象（落後），建議諮詢專業中西醫調養。';
      } else if (diff > 15) {
        geneticComparison = '⚠️ 根據 Tanner 遺傳常模預估，目前生長曲線有偏離現象（超前），需留意性早熟風險，建議諮詢專業中西醫調養。';
      } else {
        geneticComparison = '符合遺傳預期。';
      }
    }

    const quadrant = checkGrowthQuadrant(gender, age, hRes.percentile);
    const bmiAdvice = bmiCategory === "體重過輕" ? "underweight" : (bmiCategory === "體重過重" || bmiCategory === "肥胖" ? "overweight" : null);
    
    let geneticAdvice: keyof typeof ADVICE_TEXTS | null = null;
    if (geneticPercentile !== null) {
      const diff = hRes.percentile - geneticPercentile;
      if (diff > 15) geneticAdvice = "genetic_fast";
      else if (diff < -15) geneticAdvice = "genetic_slow";
    }

    return { hRes, wRes, bmi, bmiCategory, geneticPercentile, geneticComparison, quadrant, bmiAdvice, geneticAdvice };
  }, [ageData, height, weight, gender, fatherHeight, motherHeight]);

  useEffect(() => {
    if (results && !isCalculating) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results, isCalculating]);

  useEffect(() => {
    if (birthdateInput || height || weight) {
      setIsCalculating(true);
      const timer = setTimeout(() => setIsCalculating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [birthdateInput, height, weight, gender]);

  const inherited = useMemo(() => {
    if (!fatherHeight || !motherHeight) return null;
    return calculateInheritedHeight(gender, parseFloat(fatherHeight), parseFloat(motherHeight));
  }, [gender, fatherHeight, motherHeight]);

  const formatPercentile = (p: number) => {
    if (p < 3) return { text: '< 3rd', isExtreme: true };
    if (p > 97) return { text: '> 97th', isExtreme: true };
    return { text: `${p.toFixed(1)}%`, isExtreme: false };
  };

  const copyResults = () => {
    if (!results || !ageData) return;
    const hP = formatPercentile(results.hRes.percentile).text;
    const wP = formatPercentile(results.wRes.percentile).text;
    const text = `
【台灣兒童生長曲線小幫手】
性別：${gender === 'boy' ? '男孩' : '女孩'}
年齡：${ageData.display}
身高：${height} cm (百分位: ${hP})
體重：${weight} kg (百分位: ${wP})
BMI：${results.bmi} (${results.bmiCategory})
${inherited ? `預估目標身高：${inherited.median.toFixed(1)} cm (${inherited.min.toFixed(1)} - ${inherited.max.toFixed(1)})` : ''}
日期：${new Date().toLocaleDateString('zh-TW')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setModal({
        isOpen: true,
        title: '複製成功',
        content: '結果已複製到剪貼簿'
      });
    });
  };

  const exportCSV = () => {
    if (!results || !ageData) return;
    const hP = formatPercentile(results.hRes.percentile).text;
    const wP = formatPercentile(results.wRes.percentile).text;
    const headers = "\uFEFF日期,性別,年齡,身高(cm),身高百分位,體重(kg),體重百分位,BMI,BMI判定\n";
    const row = `${new Date().toLocaleDateString('zh-TW')},${gender === 'boy' ? '男' : '女'},${ageData.display},${height},${hP},${weight},${wP},${results.bmi},${results.bmiCategory}\n`;
    
    const blob = new Blob([headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `成長追蹤_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const qaData = [
    { 
      q: "認識設計者：阿銘醫師｜仨寶爸中醫博士", 
      a: "「爸，為什麼你會當醫師？」這是我女兒有一天問我的問題 … 我想了想，回答她：「因為我想讓小朋友不要老是跑醫院，把身體顧好一點，長大比較輕鬆。」這句話，其實也是我一路從醫學院、中醫博士班到現在走進臨床的心情縮影。我是阿銘醫師，一位中醫兒科與體質調理專家，也是一位養著三個小孩的爸爸。我相信中醫的智慧可以成為家長的靠山，讓我們不用慌張，而是穩穩地，一步步陪孩子走過最重要的黃金發育期。",
      link: "https://drwu.carrd.co/",
      linkText: "更多資訊：阿銘醫師的個人網站"
    },
    { q: "這個工具的資料來源是什麼？", a: "引用自陳偉德醫師與張美惠醫師於 2010 年發表的台灣本土研究，該研究根據 WHO 標準制定新的兒童與青少年成長曲線。" },
    { q: "BMI 百分位的標準是依據哪個單位？", a: "採用衛福部國健署於 102 年公告的台灣兒童與青少年體位判定參考值。定義如下：< 5% 為體重過輕；85% - 95% 為過重；> 95% 為肥胖。" },
    { q: "為什麼會出現「生長軌跡與遺傳目標偏差提醒」？", a: "當孩子的身高百分位與根據父母身高計算出的「遺傳百分位」落差超過 15% 時，系統會判定為生長偏離。這能幫助家長及早發現孩子是否長得比預期太快（性早熟風險）或太慢。" },
    { q: "「發育狀態提醒」的判定邏輯為何？", a: "系統會根據年齡與身高百分位將發育狀態分為四個象限。若孩子年紀尚小（男<11, 女<9）但身高百分位 > 75%，會提醒「衝太快」風險；若年紀較大 but 身高百分位 < 25%，則會提醒「長太慢」。" },
    { q: "針對不同生長狀況有什麼具體建議？", a: "系統會針對「長太慢」、「衝太快」、「體重異常」及「生長軌跡與遺傳目標偏差」提供建議。包含：加強脾胃調理、確保優質蛋白質攝取、晚上10點前入睡、監測骨齡、減少環境荷爾蒙接觸，以及必要時諮詢小兒內分泌科醫師。" },
    { q: "如何計算孩子未來的預估成年身高？", a: "使用 Tanner 等學者提出的 Target Height 公式。男孩：(父+母+13)/2；女孩：(父+母-13)/2。此數值代表遺傳目標身高，實際身高仍受後天營養與作息影響。" },
    { q: "這個工具適合哪些人使用？", a: "提供給家長、中醫師、小兒科醫師參考。所有數據僅供參考，若有疑問請諮詢專業醫療人員。" }
  ];

  return (
    <div className="min-h-screen bg-[#FDF8F3] text-[#4A443F] font-sans pb-24">
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        content={modal.content}
      />
      
      <main className="max-w-6xl mx-auto px-5 mt-6 space-y-8">
        {/* PWA Update Prompt */}
        <AnimatePresence>
          {needUpdate && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-md bg-accent rounded-3xl p-5 shadow-2xl shadow-accent/40 flex items-center justify-between gap-4 text-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <RefreshCcw size={24} className="animate-spin-slow" />
                </div>
                <div>
                  <p className="text-sm font-bold">發現新版本</p>
                  <p className="text-xs opacity-80">點擊按鈕立即更新至最新功能</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => updateServiceWorker(true)}
                  className="bg-white text-accent px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg active:scale-95 transition-transform"
                >
                  立即更新
                </button>
                <button 
                  onClick={() => setNeedUpdate(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PWA Install Banner */}
        <AnimatePresence>
          {showInstallBanner && !needUpdate && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-md bg-accent rounded-3xl p-5 shadow-2xl shadow-accent/40 flex items-center justify-between gap-4 text-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Download size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold">安裝至主畫面</p>
                  <p className="text-xs opacity-80">隨時追蹤，離線也能使用</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleInstallClick}
                  className="bg-white text-accent px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg active:scale-95 transition-transform"
                >
                  立即安裝
                </button>
                <button 
                  onClick={() => setShowInstallBanner(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Form & Desktop Q&A */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
            {/* Input Form Section */}
            <div className="glass-card rounded-[40px] p-8 space-y-8">
              {/* Gender Selection */}
              <div className="space-y-4">
                <label className="text-xs font-black text-ink/30 uppercase tracking-[0.3em] ml-2">選擇性別</label>
                <div className="flex p-2 bg-bg rounded-[28px] gap-2">
                  <button 
                    onClick={() => setGender('boy')}
                    className={`flex-1 py-4 rounded-[22px] text-sm font-black transition-all flex items-center justify-center gap-2 ${gender === 'boy' ? 'bg-white text-boy shadow-lg shadow-boy/5' : 'text-ink/40 hover:bg-white/50'}`}
                  >
                    <span className="text-xl">👦</span> 男孩
                  </button>
                  <button 
                    onClick={() => setGender('girl')}
                    className={`flex-1 py-4 rounded-[22px] text-sm font-black transition-all flex items-center justify-center gap-2 ${gender === 'girl' ? 'bg-white text-girl shadow-lg shadow-girl/5' : 'text-ink/40 hover:bg-white/50'}`}
                  >
                    <span className="text-xl">👧</span> 女孩
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-2">
                    <label className="text-xs font-black text-ink/30 uppercase tracking-[0.3em]">生日或年齡</label>
                    <span className="text-xs text-accent font-black uppercase tracking-widest">YYYYMMDD</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-accent group-focus-within:scale-110 transition-transform">
                      <Calendar size={20} />
                    </div>
                    <input 
                      type="text"
                      placeholder="例如：20150620 或 8.5"
                      value={birthdateInput}
                      onChange={(e) => setBirthdateInput(e.target.value)}
                      className="input-field pl-16 pr-8"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-ink/30 uppercase tracking-[0.3em] ml-2">目前身高 (cm)</label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-accent">
                        <Ruler size={20} />
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="120.5"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="input-field pl-16 pr-6"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-ink/30 uppercase tracking-[0.3em] ml-2">目前體重 (kg)</label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-accent">
                        <Weight size={20} />
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="25.0"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="input-field pl-16 pr-6"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Parents Height (Optional) */}
              <div className="pt-4 border-t border-line/30">
                <button 
                  onClick={() => setShowParents(!showParents)}
                  className="w-full flex items-center justify-between py-2 group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${showParents ? 'bg-accent' : 'bg-ink/20'}`} />
                    <span className="text-xs font-black text-ink/30 uppercase tracking-[0.3em] group-hover:text-accent transition-colors">父母身高 (選填)</span>
                  </div>
                  <div className={`w-8 h-8 rounded-2xl bg-bg flex items-center justify-center text-accent transition-all ${showParents ? 'rotate-180 bg-accent text-white' : ''}`}>
                    <ChevronDown size={16} />
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
                      <div className="grid grid-cols-2 gap-5 pt-6">
                        <div className="space-y-3">
                          <label className="text-xs font-black text-ink/40 uppercase tracking-widest ml-2 text-center block">爸爸身高 (cm)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={fatherHeight}
                            onChange={(e) => setFatherHeight(e.target.value)}
                            className="input-field text-center"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs font-black text-ink/40 uppercase tracking-widest ml-2 text-center block">媽媽身高 (cm)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={motherHeight}
                            onChange={(e) => setMotherHeight(e.target.value)}
                            className="input-field text-center"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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

          {/* Right Column: Results Section */}
          <div className="lg:col-span-7 space-y-6">
            <div ref={resultsRef} className="scroll-mt-24">
              <AnimatePresence mode="wait">
                {isCalculating ? (
                  <motion.div 
                    key="calculating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-card rounded-[40px] p-12 flex flex-col items-center justify-center space-y-4"
                  >
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full"
                    />
                    <p className="text-xs font-black text-accent uppercase tracking-widest animate-pulse">正在精確分析中...</p>
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
                  <div className="glass-card rounded-[40px] p-8 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-48 h-48 rounded-full -mr-24 -mt-24 blur-3xl opacity-20 ${gender === 'boy' ? 'bg-boy' : 'bg-girl'}`} />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full -ml-16 -mb-16 blur-3xl" />
                    
                    <div className="relative z-10 space-y-8">
                      <div className="flex items-center justify-between border-b border-line/50 pb-6">
                        <div className="flex items-center gap-4">
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`w-14 h-14 rounded-3xl flex items-center justify-center text-3xl shadow-inner ${gender === 'boy' ? 'bg-boy-soft' : 'bg-girl-soft'}`}
                          >
                            {gender === 'boy' ? '👦' : '👧'}
                          </motion.div>
                          <div>
                            <p className={`text-xl font-black tracking-tight ${gender === 'boy' ? 'text-boy' : 'text-girl'}`}>
                              {gender === 'boy' ? '男孩' : '女孩'}
                            </p>
                            <p className="text-sm font-bold text-ink/50">{ageData?.display}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-ink/30 uppercase tracking-[0.2em]">BMI 指數</p>
                          <p className="text-3xl font-black text-ink font-display">{results.bmi}</p>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black mt-1 ${
                            results.bmiCategory === '正常' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {results.bmiCategory === '正常' && <CheckCircle2 size={10} />}
                            {results.bmiCategory}
                          </span>
                        </div>
                      </div>

                      {/* Percentile Bento Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bento-item space-y-4">
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${gender === 'boy' ? 'bg-boy-soft text-boy' : 'bg-girl-soft text-girl'}`}>
                              <Ruler size={16} />
                            </div>
                            <span className="text-xs font-black text-ink/30 uppercase tracking-widest">身高</span>
                          </div>
                          <div className="space-y-1">
                            {(() => {
                              const { text, isExtreme } = formatPercentile(results.hRes.percentile);
                              return (
                                <div className="flex items-baseline gap-1">
                                  <p className={`text-4xl font-black tracking-tighter font-display ${isExtreme ? 'text-red-500' : 'text-ink'}`}>
                                    {text.replace('%', '')}
                                  </p>
                                  {!isExtreme && <span className="text-sm font-bold text-ink/40">%</span>}
                                </div>
                              );
                            })()}
                            <p className="text-sm font-bold text-ink/40">{height} cm</p>
                          </div>
                          <GrowthProgressBar 
                            percentile={results.hRes.percentile} 
                            label="生長百分位" 
                            color={gender === 'boy' ? 'bg-boy' : 'bg-girl'} 
                          />
                        </div>

                        <div className="bento-item space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                              <Weight size={16} />
                            </div>
                            <span className="text-xs font-black text-ink/30 uppercase tracking-widest">體重</span>
                          </div>
                          <div className="space-y-1">
                            {(() => {
                              const { text, isExtreme } = formatPercentile(results.wRes.percentile);
                              return (
                                <div className="flex items-baseline gap-1">
                                  <p className={`text-4xl font-black tracking-tighter font-display ${isExtreme ? 'text-red-500' : 'text-ink'}`}>
                                    {text.replace('%', '')}
                                  </p>
                                  {!isExtreme && <span className="text-sm font-bold text-ink/40">%</span>}
                                </div>
                              );
                            })()}
                            <p className="text-sm font-bold text-ink/40">{weight} kg</p>
                          </div>
                          <GrowthProgressBar 
                            percentile={results.wRes.percentile} 
                            label="重量百分位" 
                            color="bg-orange-500" 
                          />
                        </div>
                      </div>

                      {/* Genetic Comparison */}
                      {results.geneticComparison && (
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
                              <p className="text-sm font-bold text-ink leading-relaxed">
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

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-2">
                        <button 
                          onClick={copyResults} 
                          className="btn-secondary flex-1 text-xs flex items-center justify-center gap-2"
                        >
                          <Share2 size={16} className="text-accent" /> 複製分享
                        </button>
                        <button 
                          onClick={exportCSV} 
                          className="btn-secondary flex-1 text-xs flex items-center justify-center gap-2"
                        >
                          <Download size={16} className="text-accent" /> 匯出紀錄
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Advice Badges */}
                  {(results.quadrant || results.bmiAdvice || results.geneticAdvice) && (
                    <div className="grid grid-cols-1 gap-3">
                      {results.quadrant && (
                        <motion.button 
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openAdvice(results.quadrant as keyof typeof ADVICE_TEXTS, "發育狀態建議")}
                          className="bg-red-50/80 backdrop-blur-sm border border-red-100 p-5 rounded-[28px] flex items-center justify-between text-left group shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                              <Activity size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-red-900">發育狀態提醒</p>
                              <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-red-400 group-hover:translate-x-1 transition-transform" />
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
                              <Activity size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-orange-900">體位狀態提醒</p>
                              <p className="text-xs text-orange-700/60 font-bold uppercase tracking-wider">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-orange-400 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                      )}
                      {results.geneticAdvice && (
                        <motion.button 
                          whileHover={{ scale: 1.02, x: 5 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openAdvice(results.geneticAdvice as keyof typeof ADVICE_TEXTS, "遺傳偏差建議")}
                          className="bg-amber-50/80 backdrop-blur-sm border border-amber-100 p-5 rounded-[28px] flex items-center justify-between text-left group shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                              <Activity size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-amber-900 leading-tight">生長軌跡與遺傳目標偏差提醒</p>
                              <p className="text-xs text-amber-700/60 font-bold uppercase tracking-wider">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* Adult Prediction Card */}
                  {inherited && (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="bg-accent rounded-[40px] p-8 text-white shadow-2xl shadow-accent/30 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-black uppercase tracking-[0.3em] opacity-70">預估成年身高</p>
                          <p className="text-4xl font-black tracking-tighter font-display">{inherited.median.toFixed(1)} <span className="text-lg font-bold">cm</span></p>
                          <div className="flex items-center gap-2 mt-2 opacity-80">
                            <div className="h-1 w-12 bg-white/30 rounded-full overflow-hidden">
                              <div className="h-full bg-white w-2/3" />
                            </div>
                            <p className="text-xs font-bold">遺傳範圍：{inherited.min.toFixed(1)} - {inherited.max.toFixed(1)}</p>
                          </div>
                        </div>
                        <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center backdrop-blur-md shadow-lg">
                          <Ruler size={40} strokeWidth={2.5} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Median Values Toggle */}
                  <div className="glass-card rounded-[32px] overflow-hidden">
                    <button 
                      onClick={() => setShowMedian(!showMedian)}
                      className="w-full px-8 py-5 flex items-center justify-between hover:bg-bg/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-bg rounded-2xl flex items-center justify-center text-accent">
                          <Info size={20} />
                        </div>
                        <span className="text-sm font-black text-ink">查看 50 百分位</span>
                      </div>
                      <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${showMedian ? 'bg-accent text-white rotate-180' : 'bg-bg text-ink/30'}`}>
                        <ChevronDown size={16} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {showMedian && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-8 pb-6"
                        >
                          <div className="grid grid-cols-2 gap-5 pt-2">
                            <div className="bg-bg p-5 rounded-[24px] border border-line/30">
                              <p className="text-xs font-black text-ink/30 uppercase tracking-[0.2em] mb-2">身高 50 百分位</p>
                              <p className="text-xl font-black text-ink font-display">{results.hRes.p50.toFixed(1)} <span className="text-xs font-bold text-ink/40">cm</span></p>
                            </div>
                            <div className="bg-bg p-5 rounded-[24px] border border-line/30">
                              <p className="text-xs font-black text-ink/30 uppercase tracking-[0.2em] mb-2">體重 50 百分位</p>
                              <p className="text-xl font-black text-ink font-display">{results.wRes.p50.toFixed(1)} <span className="text-xs font-bold text-ink/40">kg</span></p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card rounded-[40px] p-12 text-center border-2 border-dashed border-line space-y-6"
                  >
                    <motion.div 
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-24 h-24 bg-bg rounded-[40px] flex items-center justify-center mx-auto shadow-inner"
                    >
                      <UserPlus className="text-accent" size={48} />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-ink font-display">開始分析</h3>
                      <p className="text-sm text-ink/40 font-medium max-w-[240px] mx-auto leading-relaxed">請在<span className="lg:hidden">上方</span><span className="hidden lg:inline">左側</span>輸入孩子的資料，我們將為您進行精確分析</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Q&A Section */}
        <div id="qa-section" className="space-y-6 pb-12">
          <div className="flex items-center gap-4 ml-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-line">
              <HelpCircle size={22} className="text-accent" />
            </div>
            <h2 className="text-xl font-black text-ink font-display">常見問題 Q&A</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qaData.map((item, index) => (
              <motion.div 
                key={index} 
                initial={false}
                className="bg-white/60 backdrop-blur-sm rounded-[32px] border border-line overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <button 
                  onClick={() => setOpenQA(openQA === index ? null : index)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left group"
                >
                  <span className="text-sm font-black text-ink leading-snug group-hover:text-accent transition-colors">{item.q}</span>
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${openQA === index ? 'bg-accent text-white rotate-180' : 'bg-bg text-ink/30'}`}>
                    <ChevronDown size={16} />
                  </div>
                </button>
                <AnimatePresence>
                  {openQA === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-8 pb-8"
                    >
                      <div className="pt-2 text-xs text-ink/60 font-medium leading-relaxed space-y-4">
                        <p>{item.a}</p>
                        {item.link && (
                          <motion.a 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 bg-accent text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-accent/20 transition-all"
                          >
                            {item.linkText}
                            <ExternalLink size={14} />
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

      {/* Banner / Footer */}
      <footer className="bg-white/80 backdrop-blur-2xl border-t border-line py-5 px-6 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 10 }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${gender === 'boy' ? 'bg-boy shadow-boy/20' : 'bg-girl shadow-girl/20'}`}
            >
              <Heart className="text-white" size={22} fill="currentColor" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-ink tracking-tight leading-none font-display">
                  台灣兒童生長曲線小幫手
                </h1>
                <span className="text-[9px] font-black bg-accent/10 text-accent px-1.5 py-0.5 rounded-md uppercase tracking-tighter">2026/03.20 v3.0</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-ink/40 font-bold tracking-tight">專業、精確的成長評估工具</p>
                <div className="w-px h-2 bg-line/50" />
                <a 
                  href="https://www.facebook.com/profile.php?id=61557246475372" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-black text-accent hover:opacity-70 transition-opacity"
                >
                  <Facebook size={10} fill="currentColor" />
                  仨寶爸中醫博士吳啓銘
                </a>
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              setBirthdateInput(''); setHeight(''); setWeight('');
              setFatherHeight(''); setMotherHeight('');
              setModal({ isOpen: true, title: '已重置', content: '所有輸入資料已清除。' });
            }}
            className="p-3 bg-white rounded-2xl text-ink/40 hover:text-accent hover:bg-accent/5 transition-all border border-line active:scale-95"
            title="重置資料"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}

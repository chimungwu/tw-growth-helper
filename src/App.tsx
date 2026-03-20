/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, Copy, Download, HelpCircle, ChevronDown, ChevronUp, 
  User, UserPlus, ExternalLink, Calendar, Ruler, Weight, Activity,
  Info, Heart, Share2, Trash2, ArrowRight, CheckCircle2, RefreshCcw,
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
    const { text } = formatPercentile(percentile);
    
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="section-label mb-0">{label}</span>
          <span className={`text-sm font-black ${isExtreme ? 'text-red-600' : 'text-accent'}`}>
            {text}
          </span>
        </div>
        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative border-2 border-line shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(Math.max(percentile, 0), 100)}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={`h-full ${color} shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)]`}
          />
          {/* Reference markers */}
          <div className="absolute top-0 left-[3%] h-full w-0.5 bg-line/10" />
          <div className="absolute top-0 left-[15%] h-full w-0.5 bg-line/10" />
          <div className="absolute top-0 left-[50%] h-full w-0.5 bg-line/10" />
          <div className="absolute top-0 left-[85%] h-full w-0.5 bg-line/10" />
          <div className="absolute top-0 left-[97%] h-full w-0.5 bg-line/10" />
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
    <div className="min-h-screen bg-bg text-ink font-sans pb-32">
      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        content={modal.content}
      />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-12 space-y-12">
        {/* Header Section */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-3xl shadow-[6px_6px_0px_0px_rgba(37,99,235,0.2)] mb-2">
            <Activity size={40} className="text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-ink">
            兒童成長曲線 <span className="text-accent underline decoration-4 underline-offset-8">小幫手</span>
          </h1>
          <p className="text-ink-muted font-bold max-w-xl mx-auto">
            根據衛福部最新數據，為您的孩子提供精確的生長發育評估與建議
          </p>
        </header>

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
            <div className="glass-card p-8 space-y-8">
              {/* Gender Selection */}
              <div className="space-y-4">
                <label className="section-label">選擇性別</label>
                <div className="flex p-2 bg-slate-200 rounded-2xl gap-2 border-2 border-line">
                  <button 
                    onClick={() => setGender('boy')}
                    className={`flex-1 py-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${gender === 'boy' ? 'bg-boy text-white shadow-[4px_4px_0px_0px_rgba(2,132,199,0.2)]' : 'text-slate-600 hover:bg-white/50'}`}
                  >
                    <span className="text-lg">👦</span> 男孩
                  </button>
                  <button 
                    onClick={() => setGender('girl')}
                    className={`flex-1 py-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${gender === 'girl' ? 'bg-girl text-white shadow-[4px_4px_0px_0px_rgba(219,39,119,0.2)]' : 'text-slate-600 hover:bg-white/50'}`}
                  >
                    <span className="text-lg">👧</span> 女孩
                  </button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="section-label">生日或年齡</label>
                    <span className="text-[10px] text-accent font-bold uppercase tracking-widest">YYYYMMDD</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors">
                      <Calendar size={18} />
                    </div>
                    <input 
                      type="text"
                      placeholder="例如：20150620 或 8.5"
                      value={birthdateInput}
                      onChange={(e) => setBirthdateInput(e.target.value)}
                      className="input-field pl-14"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="section-label">目前身高 (cm)</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors">
                        <Ruler size={18} />
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="120.5"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="input-field pl-14"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="section-label">目前體重 (kg)</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors">
                        <Weight size={18} />
                      </div>
                      <input 
                        type="number"
                        step="0.1"
                        placeholder="25.0"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="input-field pl-14"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Parents Height (Optional) */}
              <div className="pt-6 border-t border-line">
                <button 
                  onClick={() => setShowParents(!showParents)}
                  className="w-full flex items-center justify-between py-2 group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors ${showParents ? 'bg-accent' : 'bg-slate-300'}`} />
                    <span className="section-label mb-0 group-hover:text-accent transition-colors">父母身高 (選填)</span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 transition-all ${showParents ? 'rotate-180 bg-accent/10 text-accent' : ''}`}>
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
                      <div className="grid grid-cols-2 gap-4 pt-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">爸爸身高 (cm)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={fatherHeight}
                            onChange={(e) => setFatherHeight(e.target.value)}
                            className="input-field text-center"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">媽媽身高 (cm)</label>
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
            <div className="hidden lg:block glass-card p-8 space-y-6 border-2 border-line">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent border-2 border-accent/20">
                  <HelpCircle size={24} />
                </div>
                <h3 className="text-xl font-black text-ink tracking-tight">常見問題</h3>
              </div>
              <p className="text-sm text-ink-muted font-bold leading-relaxed">
                有關於生長曲線、遺傳身高或 BMI 的疑問嗎？查看下方的 Q&A 區塊了解更多專業建議。
              </p>
              <button 
                onClick={() => {
                  const qaSection = document.getElementById('qa-section');
                  qaSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-black text-accent hover:underline flex items-center gap-2 group"
              >
                前往 Q&A 區塊 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
                    className="glass-card p-16 flex flex-col items-center justify-center space-y-8 border-2 border-line"
                  >
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-14 h-14 border-4 border-slate-200 border-t-accent rounded-full shadow-lg"
                    />
                    <p className="text-sm font-black text-ink-muted uppercase tracking-[0.2em]">正在分析數據...</p>
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
                  <div className="glass-card p-10 relative overflow-hidden border-2 border-line">
                    <div className={`absolute top-0 right-0 w-80 h-80 rounded-full -mr-40 -mt-40 blur-3xl opacity-20 ${gender === 'boy' ? 'bg-boy' : 'bg-girl'}`} />
                    
                    <div className="relative z-10 space-y-10">
                      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-10">
                        <div className="flex items-center gap-6">
                          <motion.div 
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg border-2 border-white/50 ${gender === 'boy' ? 'bg-boy-soft' : 'bg-girl-soft'}`}
                          >
                            {gender === 'boy' ? '👦' : '👧'}
                          </motion.div>
                          <div>
                            <p className={`text-3xl font-black tracking-tight ${gender === 'boy' ? 'text-boy' : 'text-girl'}`}>
                              {gender === 'boy' ? '男孩' : '女孩'}
                            </p>
                            <p className="text-base font-bold text-ink-muted mt-1">{ageData?.display}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <label className="section-label">BMI 指數</label>
                          <p className="text-5xl font-black text-ink tracking-tighter leading-none">{results.bmi}</p>
                          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black mt-3 border-2 ${
                            results.bmiCategory === '正常' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                          }`}>
                            {results.bmiCategory === '正常' && <CheckCircle2 size={12} />}
                            {results.bmiCategory}
                          </span>
                        </div>
                      </div>

                      {/* Percentile Bento Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bento-item border-2 border-line">
                          <div className="flex items-center justify-between mb-8">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${gender === 'boy' ? 'bg-boy-soft text-boy border-boy/20' : 'bg-girl-soft text-girl border-girl/20'}`}>
                              <Ruler size={24} />
                            </div>
                            <span className="section-label mb-0">身高百分位</span>
                          </div>
                          <div className="space-y-6">
                            <div>
                              {(() => {
                                const { text, isExtreme } = formatPercentile(results.hRes.percentile);
                                return (
                                  <div className="flex items-baseline gap-1">
                                    <p className={`text-6xl font-black tracking-tighter ${isExtreme ? 'text-red-500' : 'text-ink'}`}>
                                      {text.replace('%', '')}
                                    </p>
                                    {!isExtreme && <span className="text-2xl font-black text-slate-300">%</span>}
                                  </div>
                                );
                              })()}
                              <p className="text-base font-bold text-ink-muted mt-1">{height} cm</p>
                            </div>
                            <GrowthProgressBar 
                              percentile={results.hRes.percentile} 
                              label="生長百分位" 
                              color={gender === 'boy' ? 'bg-boy' : 'bg-girl'} 
                            />
                          </div>
                        </div>

                        <div className="bento-item border-2 border-line">
                          <div className="flex items-center justify-between mb-8">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 border-2 border-orange-100">
                              <Weight size={24} />
                            </div>
                            <span className="section-label mb-0">體重百分位</span>
                          </div>
                          <div className="space-y-6">
                            <div>
                              {(() => {
                                const { text, isExtreme } = formatPercentile(results.wRes.percentile);
                                return (
                                  <div className="flex items-baseline gap-1">
                                    <p className={`text-6xl font-black tracking-tighter ${isExtreme ? 'text-red-500' : 'text-ink'}`}>
                                      {text.replace('%', '')}
                                    </p>
                                    {!isExtreme && <span className="text-2xl font-black text-slate-300">%</span>}
                                  </div>
                                );
                              })()}
                              <p className="text-base font-bold text-ink-muted mt-1">{weight} kg</p>
                            </div>
                            <GrowthProgressBar 
                              percentile={results.wRes.percentile} 
                              label="重量百分位" 
                              color="bg-orange-500" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Genetic Comparison */}
                      {results.geneticComparison && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-slate-100 p-6 rounded-2xl border-2 border-line shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white border-2 border-line rounded-xl flex items-center justify-center text-accent shrink-0 shadow-sm">
                              <Info size={20} />
                            </div>
                            <div className="space-y-4 flex-1">
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                {results.geneticComparison}
                              </p>
                              {results.geneticPercentile !== null && (
                                <div className="pt-2 border-t-2 border-slate-200">
                                  <GrowthProgressBar 
                                    percentile={results.geneticPercentile} 
                                    label="遺傳目標百分位" 
                                    color="bg-accent" 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <button 
                          onClick={copyResults} 
                          className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
                        >
                          <Share2 size={18} className="text-accent" /> 複製分享
                        </button>
                        <button 
                          onClick={exportCSV} 
                          className="btn-secondary flex-1 text-sm flex items-center justify-center gap-2"
                        >
                          <Download size={18} className="text-accent" /> 匯出紀錄
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Advice Badges */}
                  {(results.quadrant || results.bmiAdvice || results.geneticAdvice) && (
                    <div className="grid grid-cols-1 gap-4">
                      {results.quadrant && (
                        <motion.button 
                          whileHover={{ scale: 1.01, x: 4 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => openAdvice(results.quadrant as keyof typeof ADVICE_TEXTS, "發育狀態建議")}
                          className="bg-white border-2 border-red-200 p-6 rounded-2xl flex items-center justify-between text-left group shadow-[4px_4px_0px_0px_rgba(239,68,68,0.05)]"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 border-2 border-red-100">
                              <Activity size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">發育狀態提醒</p>
                              <p className="text-[10px] text-red-600 font-black uppercase tracking-widest mt-0.5">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                        </motion.button>
                      )}
                      {results.bmiAdvice && (
                        <motion.button 
                          whileHover={{ scale: 1.01, x: 4 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => openAdvice(results.bmiAdvice as keyof typeof ADVICE_TEXTS, "體位狀態建議")}
                          className="bg-white border-2 border-orange-200 p-6 rounded-2xl flex items-center justify-between text-left group shadow-[4px_4px_0px_0px_rgba(249,115,22,0.05)]"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 border-2 border-orange-100">
                              <Activity size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">體位狀態提醒</p>
                              <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest mt-0.5">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                        </motion.button>
                      )}
                      {results.geneticAdvice && (
                        <motion.button 
                          whileHover={{ scale: 1.01, x: 4 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => openAdvice(results.geneticAdvice as keyof typeof ADVICE_TEXTS, "遺傳偏差建議")}
                          className="bg-white border-2 border-blue-200 p-6 rounded-2xl flex items-center justify-between text-left group shadow-[4px_4px_0px_0px_rgba(37,99,235,0.05)]"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border-2 border-blue-100">
                              <Activity size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">生長軌跡與遺傳目標偏差提醒</p>
                              <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-0.5">點擊查看建議</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* Adult Prediction Card */}
                  {inherited && (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="bg-accent rounded-3xl p-8 text-white shadow-[8px_8px_0px_0px_rgba(37,99,235,0.2)] relative overflow-hidden border-2 border-accent/20"
                    >
                      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">預估成年身高</label>
                          <p className="text-6xl font-black tracking-tighter font-display">{inherited.median.toFixed(1)} <span className="text-2xl font-medium">cm</span></p>
                          <div className="flex items-center gap-3 mt-4">
                            <div className="h-2 w-20 bg-white/20 rounded-full overflow-hidden border border-white/10">
                              <div className="h-full bg-white w-2/3 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                            </div>
                            <p className="text-xs font-black opacity-90">遺傳範圍：{inherited.min.toFixed(1)} - {inherited.max.toFixed(1)}</p>
                          </div>
                        </div>
                        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border-2 border-white/30 shadow-lg">
                          <Ruler size={40} strokeWidth={3} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Median Values Toggle */}
                  <div className="glass-card overflow-hidden border-2 border-line">
                    <button 
                      onClick={() => setShowMedian(!showMedian)}
                      className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-accent border-2 border-line shadow-sm">
                          <Info size={24} />
                        </div>
                        <span className="text-base font-black text-ink">查看 50 百分位 (中位數)</span>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${showMedian ? 'bg-accent text-white border-accent rotate-180 shadow-md' : 'bg-slate-100 text-slate-400 border-line'}`}>
                        <ChevronDown size={20} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {showMedian && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-8 pb-8"
                        >
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="bg-slate-100 p-6 rounded-2xl border-2 border-line shadow-sm">
                              <label className="section-label">身高 50th</label>
                              <p className="text-3xl font-black text-ink font-display">{results.hRes.p50.toFixed(1)} <span className="text-sm font-bold text-slate-400">cm</span></p>
                            </div>
                            <div className="bg-slate-100 p-6 rounded-2xl border-2 border-line shadow-sm">
                              <label className="section-label">體重 50th</label>
                              <p className="text-3xl font-black text-ink font-display">{results.wRes.p50.toFixed(1)} <span className="text-sm font-bold text-slate-400">kg</span></p>
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
                    className="glass-card p-12 text-center border-2 border-dashed border-slate-300 space-y-8 bg-slate-50/50"
                  >
                    <motion.div 
                      animate={{ y: [0, -12, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="w-28 h-28 bg-white rounded-[32px] flex items-center justify-center mx-auto border-2 border-line shadow-lg"
                    >
                      <UserPlus className="text-accent" size={56} />
                    </motion.div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-ink tracking-tight">開始分析</h3>
                      <p className="text-base text-ink-muted font-bold max-w-[280px] mx-auto leading-relaxed">請在左側輸入孩子的資料，我們將為您進行精確分析</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Q&A Section */}
        <div id="qa-section" className="space-y-10 pb-32">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,0.05)] border-2 border-line">
              <HelpCircle size={32} className="text-accent" />
            </div>
            <h2 className="text-3xl font-black text-ink tracking-tight">常見問題 Q&A</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {qaData.map((item, index) => (
              <motion.div 
                key={index} 
                initial={false}
                className="bg-white rounded-[24px] border-2 border-line overflow-hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,0.05)] hover:shadow-[8px_8px_0px_0px_rgba(15,23,42,0.1)] transition-all"
              >
                <button 
                  onClick={() => setOpenQA(openQA === index ? null : index)}
                  className="w-full px-8 py-8 flex items-center justify-between text-left group"
                >
                  <span className="text-base font-black text-ink leading-snug group-hover:text-accent transition-colors">{item.q}</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${openQA === index ? 'bg-accent text-white border-accent rotate-180 shadow-md' : 'bg-slate-50 text-slate-400 border-line'}`}>
                    <ChevronDown size={20} />
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
                      <div className="pt-6 text-sm text-ink-muted font-bold leading-relaxed space-y-6 border-t-2 border-slate-100">
                        <p className="whitespace-pre-wrap">{item.a}</p>
                        {item.link && (
                          <motion.a 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            href={item.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-primary inline-flex items-center gap-3"
                          >
                            {item.linkText}
                            <ExternalLink size={16} />
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
      <footer className="bg-white/95 backdrop-blur-xl border-t-2 border-line py-8 px-6 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-12px_24px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors border-2 border-white/20 ${gender === 'boy' ? 'bg-boy shadow-boy/20' : 'bg-girl shadow-girl/20'}`}
            >
              <Heart className="text-white" size={28} fill="currentColor" />
            </motion.div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-ink tracking-tight">
                  兒童成長曲線小幫手
                </h1>
                <span className="text-[11px] font-black bg-accent text-white px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-sm">v3.2</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-xs text-ink-muted font-bold">專業精確的成長評估工具</p>
                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                <a 
                  href="https://www.facebook.com/profile.php?id=61557246475372" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-black text-accent hover:underline transition-all"
                >
                  <Facebook size={14} fill="currentColor" />
                  阿銘醫師
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setBirthdateInput(''); setHeight(''); setWeight('');
                setFatherHeight(''); setMotherHeight('');
                setModal({ isOpen: true, title: '已重置', content: '所有輸入資料已清除。' });
              }}
              className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border-2 border-line active:scale-95 shadow-sm"
              title="重置資料"
            >
              <Trash2 size={24} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

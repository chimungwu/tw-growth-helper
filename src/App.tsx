/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Copy, Download, HelpCircle, ChevronDown, ChevronUp, User, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  boyWeightData, boyHeightData, girlWeightData, girlHeightData 
} from './data/growthData';
import { 
  interpolateValue, findClosestIndices, calculateBMI, 
  determineWeightCategory, calculateInheritedHeight,
  calculatePercentileFromValue, checkGrowthQuadrant, type GrowthQuadrant
} from './utils/calculations';

type Gender = 'boy' | 'girl';

const ADVICE_TEXTS = {
  slow: "【長太慢組建議】\n強調脾胃運化、確保充足睡眠時間（晚上10點前入睡）與追趕生長。建議諮詢專業醫師評估生長激素或中醫調理。",
  fast: "【衝太快組建議】\n提醒監測骨齡、減少環境賀爾蒙（如塑化劑）、控管 BMI 避免過重，以預防性早熟導致生長板提早閉合。"
};

export default function App() {
  const [gender, setGender] = useState<Gender>('boy');
  const [birthdateInput, setBirthdateInput] = useState('');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [fatherHeight, setFatherHeight] = useState<string>('');
  const [motherHeight, setMotherHeight] = useState<string>('');
  const [showMedian, setShowMedian] = useState(false);
  const [openQA, setOpenQA] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

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
      alert('請點擊瀏覽器下方的「分享」按鈕，然後選擇「加入主畫面」以安裝此應用程式。');
    }
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
        geneticComparison = '⚠️ 目前生長進度跑輸遺傳潛力。';
      } else if (diff > 15) {
        geneticComparison = '🎉 目前生長進度跑贏遺傳潛力。';
      } else {
        geneticComparison = '符合遺傳預期。';
      }
    }

    const quadrant = checkGrowthQuadrant(gender, age, hRes.percentile);

    return { hRes, wRes, bmi, bmiCategory, geneticPercentile, geneticComparison, quadrant };
  }, [ageData, height, weight, gender, fatherHeight, motherHeight]);

  const inherited = useMemo(() => {
    if (!fatherHeight || !motherHeight) return null;
    return calculateInheritedHeight(gender, parseFloat(fatherHeight), parseFloat(motherHeight));
  }, [gender, fatherHeight, motherHeight]);

  const copyResults = () => {
    if (!results || !ageData) return;
    const text = `
【台灣兒童生長曲線小幫手】
性別：${gender === 'boy' ? '男孩' : '女孩'}
年齡：${ageData.display}
身高：${height} cm (百分位: ${results.hRes.percentile.toFixed(1)})
體重：${weight} kg (百分位: ${results.wRes.percentile.toFixed(1)})
BMI：${results.bmi} (${results.bmiCategory})
${inherited ? `預估目標身高：${inherited.median.toFixed(1)} cm (${inherited.min.toFixed(1)} - ${inherited.max.toFixed(1)})` : ''}
日期：${new Date().toLocaleDateString('zh-TW')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      alert('結果已複製到剪貼簿');
    });
  };

  const exportCSV = () => {
    if (!results || !ageData) return;
    const headers = "\uFEFF日期,性別,年齡,身高(cm),身高百分位,體重(kg),體重百分位,BMI,BMI判定\n";
    const row = `${new Date().toLocaleDateString('zh-TW')},${gender === 'boy' ? '男' : '女'},${ageData.display},${height},${results.hRes.percentile.toFixed(1)},${weight},${results.wRes.percentile.toFixed(1)},${results.bmi},${results.bmiCategory}\n`;
    
    const blob = new Blob([headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `成長追蹤_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const qaData = [
    { q: "這個工具的資料來源是什麼？", a: "引用自陳偉德醫師與張美惠醫師於 2010 年發表的台灣本土研究，該研究根據 WHO 標準制定新的兒童與青少年成長曲線。" },
    { q: "BMI 百分位的標準是依據哪個單位？", a: "採用衛福部國健署於 102 年公告的台灣兒童與青少年體位判定參考值。" },
    { q: "如何計算孩子未來的預估成年身高？", a: "使用 Tanner 等學者提出的 Target Height 公式。男孩：(父+母+13)/2；女孩：(父+母-13)/2。" },
    { q: "這個工具適合哪些人使用？", a: "提供給家長、中醫師、小兒科醫師參考。所有數據僅供參考，若有疑問請諮詢專業醫療人員。" }
  ];

  return (
    <div className="min-h-screen bg-[#FDF8F3] text-[#4A443F] font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E2DC] py-6 px-4 text-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold text-[#2D2926] tracking-tight flex items-center justify-center gap-2">
          <UserPlus className="text-[#D4A373]" />
          台灣兒童生長曲線小幫手
        </h1>
        <p className="text-sm text-[#8B837C] mt-1">專業、精確的成長追蹤工具</p>
      </header>

      <main className="max-w-md mx-auto px-4 mt-8 space-y-8">
        {/* PWA Install Banner */}
        {showInstallBanner && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#D4A373] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FDF8F3] rounded-xl flex items-center justify-center">
                <UserPlus className="text-[#D4A373]" size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#2D2926]">安裝生長小幫手</p>
                <p className="text-[10px] text-[#8B837C]">隨時追蹤，離線也能使用</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="px-3 py-2 text-xs text-[#8B837C] font-medium"
              >
                稍後
              </button>
              <button 
                onClick={handleInstallClick}
                className="bg-[#D4A373] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
              >
                安裝
              </button>
            </div>
          </motion.div>
        )}

        {/* Results Card */}
        <AnimatePresence mode="wait">
          {results ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#E9F1FF] border-2 border-[#B8CDEE] rounded-3xl p-6 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-12 -mt-12 blur-2xl" />
              
              <div className="space-y-4 relative z-10">
                <div className="text-center border-b border-[#B8CDEE] pb-4">
                  <p className="text-[#1E3A8A] font-bold text-lg">
                    {gender === 'boy' ? '👦 男孩' : '👧 女孩'} {ageData?.display}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/50 p-3 rounded-2xl">
                    <p className="text-xs text-[#5B7CB2] uppercase font-bold tracking-wider">身高百分位</p>
                    <p className="text-2xl font-black text-[#1E3A8A]">{results.hRes.percentile.toFixed(1)}%</p>
                    <p className="text-[10px] text-[#5B7CB2] mt-1">{height} cm</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-2xl">
                    <p className="text-xs text-[#5B7CB2] uppercase font-bold tracking-wider">體重百分位</p>
                    <p className="text-2xl font-black text-[#1E3A8A]">{results.wRes.percentile.toFixed(1)}%</p>
                    <p className="text-[10px] text-[#5B7CB2] mt-1">{weight} kg</p>
                  </div>
                </div>

                <div className="bg-white/80 p-4 rounded-2xl text-center">
                  <p className="text-sm font-bold text-[#1E3A8A]">
                    BMI: {results.bmi} <span className="px-2 py-0.5 bg-[#B8CDEE] rounded-full text-xs ml-2">{results.bmiCategory}</span>
                  </p>
                </div>

                {results.geneticComparison && (
                  <div className="bg-white/50 p-3 rounded-2xl text-center">
                    <p className="text-xs font-bold text-[#1E3A8A]">{results.geneticComparison}</p>
                    {results.geneticPercentile !== null && (
                      <p className="text-[10px] text-[#5B7CB2] mt-0.5">遺傳百分位: {results.geneticPercentile.toFixed(1)}%</p>
                    )}
                  </div>
                )}

                {results.quadrant && (
                  <div className="bg-[#FFF5F5] border border-[#FECACA] p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔴</span>
                      <span className="text-sm font-bold text-[#991B1B]">發育狀態提醒</span>
                    </div>
                    <button 
                      onClick={() => {
                        const advice = results.quadrant === 'slow' ? ADVICE_TEXTS.slow : ADVICE_TEXTS.fast;
                        alert(advice);
                      }}
                      className="bg-[#991B1B] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-[#7F1D1D] transition-colors"
                    >
                      查看阿銘醫師建議
                    </button>
                  </div>
                )}

                {inherited && (
                  <div className="bg-[#D1E2FF] p-4 rounded-2xl border border-[#B8CDEE]">
                    <p className="text-xs text-[#5B7CB2] font-bold text-center mb-1">預估目標身高</p>
                    <p className="text-xl font-black text-[#1E3A8A] text-center">{inherited.median.toFixed(1)} cm</p>
                    <p className="text-[10px] text-[#5B7CB2] text-center">範圍: {inherited.min.toFixed(1)} - {inherited.max.toFixed(1)} cm</p>
                  </div>
                )}

                {showMedian && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-white/30 p-3 rounded-xl border border-dashed border-[#B8CDEE] text-xs space-y-1"
                  >
                    <p className="font-bold text-[#5B7CB2]">同年齡 50% 標準值：</p>
                    <div className="flex justify-between">
                      <span>身高: {results.hRes.p50.toFixed(1)} cm</span>
                      <span>體重: {results.wRes.p50.toFixed(1)} kg</span>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={copyResults} className="flex-1 bg-white hover:bg-gray-50 text-[#1E3A8A] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Copy size={14} /> 複製
                  </button>
                  <button onClick={exportCSV} className="flex-1 bg-white hover:bg-gray-50 text-[#1E3A8A] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Download size={14} /> 匯出
                  </button>
                  <button 
                    onClick={() => setShowMedian(!showMedian)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${showMedian ? 'bg-[#1E3A8A] text-white' : 'bg-white text-[#1E3A8A]'}`}
                  >
                    50%
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white border-2 border-dashed border-[#E8E2DC] rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-[#FDF8F3] rounded-full flex items-center justify-center mx-auto">
                <User className="text-[#D4A373]" size={32} />
              </div>
              <p className="text-sm text-[#8B837C]">請在下方輸入資料以查看分析結果</p>
            </div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8E2DC] space-y-6">
          {/* Gender */}
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => setGender('boy')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all ${gender === 'boy' ? 'bg-[#E9F1FF] border-[#B8CDEE] text-[#1E3A8A] font-bold' : 'bg-white border-[#F5F2EF] text-[#8B837C]'}`}
            >
              男孩
            </button>
            <button 
              onClick={() => setGender('girl')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all ${gender === 'girl' ? 'bg-[#FFF0F5] border-[#FFD1DC] text-[#C71585] font-bold' : 'bg-white border-[#F5F2EF] text-[#8B837C]'}`}
            >
              女孩
            </button>
            <button 
              onClick={() => {
                setBirthdateInput(''); setHeight(''); setWeight('');
                setFatherHeight(''); setMotherHeight('');
              }}
              className="p-3 bg-[#FDF8F3] rounded-2xl text-[#8B837C] hover:bg-[#F5F2EF] transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#8B837C] uppercase tracking-wider ml-1">生日 / 年齡</label>
              <input 
                type="text"
                placeholder="YYYYMMDD 或 直接輸入年齡"
                value={birthdateInput}
                onChange={(e) => setBirthdateInput(e.target.value)}
                className="w-full bg-[#FDF8F3] border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#D4A373] transition-all text-center placeholder:text-[#C4BCB5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8B837C] uppercase tracking-wider ml-1">身高 (cm)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-[#FDF8F3] border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#D4A373] transition-all text-center"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8B837C] uppercase tracking-wider ml-1">體重 (kg)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-[#FDF8F3] border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#D4A373] transition-all text-center"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#F5F2EF]">
              <p className="text-[10px] font-bold text-[#C4BCB5] text-center mb-3 uppercase tracking-widest">父母身高 (預估成年身高用)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#8B837C] uppercase tracking-wider ml-1">爸爸 (cm)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={fatherHeight}
                    onChange={(e) => setFatherHeight(e.target.value)}
                    className="w-full bg-[#FDF8F3] border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#D4A373] transition-all text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#8B837C] uppercase tracking-wider ml-1">媽媽 (cm)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={motherHeight}
                    onChange={(e) => setMotherHeight(e.target.value)}
                    className="w-full bg-[#FDF8F3] border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#D4A373] transition-all text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Q&A Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#2D2926] flex items-center gap-2 ml-2">
            <HelpCircle size={20} className="text-[#D4A373]" />
            常見問題 Q&A
          </h2>
          <div className="space-y-2">
            {qaData.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl border border-[#E8E2DC] overflow-hidden">
                <button 
                  onClick={() => setOpenQA(openQA === index ? null : index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#FDF8F3] transition-colors"
                >
                  <span className="text-sm font-bold text-[#4A443F]">{item.q}</span>
                  {openQA === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <AnimatePresence>
                  {openQA === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-4 text-xs text-[#8B837C] leading-relaxed"
                    >
                      {item.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center space-y-4 pt-8">
          <div className="inline-block bg-white px-6 py-4 rounded-3xl border border-[#E8E2DC] shadow-sm">
            <p className="text-xs text-[#8B837C]">
              程式維護：<a href="https://www.facebook.com/profile.php?id=61557246475372" target="_blank" className="text-[#D4A373] font-bold hover:underline">仨寶爸中醫博士吳啓銘</a>
            </p>
          </div>
          <p className="text-[10px] text-[#C4BCB5] uppercase tracking-widest">
            Version 2026.03.20 ver.20
          </p>
        </footer>
      </main>
    </div>
  );
}

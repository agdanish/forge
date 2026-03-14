/**
 * Wizard / Intake / Multi-step Form shell — generates a complete App.tsx from an AppSpec.
 * Covers: progress stepper, focused step inputs, option cards, summary/review,
 * result/recommendation panel, restart flow.
 * Designed for onboarding, intake, assessment, eligibility, guided setup prompts.
 */

import { AppSpec } from './spec.js';
import { getThemeById } from './themes.js';

export function renderWizardShell(spec: AppSpec): string {
  const t = getThemeById(spec.theme);
  const isDark = spec.theme.includes('dark');

  // Derive step labels from categories (first 4) or use generic defaults
  const steps = spec.categories.length >= 4
    ? spec.categories.slice(0, 4)
    : ['Getting Started', 'Preferences', 'Details', 'Review'];
  const stepsJSON = JSON.stringify(steps);

  // Derive option groups from categories for each step (non-overlapping)
  const allCats = spec.categories;
  const chunkSize = Math.max(2, Math.ceil(allCats.length / 3));
  const optionsPerStep = [
    allCats.slice(0, chunkSize),
    allCats.slice(chunkSize, chunkSize * 2),
    allCats.slice(chunkSize * 2, chunkSize * 3),
  ].map(chunk => chunk.length > 0 ? chunk : allCats.slice(0, 2)); // fallback: reuse first 2 if chunk is empty
  const optionsJSON = JSON.stringify(optionsPerStep);

  const kpiJSON = JSON.stringify(spec.kpis);

  return `import { useState, useMemo } from 'react';
import {
  ChevronRight, ChevronLeft, Check, RotateCcw, Sparkles,
  ArrowRight, CheckCircle2, Circle, AlertCircle, Star,
  Zap, Shield, Globe, BarChart3, TrendingUp
} from 'lucide-react';

interface KpiCard { label: string; value: string; trend: string; trendUp: boolean; }

const STEPS: string[] = ${stepsJSON};
const OPTIONS_PER_STEP: string[][] = ${optionsJSON};
const KPIS: KpiCard[] = ${kpiJSON};

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<{ [step: number]: string[] }>({});
  const [textInputs, setTextInputs] = useState<{ [step: number]: string }>({});
  const [showResult, setShowResult] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);

  const totalSteps = STEPS.length;
  const isLastInputStep = currentStep === totalSteps - 2;
  const isReviewStep = currentStep === totalSteps - 1;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const toggleSelection = (step: number, option: string) => {
    setSelections(prev => {
      const current = prev[step] || [];
      const exists = current.includes(option);
      return { ...prev, [step]: exists ? current.filter(o => o !== option) : [...current, option] };
    });
  };

  const setTextInput = (step: number, value: string) => {
    setTextInputs(prev => ({ ...prev, [step]: value }));
  };

  const goNext = () => {
    if (isReviewStep) {
      setShowResult(true);
    } else if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const restart = () => {
    setCurrentStep(0);
    setSelections({});
    setTextInputs({});
    setShowResult(false);
    setResultDismissed(false);
  };

  const hasSelections = (step: number) => (selections[step] || []).length > 0 || (textInputs[step] || '').length > 0;
  const allStepsComplete = Array.from({ length: totalSteps - 1 }, (_, i) => i).every(i => hasSelections(i));

  // Derive recommendation from selections
  const getRecommendation = () => {
    const allSelected = Object.values(selections).flat();
    const count = allSelected.length;
    if (count >= 5) return { level: 'Premium', match: '95%', summary: 'Based on your selections, you qualify for the full ${spec.primaryEntity.toLowerCase()} experience with all features unlocked.' };
    if (count >= 3) return { level: 'Standard', match: '78%', summary: 'Your profile matches our standard ${spec.primaryEntity.toLowerCase()} package. Consider adding more preferences for a better fit.' };
    return { level: 'Starter', match: '60%', summary: 'We recommend starting with the basics and upgrading as your ${spec.domain.toLowerCase()} needs grow.' };
  };

  const recommendation = getRecommendation();

  return (
    <div className="min-h-screen ${t.bg} ${t.text}">
      {/* Header */}
      <header className="border-b ${t.cardBorder} ${t.card}">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg ${t.primary} flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">${spec.appName}</h1>
              <p className="${t.textMuted} text-xs">${spec.tagline}</p>
            </div>
          </div>
          {(currentStep > 0 || showResult) && (
            <button onClick={restart} className="${t.textMuted} hover:${t.text} text-sm flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {!showResult ? (
          <>
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Step {currentStep + 1} of {totalSteps}</span>
                <span className="${t.textMuted} text-sm">{Math.round(progress)}% complete</span>
              </div>
              <div className="h-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden">
                <div className="${t.primary} h-full rounded-full transition-all duration-500 ease-out" style={{ width: \`\${progress}%\` }} />
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center">
                  <button
                    onClick={() => i < currentStep && setCurrentStep(i)}
                    className={\`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors \${
                      i === currentStep ? '${t.primary} text-white font-medium' :
                      i < currentStep ? '${isDark ? 'text-emerald-400' : 'text-emerald-600'} cursor-pointer' :
                      '${t.textMuted}'
                    }\`}>
                    {i < currentStep ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : i === currentStep ? (
                      <Circle className="w-4 h-4 flex-shrink-0 fill-current" />
                    ) : (
                      <Circle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="hidden sm:inline whitespace-nowrap">{step}</span>
                  </button>
                  {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 ${t.textMuted} flex-shrink-0 mx-1" />}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="${t.card} border ${t.cardBorder} rounded-2xl p-6 sm:p-8 mb-6">
              <h2 className="text-xl font-bold mb-2">{STEPS[currentStep]}</h2>
              <p className="${t.textMuted} text-sm mb-6">
                {isReviewStep
                  ? 'Review your selections before we generate your personalized recommendation.'
                  : \`Select the options that best describe your ${spec.primaryEntity.toLowerCase()} needs.\`}
              </p>

              {isReviewStep ? (
                /* Review Step */
                <div className="space-y-4">
                  {STEPS.slice(0, -1).map((stepName, i) => (
                    <div key={i} className="p-4 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} border ${t.cardBorder}">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-sm">{stepName}</h3>
                        <button onClick={() => setCurrentStep(i)} className="text-xs ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'}">
                          Edit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(selections[i] || []).map(s => (
                          <span key={s} className="px-2 py-1 rounded-full text-xs font-medium ${t.primary} text-white">{s}</span>
                        ))}
                        {textInputs[i] && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}">{textInputs[i]}</span>
                        )}
                        {!hasSelections(i) && (
                          <span className="${t.textMuted} text-xs italic">No selections yet</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Input Steps */
                <div>
                  {/* Option Cards */}
                  {OPTIONS_PER_STEP[currentStep] && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      {(OPTIONS_PER_STEP[currentStep] || []).map(option => {
                        const isSelected = (selections[currentStep] || []).includes(option);
                        return (
                          <button key={option} onClick={() => toggleSelection(currentStep, option)}
                            className={\`p-4 rounded-xl border-2 text-left transition-all \${
                              isSelected
                                ? '${isDark ? 'border-indigo-500 bg-indigo-500/10' : 'border-blue-500 bg-blue-50'}'
                                : '${t.cardBorder} hover:border-${isDark ? 'indigo' : 'blue'}-500/50 ${t.card}'
                            }\`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{option}</span>
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-blue-600'}" />
                              ) : (
                                <Circle className="w-5 h-5 ${t.textMuted}" />
                              )}
                            </div>
                            <p className="${t.textMuted} text-xs">Select for ${spec.primaryEntity.toLowerCase()} \${option.toLowerCase()}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Text Input */}
                  <div>
                    <label className="${t.textMuted} text-xs font-medium block mb-2">Additional notes (optional)</label>
                    <input
                      type="text"
                      placeholder="Type any additional preferences..."
                      value={textInputs[currentStep] || ''}
                      onChange={e => setTextInput(currentStep, e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border ${t.cardBorder} ${t.input} ${t.text} text-sm focus:outline-none focus:ring-2 focus:ring-${isDark ? 'indigo' : 'blue'}-500/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button onClick={goBack} disabled={currentStep === 0}
                className={\`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 \${
                  currentStep === 0 ? 'opacity-0 pointer-events-none' : '${t.card} border ${t.cardBorder} ${t.textMuted} hover:${t.text}'
                }\`}>
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={goNext}
                className="px-6 py-2.5 rounded-xl ${t.primary} hover:${t.primaryHover} text-white text-sm font-medium transition-colors flex items-center gap-2 shadow-lg">
                {isReviewStep ? 'Get Recommendation' : 'Continue'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          /* Result / Recommendation Panel */
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl ${t.primary} flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Your Personalized Result</h2>
              <p className="${t.textMuted} text-sm">Based on your ${spec.primaryEntity.toLowerCase()} assessment</p>
            </div>

            {/* Recommendation Card */}
            <div className="${t.card} border ${t.cardBorder} rounded-2xl p-6 sm:p-8 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="${t.textMuted} text-xs font-medium uppercase tracking-wider mb-1">Recommended Plan</p>
                  <h3 className="text-2xl font-bold">{recommendation.level}</h3>
                </div>
                <div className="text-right">
                  <p className="${t.textMuted} text-xs font-medium mb-1">Match Score</p>
                  <p className="text-3xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}">{recommendation.match}</p>
                </div>
              </div>
              <p className="${t.textMuted} text-sm mb-6">{recommendation.summary}</p>

              {/* Match breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {KPIS.map((kpi, i) => (
                  <div key={i} className="p-3 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}">
                    <p className="${t.textMuted} text-xs">{kpi.label}</p>
                    <p className="font-bold text-lg mt-1">{kpi.value}</p>
                    <p className={\`text-xs mt-0.5 \${kpi.trendUp ? '${isDark ? 'text-emerald-400' : 'text-emerald-600'}' : 'text-red-400'}\`}>{kpi.trend}</p>
                  </div>
                ))}
              </div>

              {/* Selected features summary */}
              <div className="border-t ${t.cardBorder} pt-4">
                <p className="text-sm font-medium mb-3">Your Selections</p>
                <div className="flex flex-wrap gap-2">
                  {Object.values(selections).flat().map((s, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}">{s}</span>
                  ))}
                  {Object.values(textInputs).filter(Boolean).map((t, i) => (
                    <span key={'t'+i} className="px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={restart}
                className="flex-1 px-5 py-3 rounded-xl border ${t.cardBorder} ${t.card} ${t.textMuted} hover:${t.text} text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Retake Assessment
              </button>
              <button className="flex-1 px-5 py-3 rounded-xl ${t.primary} hover:${t.primaryHover} text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg">
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
`;
}

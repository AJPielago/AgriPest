import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Bug, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const OnboardingModal = ({ isOpen, onClose }) => {
  const { lang, t } = useLanguage();
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const steps = lang === 'tl' ? [
    {
      title: "Hakbang 1: Kumuha o Mag-upload ng Larawan",
      icon: Bug,
      content: "Gamitin ang camera ng cellphone o gallery upang mag-upload ng malinaw na larawan ng dahon o insect specimen. Maaari ring itala ang uri ng pananim, panahon, at barangay."
    },
    {
      title: "Hakbang 2: Pagsusuri ng AI Model",
      icon: CheckCircle2,
      content: "Sinusuri ng sistema ang mga porma ng peste upang matukoy ang uri at antas ng katiyakan (confidence score)."
    },
    {
      title: "Hakbang 3: Hakbang sa Pagsugpo at Puna",
      icon: ShieldCheck,
      content: "Suriin ang inirerekomendang biological at chemical control steps. Ipadala ang puna upang makatulong sa pagpasanay ng AI model sa hinaharap!"
    }
  ] : [
    {
      title: "Step 1: Capture or Upload Specimen",
      icon: Bug,
      content: "Use your device camera or gallery to upload a clear photo of the crop leaf, stem, or insect specimen. Optionally tag target crop, weather, and field location."
    },
    {
      title: "Step 2: AI Diagnostic Inference",
      icon: CheckCircle2,
      content: "The system runs detection algorithms (Mock Engine pre-ML phase; pluggable PyTorch/YOLOv8 model in Phase 6) to locate pest boundaries and calculate confidence scores."
    },
    {
      title: "Step 3: Action Protocol & Feedback",
      icon: ShieldCheck,
      content: "Review biological and cultural management recommendations. Submit farmer feedback to help refine model accuracy for future crop cycles!"
    }
  ];

  const currentStep = steps[step - 1];
  const IconComp = currentStep.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={lang === 'tl' ? "Gabay sa Paggamit" : "Platform Quick Tour"}>
      <div className="space-y-4 py-2">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium pb-3 border-b border-slate-200 dark:border-slate-800">
          <span>{lang === 'tl' ? `Hakbang ${step} sa 3` : `Guide Step ${step} of 3`}</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <span
                key={s}
                className={`w-2 h-2 rounded-full ${s === step ? 'bg-emerald-700 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="flex items-start gap-4 p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900">
          <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center flex-shrink-0">
            <IconComp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">{currentStep.title}</h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{currentStep.content}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-between items-center pt-2">
          {step > 1 ? (
            <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
              {lang === 'tl' ? "Bumalik" : "Previous"}
            </Button>
          ) : <div />}

          {step < 3 ? (
            <Button variant="primary" size="sm" icon={ArrowRight} onClick={() => setStep(step + 1)}>
              {lang === 'tl' ? "Susunod" : "Next Step"}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onClose}>
              {lang === 'tl' ? "Naiintindihan Ko, Magsimula Na!" : "Got It, Let's Start!"}
            </Button>
          )}
        </div>

      </div>
    </Modal>
  );
};

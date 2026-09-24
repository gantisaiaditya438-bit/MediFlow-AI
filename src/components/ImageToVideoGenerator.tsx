import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Upload,
  Sparkles,
  Play,
  Pause,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  X,
  FileImage,
  Layers,
  ArrowRight,
  Maximize2,
  Clock,
  Compass,
} from 'lucide-react';
import { ClinicalIntakeRecord } from '../types';

interface ImageToVideoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecord: ClinicalIntakeRecord | null;
  onAttachVideoToRecord?: (videoUrl: string, prompt: string) => void;
}

// High-yield clinical sample images for instant 1-click testing
const CLINICAL_SAMPLES = [
  {
    id: 'cardiac',
    label: 'Cardiac Anatomy & Ultrasound',
    description: 'Ventricular wall and valve dynamics',
    prompt: 'Smoothly animate cardiac cycle with rhythmic ventricular contraction and valve mechanics, cinematic clinical lighting.',
    // Clean SVG Data URI for instantaneous loading without network dependencies
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%230f172a"><rect width="640" height="360" fill="%23090d16"/><circle cx="320" cy="180" r="110" fill="%231e293b" stroke="%230d9488" stroke-width="4"/><path d="M260,180 C260,120 380,120 380,180 C380,240 320,270 320,270 C320,270 260,240 260,180 Z" fill="%23e11d48" opacity="0.85"/><circle cx="295" cy="165" r="16" fill="%2338bdf8" opacity="0.9"/><circle cx="345" cy="165" r="16" fill="%2338bdf8" opacity="0.9"/><text x="320" y="325" fill="%2394a3b8" font-family="sans-serif" font-size="14" text-anchor="middle" font-weight="bold">CARDIAC TRANSTHORACIC CROSS-SECTION</text></svg>`,
  },
  {
    id: 'chest-xray',
    label: 'Chest Radiograph / Aeration',
    description: 'Pulmonary lung expansion and diaphragm motion',
    prompt: 'Animate deep respiratory cycle showing smooth thoracic chest expansion and rhythmic diaphragm descent.',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%23090d16"><rect width="640" height="360" fill="%23050811"/><path d="M220,100 Q180,180 200,260 Q260,280 280,240 Q280,160 220,100 Z" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><path d="M420,100 Q460,180 440,260 Q380,280 360,240 Q360,160 420,100 Z" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><line x1="320" y1="80" x2="320" y2="280" stroke="%2364748b" stroke-width="6" stroke-dasharray="10,6"/><text x="320" y="325" fill="%2394a3b8" font-family="sans-serif" font-size="14" text-anchor="middle" font-weight="bold">PA CHEST RADIOGRAPH - PULMONARY AERATION</text></svg>`,
  },
  {
    id: 'joint-ortho',
    label: 'Knee Joint Articulation',
    description: 'Femoral-tibial flexion & patellar glide',
    prompt: 'Demonstrate fluid sagittal knee joint flexion and extension showing smooth articular biomechanics.',
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%23090d16"><rect width="640" height="360" fill="%23020617"/><rect x="290" y="50" width="60" height="120" rx="20" fill="%23334155" stroke="%230ea5e9" stroke-width="3"/><rect x="290" y="190" width="60" height="120" rx="15" fill="%23334155" stroke="%230ea5e9" stroke-width="3"/><circle cx="320" cy="180" r="18" fill="%2314b8a6"/><text x="320" y="335" fill="%2394a3b8" font-family="sans-serif" font-size="14" text-anchor="middle" font-weight="bold">SAGITTAL KNEE JOINT ARTICULATION</text></svg>`,
  },
];

export const ImageToVideoGenerator: React.FC<ImageToVideoGeneratorProps> = ({
  isOpen,
  onClose,
  currentRecord,
  onAttachVideoToRecord,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(CLINICAL_SAMPLES[0].dataUrl);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [prompt, setPrompt] = useState<string>(CLINICAL_SAMPLES[0].prompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgressTime, setGenerationProgressTime] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [attachedToRecord, setAttachedToRecord] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Timer while generating
  useEffect(() => {
    if (isGenerating) {
      setGenerationProgressTime(0);
      timerRef.current = setInterval(() => {
        setGenerationProgressTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Convert SVG data URL to PNG base64 for API compatibility if needed
  const prepareImageForApi = async (dataUrl: string): Promise<string> => {
    if (dataUrl.startsWith('data:image/svg+xml')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          } else {
            resolve(dataUrl);
          }
        };
        img.src = dataUrl;
      });
    }
    return dataUrl;
  };

  // Trigger Veo Generation
  const handleGenerateVideo = async () => {
    if (!selectedImage || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setAttachedToRecord(false);

    try {
      const preparedImage = await prepareImageForApi(selectedImage);

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: preparedImage,
          mimeType: mimeType || 'image/jpeg',
          prompt: prompt.trim(),
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Veo video generation failed. Please try again.');
      }

      setGeneratedVideoUrl(data.videoUrl);
    } catch (err: any) {
      console.error('Veo video generation error:', err);
      setError(err.message || 'Failed to generate video with Veo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSample = (sample: typeof CLINICAL_SAMPLES[0]) => {
    setSelectedImage(sample.dataUrl);
    setPrompt(sample.prompt);
    setMimeType('image/png');
    setError(null);
  };

  const handleAttachToSoapNote = () => {
    if (!generatedVideoUrl) return;
    if (onAttachVideoToRecord) {
      onAttachVideoToRecord(generatedVideoUrl, prompt);
    }
    setAttachedToRecord(true);
    setTimeout(() => setAttachedToRecord(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Animate Images into Video
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  veo-3.1-fast-generate-preview
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate dynamic clinical motion videos from still photos, radiographs, or anatomical scans using Google Veo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Grid: Upload & Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Selector & Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileImage className="w-3.5 h-3.5 text-teal-400" />
                  Source Clinical Photo
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Local File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Image Preview / Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`group relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center p-3 ${
                  aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[380px] mx-auto'
                } ${
                  selectedImage
                    ? 'border-slate-700 bg-slate-950'
                    : 'border-slate-700 hover:border-teal-500 bg-slate-950/50'
                }`}
              >
                {selectedImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={selectedImage}
                      alt="Source input"
                      className="max-h-full max-w-full object-contain rounded-xl"
                    />
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-bold text-white backdrop-blur-xs">
                      <Upload className="w-4 h-4" />
                      <span>Click to Change Image</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400 group-hover:text-teal-400 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-300">
                      Upload photo, radiograph, or clinical pathology specimen
                    </p>
                    <p className="text-[11px] text-slate-500">Supports PNG, JPG, or WebP</p>
                  </div>
                )}
              </div>

              {/* Sample Quick Selectors */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Or Test With Clinical Presets:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {CLINICAL_SAMPLES.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        selectedImage === sample.dataUrl
                          ? 'border-teal-500 bg-teal-500/10 text-teal-200'
                          : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold truncate">{sample.label}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1">{sample.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Generation Configuration (5 cols) */}
            <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Aspect Ratio Selector (MUST BE 16:9 or 9:16) */}
                <div>
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-teal-400" />
                    Video Aspect Ratio (Veo)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('16:9')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        aspectRatio === '16:9'
                          ? 'border-teal-500 bg-teal-500/15 text-teal-300 shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="w-4 h-2.5 border border-current rounded-xs" />
                      <span>16:9 (Landscape)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAspectRatio('9:16')}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        aspectRatio === '9:16'
                          ? 'border-teal-500 bg-teal-500/15 text-teal-300 shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="w-2.5 h-4 border border-current rounded-xs" />
                      <span>9:16 (Portrait)</span>
                    </button>
                  </div>
                </div>

                {/* Animation Prompt */}
                <div>
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      Motion Prompt
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Veo 3.1 Guidance</span>
                  </label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how to animate this photo (e.g. cardiac wall contraction, joint flexion, fluid breathing)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>

                {/* Patient Context Tag */}
                {currentRecord && (
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Target Encounter:</span>
                    <span className="font-semibold text-slate-200">
                      {currentRecord.patientMeta?.nameOrId || 'Patient Intake'} ({currentRecord.chiefComplaint?.complaint})
                    </span>
                  </div>
                )}
              </div>

              {/* Generate Action Button */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={!selectedImage || isGenerating}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Synthesizing Video with Veo ({generationProgressTime}s)...</span>
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4 text-slate-950" />
                      <span>Generate Veo Video Animation</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-500">
                  Model: <span className="font-mono text-slate-400">veo-3.1-fast-generate-preview</span> • Aspect: {aspectRatio}
                </p>
              </div>
            </div>
          </div>

          {/* Progress / Status banner while generating */}
          {isGenerating && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/50 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                <Film className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs font-bold text-rose-200 mb-1">
                  <span>Veo 3.1 Video Generation In Progress</span>
                  <span className="font-mono">{generationProgressTime}s elapsed</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-rose-500 to-amber-400 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(95, (generationProgressTime / 60) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Synthesizing temporal consistency and photorealistic motion dynamics. Typical duration: 30–60 seconds.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Generation Notice</p>
                <p className="text-rose-300/90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Generated Video Output Section */}
          {generatedVideoUrl && (
            <div className="rounded-2xl border border-teal-500/40 bg-slate-950 p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Veo Animation Generated Successfully
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onAttachVideoToRecord && (
                    <button
                      type="button"
                      onClick={handleAttachToSoapNote}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                        attachedToRecord
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border-teal-500/40'
                      }`}
                    >
                      {attachedToRecord ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                      <span>{attachedToRecord ? 'Attached to SOAP Note!' : 'Attach to SOAP Note'}</span>
                    </button>
                  )}

                  <a
                    href={generatedVideoUrl}
                    download={`veo_animation_${Date.now()}.mp4`}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MP4</span>
                  </a>
                </div>
              </div>

              {/* Side-by-Side Comparison: Still Photo vs. Veo Animated Video */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Input Still Photo */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Source Photo:
                  </span>
                  <div
                    className={`rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex items-center justify-center ${
                      aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[340px] mx-auto'
                    }`}
                  >
                    {selectedImage && (
                      <img
                        src={selectedImage}
                        alt="Original still"
                        className="max-h-full max-w-full object-contain"
                      />
                    )}
                  </div>
                </div>

                {/* Right: Veo Animated Video Player */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block flex items-center gap-1">
                    <Film className="w-3 h-3" />
                    Veo Generated Video ({aspectRatio}):
                  </span>
                  <div
                    className={`rounded-xl border border-teal-500/40 bg-black overflow-hidden flex items-center justify-center ${
                      aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[340px] mx-auto'
                    }`}
                  >
                    <video
                      ref={videoRef}
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">
                  Motion Directive: <span className="text-slate-200 font-medium italic">"{prompt}"</span>
                </span>
                <span className="text-[10px] font-mono text-teal-400">veo-3.1-fast-generate-preview</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

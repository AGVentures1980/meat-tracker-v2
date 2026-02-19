import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ChevronRight, ChevronLeft, Award, BookOpen, BarChart2, Bell, FileText, Layers, Lock, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Image imports (generated training screenshots) ───────────────────────────
const IMG = {
    m1: '/training/module1_dashboard.png',
    m2: '/training/module2_alerts.png',
    m3: '/training/module3_data_entry.png',
    m4: '/training/module4_templates.png',
    m5: '/training/module5_cfo_report.png',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuizQuestion {
    q: string;
    options: string[];
    correct: number;
    explanation: string;
}

interface Slide {
    title: string;
    body: string[];
    highlight?: string;
}

interface Module {
    id: number;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    duration: string;
    img: string;
    slides: Slide[];
    quiz: QuizQuestion[];
}

// ─── Module Data ──────────────────────────────────────────────────────────────
const MODULES: Module[] = [
    {
        id: 1,
        icon: <BarChart2 className="w-5 h-5" />,
        title: 'The Dashboard',
        subtitle: 'Understanding your key metrics at a glance',
        duration: '5 min',
        img: IMG.m1,
        slides: [
            {
                title: 'Your 4 Core KPIs',
                body: [
                    '① LBS/GUEST — How many pounds of meat were served per person. Green means under target (good). Red means over target (investigate).',
                    '② COST/GUEST — The dollar cost of meat per guest. Target is set by your store template (e.g. $9.94).',
                    '③ VILLAIN ALERT — The percentage of high-cost proteins (Beef Ribs, Filet Mignon) in your mix. Keep below 5%.',
                    '④ GUESTS TODAY — Total guests served. This drives all other calculations.',
                ],
                highlight: 'Rule of thumb: if LBS/Guest is green and Cost/Guest is green, your store is performing well.',
            },
            {
                title: 'The Protein Bar Chart',
                body: [
                    'The bar chart shows consumption by protein category for the current period.',
                    'Taller bars on villain proteins (Beef Ribs, Filet Mignon) is a warning sign.',
                    'A healthy mix has Picanha and Fraldinha as dominant proteins.',
                    'Use this chart in your morning briefing with the kitchen team.',
                ],
                highlight: 'Pro tip: screenshot this chart on Fridays to compare week-over-week trends.',
            },
        ],
        quiz: [
            {
                q: 'What does a GREEN LBS/Guest card mean?',
                options: ['Use-Linked Enablement', 'Meat consumption per guest is under target (good)', 'Villain percentage is too high', 'Data not entered'],
                correct: 1,
                explanation: 'Green LBS/Guest means you\'re serving less meat per person than the target, reducing cost.',
            },
            {
                q: 'What represents a Villain Alert?',
                options: ['Customer complaints', 'Staff turnover', 'High % of expensive cuts (Ribs, Filet)', 'Inventory shortage'],
                correct: 2,
                explanation: 'Villain proteins are high-cost cuts. Exceeding ~5% triggers an alert.',
            },
            {
                q: 'Which proteins should dominate a healthy mix?',
                options: ['Beef Ribs & Filet', 'Picanha & Fraldinha', 'Lamb Chops', 'Chicken only'],
                correct: 1,
                explanation: 'Picanha and Fraldinha are core proteins — flavorful and cost-effective.',
            },
        ],
    },
    {
        id: 2,
        icon: <Bell className="w-5 h-5" />,
        title: 'Responding to Alerts',
        subtitle: 'How to act on "Nuclear" problems',
        duration: '6 min',
        img: IMG.m2,
        slides: [
            {
                title: 'What is a Nuclear Problem?',
                body: [
                    'Fires when a store is above target for multiple consecutive weeks.',
                    'Two main types: VILLAIN OVERUSE (expensive cuts) and COST OVERRUN (high cost/guest).',
                    'Shows severity badge (SEVERE / MODERATE) and recommended solution.',
                    'Visible to Directors and Admins in the Analyst Scan page.',
                ],
                highlight: 'Never dismiss a SEVERE alert without implementing the solution first.',
            },
            {
                title: 'How to Respond',
                body: [
                    'VILLAIN OVERUSE → Reduce Beef Ribs/Filet rotation. Increase Fraldinha/Chicken.',
                    'COST OVERRUN → Check weekly prices. Review protein mix. Apply lower-cost template.',
                    'Monitor for 2–3 days. Alert clears automatically when targets are met.',
                    'If alert persists > 1 week → escalate to Regional Director.',
                ],
                highlight: 'The system gives you the solution — execute it with the kitchen team.',
            },
        ],
        quiz: [
            {
                q: 'When does a "Nuclear Problem" fire?',
                options: ['Single bad day', 'Guest complaint', 'Multiple consecutive weeks above target', 'Inventory error'],
                correct: 2,
                explanation: 'Nuclear alerts indicate a persistent pattern requiring structured response.',
            },
            {
                q: 'Response to VILLAIN OVERUSE?',
                options: ['Order more Ribs', 'Reduce villain frequency, increase Fraldinha', 'Close store', 'Ignore'],
                correct: 1,
                explanation: 'Fix by adjusting rotation: less Ribs/Filet, more cost-effective proteins.',
            },
            {
                q: 'When to escalate to Director?',
                options: ['Immediately', 'After 1 month', 'If alert persists > 1 week after action', 'Never'],
                correct: 2,
                explanation: 'Give corrective action 1 week to work. If it fails, escalate.',
            },
        ],
    },
    {
        id: 3,
        icon: <FileText className="w-5 h-5" />,
        title: 'Weekly Data Entry',
        subtitle: 'Keeping the system accurate',
        duration: '4 min',
        img: IMG.m3,
        slides: [
            {
                title: 'The Weekly Report',
                body: [
                    '① GUESTS — Enter Lunch/Dinner guests separately for shift-aware calcs.',
                    'Total LBS Used calculated from inventory counts — enter actual weight used.',
                    'Verify week selector. Default is current week.',
                    'Save by Monday morning for Director\'s review.',
                ],
                highlight: 'Accurate guest counts are the foundation of every metric.',
            },
            {
                title: 'Weekly Prices',
                body: [
                    '② PRICES — Enter cost/lb every Monday. Prices fluctuate.',
                    'Stale prices = inaccurate cost calcs (system uses last week\'s).',
                    'Only update proteins that changed price.',
                    'Director sees "Data Quality Warning" if prices are old.',
                ],
                highlight: 'Monday routine: Enter last week\'s guests → Update this week\'s prices.',
            },
        ],
        quiz: [
            {
                q: 'Why enter Lunch & Dinner guests separately?',
                options: ['Record keeping', 'Different price points per shift', 'Compliance', 'Doesn\'t matter'],
                correct: 1,
                explanation: 'Lunch/Dinner have different prices. Shift-aware logic requires split counts.',
            },
            {
                q: 'Effect of not updating prices?',
                options: ['System shutdown', 'Prices fixed', 'Inaccurate cost calculations', 'Director notified immediately'],
                correct: 2,
                explanation: 'Stale prices lead to wrong cost/guest metrics. Update weekly.',
            },
            {
                q: 'Deadline for weekly report?',
                options: ['Friday', 'Monday Morning', 'End of month', 'Anytime'],
                correct: 1,
                explanation: 'Monday morning deadline ensures fresh data for weekly reviews.',
            },
        ],
    },
    {
        id: 4,
        icon: <Layers className="w-5 h-5" />,
        title: 'Applying Templates',
        subtitle: 'Configuring your store',
        duration: '5 min',
        img: IMG.m4,
        slides: [
            {
                title: 'What is a Template?',
                body: [
                    'Pre-configured set of targets: LBS/guest, cost/guest, protein mix.',
                    '6 System Templates: Rodízio Padrão, Volume Alto, Premium Mix, Evento Especial, etc.',
                    'Default set by Director. Request temp change for special events.',
                    'Applied in Settings → Company → Templates.',
                ],
                highlight: 'Templates are "modes" — switch based on the week\'s needs.',
            },
            {
                title: 'Template Use Cases',
                body: [
                    'RODÍZIO PADRÃO — Everyday standard.',
                    'VOLUME ALTO — High traffic (Holidays). Higher LBS target.',
                    'PREMIUM MIX — Includes Lamb Chops. Higher cost target.',
                    'EVENTO ESPECIAL — Valentine\'s/NYE. Highest cost tolerance.',
                ],
                highlight: 'Always revert to Rodízio Padrão after special events.',
            },
        ],
        quiz: [
            {
                q: 'Template for Valentine\'s Day?',
                options: ['Rodízio Padrão', 'Volume Alto', 'Evento Especial', 'Branco'],
                correct: 2,
                explanation: 'Evento Especial is for premium occasions with high cost tolerance.',
            },
            {
                q: 'After special event ends?',
                options: ['Keep premium active', 'Revert to Rodízio Padrão', 'Apply Volume Alto', 'Delete template'],
                correct: 1,
                explanation: 'Leaving premium templates active masks real cost problems on normal weeks.',
            },
            {
                q: 'Who creates custom templates?',
                options: ['GMs', 'Kitchen', 'Directors/Admins', 'Anyone'],
                correct: 2,
                explanation: 'Restricted to Directors/Admins to maintain consistency.',
            },
        ],
    },
    {
        id: 5,
        icon: <BookOpen className="w-5 h-5" />,
        title: 'The CFO Report',
        subtitle: 'The executive summary',
        duration: '4 min',
        img: IMG.m5,
        slides: [
            {
                title: 'What the Report Shows',
                body: [
                    'Monthly executive summary of all store data.',
                    'Network KPIs: Net Impact, Savings, Current Loss, Variance.',
                    'Top 5 (Benchmarks) and Bottom 5 (Opportunities) stores.',
                    'Seen by CFO and Board.',
                ],
                highlight: 'Your store\'s data feeds directly into this report.',
            },
            {
                title: 'The Action Plan',
                body: [
                    'Auto-generated based on bottom stores/nuclear problems.',
                    'Specific recommendations for each issue.',
                    'Directors use this in monthly reviews with GMs.',
                    'Printable to PDF.',
                ],
                highlight: 'If in Bottom 5, expect a call from your Director.',
            },
        ],
        quiz: [
            {
                q: 'Who accesses the CFO Report?',
                options: ['All GMs', 'Kitchen', 'Admins/Directors', 'Everyone'],
                correct: 2,
                explanation: 'Contains sensitive financial data. Restricted to Admin/Director.',
            },
            {
                q: 'What is "Net Impact"?',
                options: ['Revenue', 'Savings minus Losses', 'Guest count', 'Avg LBS'],
                correct: 1,
                explanation: 'Net Impact = Total Savings - Total Losses vs targets.',
            },
            {
                q: 'How to save as PDF?',
                options: ['Export CSV', 'Email', 'Print / Save PDF button', 'Auto-email'],
                correct: 2,
                explanation: 'Use the print button and select "Save as PDF".',
            },
        ],
    },
];

// ─── Quiz Component ───────────────────────────────────────────────────────────
const Quiz = ({ questions, onComplete }: { questions: QuizQuestion[]; onComplete: (score: number) => void }) => {
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answers, setAnswers] = useState<boolean[]>([]);
    const [showExplanation, setShowExplanation] = useState(false);

    const q = questions[current];
    const isLast = current === questions.length - 1;

    const handleSelect = (idx: number) => {
        if (selected !== null) return;
        setSelected(idx);
        setShowExplanation(true);
    };

    const handleNext = () => {
        const newAnswers = [...answers, selected === q.correct];
        if (isLast) {
            onComplete(newAnswers.filter(Boolean).length);
        } else {
            setAnswers(newAnswers);
            setCurrent(c => c + 1);
            setSelected(null);
            setShowExplanation(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Question {current + 1} of {questions.length}</span>
                <div className="flex gap-1">
                    {questions.map((_, i) => (
                        <div key={i} className={`w-6 h-1 rounded-full ${i < current ? 'bg-[#C5A059]' : i === current ? 'bg-white' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>

            <p className="text-white font-bold text-base leading-snug">{q.q}</p>

            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border border-white/10 bg-white/5 text-gray-300 hover:border-white/30 cursor-pointer';
                    if (selected !== null) {
                        if (i === q.correct) cls = 'border border-green-500 bg-green-500/10 text-green-300';
                        else if (i === selected && i !== q.correct) cls = 'border border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border border-white/5 bg-white/2 text-gray-600 cursor-default';
                    }
                    return (
                        <button key={i} onClick={() => handleSelect(i)} className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${cls}`}>
                            <span className="font-mono text-[10px] mr-3 opacity-60">{String.fromCharCode(65 + i)}</span>
                            {opt}
                        </button>
                    );
                })}
            </div>

            {showExplanation && (
                <div className={`p-3 rounded-lg text-xs leading-relaxed border ${selected === q.correct ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                    <span className="font-bold">{selected === q.correct ? '✓ Correct! ' : '✗ Not quite. '}</span>
                    {q.explanation}
                </div>
            )}

            {selected !== null && (
                <button onClick={handleNext} className="w-full py-3 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2">
                    {isLast ? 'See Results' : 'Next Question'} <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// ─── Certification Exam Component ─────────────────────────────────────────────
const CertificationExam = ({ onComplete }: { onComplete: (score: number) => void }) => {
    // Flatten all questions from all modules
    const allQuestions = MODULES.flatMap(m => m.quiz);
    // Shuffle and pick 10
    const [examQuestions] = useState(() => [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10));

    return (
        <div className="max-w-xl mx-auto">
            <div className="mb-8 text-center bg-[#C5A059]/10 border border-[#C5A059]/30 p-6 rounded-xl">
                <p className="text-[10px] text-[#C5A059] uppercase tracking-widest font-bold mb-2">Final Step</p>
                <h2 className="text-2xl font-black text-white mb-2">Certification Exam</h2>
                <p className="text-gray-300 text-sm">10 Questions · 80% to Pass · 2 Attempts Max</p>
            </div>
            <Quiz questions={examQuestions} onComplete={onComplete} />
        </div>
    );
};

// ─── Main Training Page ───────────────────────────────────────────────────────
export const TrainingPage = () => {
    const { user } = useAuth();
    const [activeModule, setActiveModule] = useState<number | null>(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const [phase, setPhase] = useState<'slides' | 'quiz' | 'result' | 'exam' | 'exam_result' | 'resources'>('slides');
    const [quizScore, setQuizScore] = useState(0);
    const [completed, setCompleted] = useState<Record<string, number>>({}); // moduleId (string) → score
    const [examAttempts, setExamAttempts] = useState(0);
    const [locked, setLocked] = useState(false);
    const [isCertified, setIsCertified] = useState(false);
    const certRef = useRef<HTMLDivElement>(null);

    // Fetch Status
    const fetchStatus = async () => {
        try {
            const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/training/status`, {
                headers: { 'Authorization': `Bearer ${user?.token}` }
            });
            const data = await res.json();
            if (data.success) {
                const comp: Record<string, number> = {};
                data.progress.forEach((p: any) => comp[p.module_id] = p.score);
                setCompleted(comp);
                setExamAttempts(data.examAttempts || 0);
                setIsCertified(data.isCertified);
                if (data.examAttempts >= 2 && !data.isCertified) setLocked(true);
            }
        } catch (err) { console.error('Failed to fetch training status', err); }
    };

    useEffect(() => { if (user?.token) fetchStatus(); }, [user?.token]);

    // Save Progress
    const saveProgress = async (moduleId: string, score: number) => {
        try {
            await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/training/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                body: JSON.stringify({ moduleId, score })
            });
            fetchStatus();
        } catch (err) { console.error('Failed to save progress', err); }
    };

    // Submit Exam
    const submitExam = async (score: number) => {
        // Score is number of correct answers (0-10). Convert to percentage (0-100)
        const pct = (score / 10) * 100;
        try {
            const res = await fetch(`${(import.meta as any).env?.VITE_API_URL || ''}/api/v1/dashboard/training/exam-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                body: JSON.stringify({ score: pct })
            });
            const data = await res.json();
            if (data.success) {
                setQuizScore(score); // Raw score for display
                setExamAttempts(data.attempts);
                setIsCertified(data.passed);
                setLocked(data.locked);
                setPhase('exam_result');
            }
        } catch (err) { console.error('Failed to submit exam', err); }
    };

    const mod = activeModule !== null ? MODULES[activeModule] : null;

    const openModule = (idx: number) => { setActiveModule(idx); setSlideIndex(0); setPhase('slides'); };
    const closeModule = () => { setActiveModule(null); setSlideIndex(0); setPhase('slides'); };

    const handleQuizComplete = (score: number) => {
        setQuizScore(score);
        setPhase('result');
        if (mod) saveProgress(String(mod.id), score);
    };

    const generateCertificate = async () => {
        if (!certRef.current) return;
        try {
            const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: '#111' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`Brasa_Certificate_${user?.name?.replace(/ /g, '_') || 'User'}.pdf`);
        } catch (err) { console.error('Cert Gen Failed', err); }
    };

    // Derived State
    const allModulesDone = MODULES.every(m => completed[String(m.id)] !== undefined);

    // ─── VIEW: LOCKED ─────────────────────────────────────────────────────────────
    if (locked) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
                <div className="max-w-md text-center space-y-6 p-8 bg-red-900/10 border border-red-500/30 rounded-2xl">
                    <Lock className="w-16 h-16 text-red-500 mx-auto" />
                    <h1 className="text-3xl font-black text-white">Account Locked</h1>
                    <p className="text-gray-400">
                        You have failed the certification exam 2 times. Your access to advanced features has been restricted.
                    </p>
                    <div className="bg-black/30 p-4 rounded-lg text-sm text-gray-300">
                        Please contact your Regional Director to request an exam reset and additional coaching.
                    </div>
                </div>
            </div>
        );
    }

    // ─── VIEW: RESOURCES (ADMIN ONLY) ─────────────────────────────────────────────
    if (phase === 'resources') {
        if (user?.role !== 'admin') {
            return (
                <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
                    <div className="max-w-md text-center space-y-6 p-8 bg-red-900/10 border border-red-500/30 rounded-2xl">
                        <Lock className="w-16 h-16 text-red-500 mx-auto" />
                        <h1 className="text-3xl font-black text-white">Access Restricted</h1>
                        <p className="text-gray-400">
                            Training Documentation is classified for Master/Admin users only.
                        </p>
                        <button onClick={() => setPhase('slides')} className="mx-auto flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
                            <ChevronLeft className="w-4 h-4" /> Back to Training Center
                        </button>
                    </div>
                </div>
            );
        }

        const RESOURCES = [
            { title: 'SLA Agreement', file: '/resources/sla-agreement.html', desc: 'System availability & support tiers' },
            { title: 'Onboarding SOP', file: '/resources/onboarding-sop.html', desc: 'Standard Operating Procedures' },
            { title: 'Operational Manual', file: '/resources/operational-manual.html', desc: 'Daily/Weekly routines & troubleshooting' },
            { title: 'Store Ready Checklist', file: '/resources/store-ready-checklist.html', desc: 'Pre-launch validation guide' },
            { title: 'Rollout Plan', file: '/resources/rollout-plan.html', desc: 'Implementation strategy & timeline' },
        ];

        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => setPhase('slides')} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
                        <ChevronLeft className="w-4 h-4" /> Back to Training Center
                    </button>

                    <h1 className="text-3xl font-black uppercase mb-2">Training Resources</h1>
                    <p className="text-gray-400 mb-8">Official documentation and guides for Brasa Meat Intelligence. (Master Access)</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {RESOURCES.map((res, i) => (
                            <a
                                key={i}
                                href={res.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#111] border border-white/10 rounded-xl p-5 hover:bg-[#161616] hover:border-[#C5A059]/40 transition-all group flex items-start gap-4"
                            >
                                <div className="p-3 bg-white/5 rounded-lg group-hover:bg-[#C5A059]/10 transition-colors">
                                    <FileText className="w-6 h-6 text-[#C5A059]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white group-hover:text-[#C5A059] transition-colors">{res.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{res.desc}</p>
                                    <span className="text-[10px] text-[#C5A059] uppercase tracking-widest mt-3 block font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                                        Download <Download className="w-3 h-3" />
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── VIEW: MODULE LIST ────────────────────────────────────────────────────────
    if (activeModule === null && phase !== 'exam' && phase !== 'exam_result') {
        const totalCompleted = MODULES.filter(m => completed[String(m.id)]).length;

        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-10">
                        <p className="text-[10px] text-[#C5A059] uppercase tracking-[4px] font-bold mb-2">Brasa Prophet Analytics</p>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Training Center</h1>
                        <p className="text-gray-500 mt-2 text-sm">Complete all 5 modules to unlock the Certification Exam.</p>

                        <div className="flex gap-4 mt-4">
                            {user?.role === 'admin' && (
                                <button onClick={() => setPhase('resources')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all">
                                    <FileText className="w-4 h-4 text-[#C5A059]" /> View Documentation
                                </button>
                            )}
                        </div>

                        <div className="mt-6 flex items-center gap-4">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-[#C5A059] rounded-full transition-all duration-700" style={{ width: `${(totalCompleted / MODULES.length) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-[#C5A059] font-mono">{totalCompleted}/{MODULES.length}</span>
                        </div>

                        {allModulesDone && !isCertified && (
                            <div className="mt-8 p-6 bg-gradient-to-r from-[#C5A059]/10 to-transparent border border-[#C5A059]/30 rounded-xl flex items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Ready for Certification?</h3>
                                    <p className="text-sm text-gray-400">Pass the 10-question exam (80%+) to become a Certified Operator.</p>
                                    <p className="text-xs text-[#C5A059] mt-2 font-mono uppercase tracking-wider">Attempts Remaining: {2 - examAttempts}</p>
                                </div>
                                <button onClick={() => setPhase('exam')} className="px-6 py-3 bg-[#C5A059] hover:bg-[#d4b06a] text-black font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-[#C5A059]/20 transition-all transform hover:scale-105">
                                    Start Exam
                                </button>
                            </div>
                        )}

                        {isCertified && (
                            <div className="mt-8 p-6 bg-green-900/10 border border-green-500/30 rounded-xl flex items-center gap-6">
                                <Award className="w-12 h-12 text-green-500" />
                                <div>
                                    <h3 className="text-xl font-bold text-white">Certified Operator</h3>
                                    <p className="text-sm text-gray-400">You are fully certified. All system features are unlocked.</p>
                                    <button onClick={() => setPhase('exam_result')} className="mt-2 text-green-400 text-xs font-bold uppercase tracking-widest hover:underline flex items-center gap-1">
                                        View Certificate <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {MODULES.map((m, idx) => {
                            const score = completed[String(m.id)];
                            const isDone = score !== undefined;
                            const pct = isDone ? Math.round((score / m.quiz.length) * 100) : null;
                            return (
                                <button key={m.id} onClick={() => openModule(idx)} className="w-full text-left bg-[#111] border border-white/10 rounded-xl p-5 hover:border-[#C5A059]/40 hover:bg-[#161616] transition-all group flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-[#C5A059]' : 'bg-white/5 group-hover:bg-[#C5A059]/10'}`}>
                                        {isDone ? <CheckCircle className="w-6 h-6 text-black" /> : <span className={isDone ? 'text-black' : 'text-[#C5A059]'}>{m.icon}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">Module {m.id}</span>
                                            <span className="text-[9px] text-gray-700">·</span>
                                            <span className="text-[9px] text-gray-600 uppercase tracking-widest">{m.duration}</span>
                                        </div>
                                        <h3 className="text-white font-bold text-sm">{m.title}</h3>
                                        <p className="text-gray-500 text-xs mt-0.5">{m.subtitle}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {isDone && (
                                            <div className="text-right">
                                                <p className={`text-sm font-bold font-mono ${pct! >= 67 ? 'text-green-400' : 'text-red-400'}`}>{pct}%</p>
                                                <p className="text-[9px] text-gray-600 uppercase tracking-widest">{score}/{m.quiz.length} correct</p>
                                            </div>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#C5A059] transition-colors" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ─── VIEW: EXAM ───────────────────────────────────────────────────────────────
    if (phase === 'exam') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
                <div className="max-w-xl mx-auto">
                    <button onClick={() => setPhase('slides')} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
                        <ChevronLeft className="w-4 h-4" /> Cancel Exam
                    </button>
                    <CertificationExam onComplete={submitExam} />
                </div>
            </div>
        );
    }

    // ─── VIEW: EXAM RESULT (CERTIFICATE) ──────────────────────────────────────────
    if (phase === 'exam_result') {
        const passed = isCertified;
        const pct = Math.round((quizScore / 10) * 100);

        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-6 flex flex-col items-center justify-center">
                <div className="max-w-2xl w-full text-center space-y-8">
                    {passed ? (
                        <>
                            <div className="space-y-4">
                                <Award className="w-20 h-20 text-[#C5A059] mx-auto" />
                                <h1 className="text-4xl font-black uppercase text-white">Congratulations!</h1>
                                <p className="text-gray-400 text-lg">You passed the exam with {pct}%.</p>
                                <button onClick={generateCertificate} className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-black font-bold uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all">
                                    <Download className="w-4 h-4" /> Download Certificate
                                </button>
                                <button onClick={() => setPhase('slides')} className="block mx-auto text-gray-500 hover:text-white text-sm mt-4">Return to Training Center</button>
                            </div>

                            {/* Hidden Certificate Application for Capture */}
                            <div className="flex justify-center mt-8">
                                <div ref={certRef} className="w-[800px] h-[500px] bg-[#111] border-4 border-[#C5A059] p-10 relative flex flex-col items-center justify-center text-center shadow-2xl">
                                    <div className="absolute top-4 left-4 text-[#C5A059] opacity-20"><BarChart2 className="w-16 h-16" /></div>
                                    <div className="absolute bottom-4 right-4 text-[#C5A059] opacity-20"><Award className="w-16 h-16" /></div>

                                    <h1 className="text-5xl font-serif text-[#C5A059] uppercase tracking-widest mb-4">Brasa</h1>
                                    <p className="text-white font-mono text-sm uppercase tracking-[0.3em] mb-12">Meat Intelligence System</p>

                                    <h2 className="text-4xl font-bold text-white mb-6">Certificate of Competence</h2>
                                    <p className="text-gray-400 text-lg mb-2">This certifies that</p>
                                    <p className="text-3xl text-[#C5A059] font-bold border-b border-[#333] pb-2 px-8 mb-8">{user?.name || user?.email}</p>
                                    <p className="text-gray-400 text-lg mb-8">Has successfully completed the Prophet Analytics Operator Training</p>

                                    <div className="flex gap-16 mt-8">
                                        <div className="text-center">
                                            <p className="text-white font-bold">{new Date().toLocaleDateString()}</p>
                                            <div className="w-32 h-px bg-[#333] mt-1"></div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Date</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-bold">System Admin</p>
                                            <div className="w-32 h-px bg-[#333] mt-1"></div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Authorized By</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <AlertTriangle className="w-20 h-20 text-red-500 mx-auto" />
                            <h1 className="text-4xl font-black uppercase text-white">Exam Failed</h1>
                            <p className="text-gray-400 text-lg">You scored {pct}%. You need 80% to pass.</p>
                            <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-lg inline-block text-red-400">
                                Attempts Remaining: {2 - examAttempts}
                            </div>
                            <div className="flex gap-4 justify-center">
                                <button onClick={() => setPhase('slides')} className="px-6 py-3 border border-white/10 hover:bg-white/5 text-white font-bold uppercase tracking-widest rounded-lg transition-all">
                                    Review Material
                                </button>
                                {examAttempts < 2 ? (
                                    <button onClick={() => setPhase('exam')} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest rounded-lg transition-all">
                                        Retry Exam
                                    </button>
                                ) : (
                                    <div className="text-red-500 font-bold block mt-4">Locked - Contact Admin</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── VIEW: MODULE DETAIL ──────────────────────────────────────────────────────
    // (Same as before but uses API to save progress)
    const slide = mod!.slides[slideIndex];
    const isLastSlide = slideIndex === mod!.slides.length - 1;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <button onClick={closeModule} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
                    <ChevronLeft className="w-4 h-4" /> Back to Modules
                </button>
                <div className="text-center">
                    <p className="text-[9px] text-gray-600 uppercase tracking-widest">Module {mod!.id} of {MODULES.length}</p>
                    <p className="text-white font-bold text-sm">{mod!.title}</p>
                </div>
                <div className="flex gap-1">
                    {MODULES.map((_, i) => (
                        <div key={i} className={`w-8 h-1 rounded-full ${i < activeModule! ? 'bg-[#C5A059]' : i === activeModule! ? 'bg-white' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6 md:p-10">
                {phase === 'slides' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="relative">
                            <img src={mod!.img} alt={`Module ${mod!.id} screenshot`} className="w-full rounded-xl border border-white/10 shadow-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-2 py-1">
                                <p className="text-[9px] text-[#C5A059] uppercase tracking-widest font-bold">Live Screenshot</p>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">Slide {slideIndex + 1} of {mod!.slides.length}</p>
                                <h2 className="text-2xl font-black">{slide.title}</h2>
                            </div>
                            <div className="space-y-3">
                                {slide.body.map((line, i) => (
                                    <div key={i} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                                        <span className="text-[#C5A059] font-bold flex-shrink-0 font-mono text-xs mt-0.5">{line.startsWith('①') || line.startsWith('②') || line.startsWith('③') || line.startsWith('④') ? '' : '→'}</span>
                                        <span>{line}</span>
                                    </div>
                                ))}
                            </div>
                            {slide.highlight && (
                                <div className="bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl p-4">
                                    <p className="text-[9px] text-[#C5A059] uppercase tracking-widest font-bold mb-1">Key Takeaway</p>
                                    <p className="text-[#C5A059] text-sm font-medium leading-relaxed">{slide.highlight}</p>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                {slideIndex > 0 && (
                                    <button onClick={() => setSlideIndex(s => s - 1)} className="px-4 py-2.5 border border-white/10 text-gray-400 text-sm rounded-lg hover:border-white/30 hover:text-white transition-all flex items-center gap-2">
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>
                                )}
                                <button onClick={() => { if (isLastSlide) setPhase('quiz'); else setSlideIndex(s => s + 1); }} className="flex-1 py-2.5 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2">
                                    {isLastSlide ? 'Take the Quiz' : 'Next Slide'} <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {phase === 'quiz' && (
                    <div className="max-w-xl mx-auto">
                        <div className="mb-8 text-center">
                            <p className="text-[9px] text-[#C5A059] uppercase tracking-widest font-bold mb-2">Module {mod!.id} Quiz</p>
                            <h2 className="text-2xl font-black">Test Your Knowledge</h2>
                        </div>
                        <Quiz questions={mod!.quiz} onComplete={handleQuizComplete} />
                    </div>
                )}

                {phase === 'result' && (
                    <div className="max-w-md mx-auto text-center space-y-6">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl font-black border-4 ${quizScore === mod!.quiz.length ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : quizScore >= Math.ceil(mod!.quiz.length * 0.67) ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-red-500 bg-red-500/10 text-red-400'}`}>{Math.round((quizScore / mod!.quiz.length) * 100)}%</div>
                        <div>
                            <h2 className="text-2xl font-black">{quizScore >= Math.ceil(mod!.quiz.length * 0.67) ? 'Module Passed!' : 'Keep Practicing'}</h2>
                            <p className="text-gray-500 text-sm mt-1">You got {quizScore} out of {mod!.quiz.length} questions correct.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setPhase('slides'); setSlideIndex(0); }} className="flex-1 py-3 border border-white/10 text-gray-400 text-sm rounded-lg hover:border-white/30 hover:text-white transition-all">Review Slides</button>
                            {activeModule! < MODULES.length - 1 ? (
                                <button onClick={() => openModule(activeModule! + 1)} className="flex-1 py-3 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2">Next Module <ChevronRight className="w-4 h-4" /></button>
                            ) : (
                                <button onClick={closeModule} className="flex-1 py-3 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2"><Award className="w-4 h-4" /> Complete</button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

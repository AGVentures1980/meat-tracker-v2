import { useState } from 'react';
import { CheckCircle, ChevronRight, ChevronLeft, Award, BookOpen, BarChart2, Bell, FileText, Layers } from 'lucide-react';

// ─── Image imports (generated training screenshots) ───────────────────────────
// We reference them as public URLs since they live in the artifacts dir.
// In production, copy these to /public/training/ and update paths.
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
                    '① LBS/GUEST — How many pounds of meat were served per person. Green means you\'re under target (good). Red means over target (investigate).',
                    '② COST/GUEST — The dollar cost of meat per guest. Your target is set by your store template (typically $9.94 for Rodízio Padrão).',
                    '③ VILLAIN ALERT — The percentage of high-cost proteins (Beef Ribs, Filet Mignon) in your mix. Keep this below 5%.',
                    '④ GUESTS TODAY — Total guests served. This drives all other calculations.',
                ],
                highlight: 'Rule of thumb: if LBS/Guest is green and Cost/Guest is green, your store is performing well.',
            },
            {
                title: 'The Protein Bar Chart',
                body: [
                    'The bar chart shows consumption by protein category for the current period.',
                    'Taller bars on villain proteins (Beef Ribs, Filet Mignon) relative to others is a warning sign.',
                    'A healthy mix has Picanha and Fraldinha as the dominant proteins, with villains as a small fraction.',
                    'Use this chart in your morning briefing with the kitchen team.',
                ],
                highlight: 'Pro tip: screenshot this chart on Fridays to compare week-over-week trends.',
            },
        ],
        quiz: [
            {
                q: 'What does a GREEN LBS/Guest card mean?',
                options: [
                    'The store is losing money',
                    'Meat consumption per guest is under the target — this is good',
                    'The villain percentage is too high',
                    'Data has not been entered yet',
                ],
                correct: 1,
                explanation: 'Green LBS/Guest means you\'re serving less meat per person than the target, which reduces cost. This is the desired state.',
            },
            {
                q: 'What is the "Villain Alert" tracking?',
                options: [
                    'Employee performance issues',
                    'Customer complaints',
                    'The percentage of high-cost proteins (Beef Ribs, Filet Mignon) in the mix',
                    'Inventory shortages',
                ],
                correct: 2,
                explanation: 'Villain proteins are high-cost cuts. When they exceed ~5% of the total mix, costs spike. The Villain Alert keeps this in check.',
            },
            {
                q: 'Which proteins should dominate a healthy mix?',
                options: [
                    'Beef Ribs and Filet Mignon',
                    'Picanha and Fraldinha',
                    'Lamb Chops and Filet Mignon',
                    'Chicken and Pork only',
                ],
                correct: 1,
                explanation: 'Picanha and Fraldinha are the core proteins — flavorful, guest-favorite, and cost-effective. Villains should be a small fraction.',
            },
        ],
    },
    {
        id: 2,
        icon: <Bell className="w-5 h-5" />,
        title: 'Responding to Alerts',
        subtitle: 'How to read and act on nuclear problems',
        duration: '6 min',
        img: IMG.m2,
        slides: [
            {
                title: 'What is a Nuclear Problem?',
                body: [
                    'A "Nuclear Problem" fires when a store has been above target for multiple consecutive weeks — it\'s not a one-time blip, it\'s a pattern.',
                    'The system identifies two main nuclear types: VILLAIN OVERUSE (too many expensive cuts) and COST OVERRUN (overall cost per guest too high).',
                    'Each alert shows: which stores are affected, the severity badge (SEVERE / MODERATE), and a recommended solution.',
                    'Nuclear alerts are visible to Directors and Admins in the Analyst Scan page.',
                ],
                highlight: 'Never dismiss a SEVERE alert without implementing the solution first.',
            },
            {
                title: 'How to Respond',
                body: [
                    'VILLAIN OVERUSE → Talk to the kitchen team. Reduce how often Beef Ribs and Filet Mignon are offered in the rotation. Increase Fraldinha and Chicken frequency.',
                    'COST OVERRUN → Check if weekly prices are up to date. Review the protein mix. Consider applying a lower-cost template temporarily.',
                    'After taking action, monitor the dashboard for 2–3 days. The alert will clear automatically when the store returns to target.',
                    'If the alert persists after 1 week of action → escalate to Regional Director.',
                ],
                highlight: 'The system gives you the solution — your job is to execute it with the kitchen team.',
            },
        ],
        quiz: [
            {
                q: 'When does a "Nuclear Problem" alert fire?',
                options: [
                    'After a single bad day',
                    'When a guest complains',
                    'After multiple consecutive weeks above target',
                    'When inventory runs out',
                ],
                correct: 2,
                explanation: 'Nuclear alerts indicate a persistent pattern, not a one-time event. They require a structured response, not just a quick fix.',
            },
            {
                q: 'What is the correct response to a VILLAIN OVERUSE alert?',
                options: [
                    'Order more Beef Ribs to meet demand',
                    'Reduce villain protein frequency in the rotation and increase Fraldinha/Chicken',
                    'Close the restaurant for a day',
                    'Ignore it — it will resolve itself',
                ],
                correct: 1,
                explanation: 'Villain overuse is fixed by adjusting the rotation — less Beef Ribs and Filet Mignon, more cost-effective proteins like Fraldinha and Chicken.',
            },
            {
                q: 'How long should you wait before escalating a persistent alert to the Director?',
                options: [
                    'Same day',
                    '1 month',
                    '1 week after taking corrective action',
                    'Never — GMs handle all alerts independently',
                ],
                correct: 2,
                explanation: 'Give your corrective action 1 week to show results. If the alert persists after that, escalate to the Regional Director.',
            },
        ],
    },
    {
        id: 3,
        icon: <FileText className="w-5 h-5" />,
        title: 'Weekly Data Entry',
        subtitle: 'Keeping the system accurate and up to date',
        duration: '4 min',
        img: IMG.m3,
        slides: [
            {
                title: 'The Weekly Report',
                body: [
                    '① GUESTS — Enter Lunch Guests and Dinner Guests separately. This is critical for shift-aware cost calculations.',
                    'Total LBS Used is calculated from your inventory counts — enter the actual weight used, not an estimate.',
                    'The week selector defaults to the current week. Always verify you\'re entering data for the correct week.',
                    'Save the report by Monday morning so the Director\'s weekly review has fresh data.',
                ],
                highlight: 'Accurate guest counts are the foundation of every metric in the system.',
            },
            {
                title: 'Weekly Prices',
                body: [
                    '② PRICES — Enter the cost per pound for each protein every Monday. Prices fluctuate weekly with market conditions.',
                    'If you don\'t update prices, the system will use last week\'s prices — this can cause inaccurate cost calculations.',
                    'You only need to update proteins that changed in price. Stable proteins can be left as-is.',
                    'Your Regional Director can see if prices haven\'t been updated — it shows as a data quality warning.',
                ],
                highlight: 'Monday morning routine: enter last week\'s guests → update this week\'s prices → done.',
            },
        ],
        quiz: [
            {
                q: 'Why do you enter Lunch and Dinner guests separately?',
                options: [
                    'It\'s just for record-keeping',
                    'Because lunch and dinner have different prices, so the system calculates costs per shift',
                    'The system requires it for legal compliance',
                    'It doesn\'t matter — total guests is enough',
                ],
                correct: 1,
                explanation: 'Lunch and dinner have different price points. The system uses shift-aware calculations to accurately determine cost per guest for each period.',
            },
            {
                q: 'What happens if you don\'t update weekly prices?',
                options: [
                    'The system shuts down',
                    'Nothing — prices are fixed',
                    'The system uses last week\'s prices, which may cause inaccurate cost calculations',
                    'The Director is automatically notified',
                ],
                correct: 2,
                explanation: 'Stale prices lead to inaccurate cost/guest calculations. Always update prices on Monday to keep the system accurate.',
            },
            {
                q: 'By when should the weekly report be submitted?',
                options: [
                    'Friday evening',
                    'Monday morning',
                    'The last day of the month',
                    'Whenever you have time',
                ],
                correct: 1,
                explanation: 'Monday morning is the deadline so the Director\'s weekly review has fresh data from all stores.',
            },
        ],
    },
    {
        id: 4,
        icon: <Layers className="w-5 h-5" />,
        title: 'Applying Templates',
        subtitle: 'Configuring your store for any occasion',
        duration: '5 min',
        img: IMG.m4,
        slides: [
            {
                title: 'What is a Template?',
                body: [
                    'A template is a pre-configured set of operational parameters: LBS/guest target, cost/guest target, protein mix percentages, and pricing.',
                    'There are 6 system templates: Branco (blank), Rodízio Padrão, Volume Alto, Ribs-Heavy, Premium Mix, and Evento Especial.',
                    'Your store has a default template set by your Regional Director. You can request a temporary change for special events.',
                    'Templates are applied in Settings → Company → Templates → Apply to Store.',
                ],
                highlight: 'Think of templates as "modes" — you switch modes based on what kind of week you\'re having.',
            },
            {
                title: 'When to Use Each Template',
                body: [
                    'RODÍZIO PADRÃO — Your everyday template. Standard targets, balanced mix.',
                    'VOLUME ALTO — High-traffic weeks (Super Bowl, holidays). Higher LBS target, more forgiving cost threshold.',
                    'PREMIUM MIX — When Lamb Chops are included in the rodízio. Higher cost targets reflect the premium offering.',
                    'EVENTO ESPECIAL — Valentine\'s Day, New Year\'s Eve, private events. Highest cost tolerance, premium mix with Lamb Chops.',
                ],
                highlight: 'Always revert to Rodízio Padrão after the special event ends. Don\'t leave a premium template active on a normal week.',
            },
        ],
        quiz: [
            {
                q: 'Which template should you use for Valentine\'s Day dinner service?',
                options: [
                    'Rodízio Padrão',
                    'Volume Alto',
                    'Evento Especial',
                    'Template em Branco',
                ],
                correct: 2,
                explanation: 'Evento Especial is designed for premium occasions like Valentine\'s Day — it includes Lamb Chops and has higher cost tolerances.',
            },
            {
                q: 'What should you do after a special event ends?',
                options: [
                    'Keep the premium template active — it\'s better',
                    'Revert to Rodízio Padrão',
                    'Apply the Volume Alto template',
                    'Delete the special template',
                ],
                correct: 1,
                explanation: 'Premium templates have higher cost tolerances. Leaving them active on normal weeks will mask real cost problems.',
            },
            {
                q: 'Who can create new custom templates?',
                options: [
                    'Any GM',
                    'Kitchen staff',
                    'Directors and Admins only',
                    'Anyone with a login',
                ],
                correct: 2,
                explanation: 'Template creation is restricted to Directors and Admins to maintain consistency and prevent unauthorized changes to operational targets.',
            },
        ],
    },
    {
        id: 5,
        icon: <BookOpen className="w-5 h-5" />,
        title: 'The CFO Report',
        subtitle: 'Understanding the executive monthly report',
        duration: '4 min',
        img: IMG.m5,
        slides: [
            {
                title: 'What the CFO Report Shows',
                body: [
                    'The CFO Report is a monthly executive summary generated automatically from all store data.',
                    'It shows 4 network-wide KPIs: Net Impact (total savings vs. losses), Estimated Savings, Current Loss, and Average Variance.',
                    'The Top 5 Stores table shows the most efficient stores — these are your benchmarks.',
                    'The Bottom 5 Stores table shows where the biggest opportunities for improvement are.',
                ],
                highlight: 'This report is what the CFO and Board see. Your store\'s data feeds directly into it.',
            },
            {
                title: 'The Action Plan',
                body: [
                    'Below the tables, the system auto-generates an Action Plan based on the bottom stores and nuclear problems.',
                    'Each action item names the store, the issue, and a specific recommendation.',
                    'Directors use this plan in their monthly review meetings with GMs.',
                    'To print or save as PDF: click the "Print / Save PDF" button in the top right → use your browser\'s print dialog.',
                ],
                highlight: 'If your store appears in the Bottom 5, expect a call from your Regional Director that week.',
            },
        ],
        quiz: [
            {
                q: 'Who has access to the CFO Report?',
                options: [
                    'All GMs',
                    'Kitchen staff',
                    'Admins and Directors only',
                    'Everyone with a login',
                ],
                correct: 2,
                explanation: 'The CFO Report contains sensitive network-wide financial data. Access is restricted to Admin and Director roles.',
            },
            {
                q: 'What does "Net Impact" represent in the CFO Report?',
                options: [
                    'Total revenue from all stores',
                    'The difference between total savings and total losses across the network',
                    'Number of guests served this month',
                    'Average LBS/guest across all stores',
                ],
                correct: 1,
                explanation: 'Net Impact = Savings - Losses. A positive number means the network is saving money overall vs. targets.',
            },
            {
                q: 'How do you save the CFO Report as a PDF?',
                options: [
                    'Export → CSV',
                    'Email it to yourself',
                    'Click "Print / Save PDF" → use browser print dialog → Save as PDF',
                    'It auto-emails to the CFO every month',
                ],
                correct: 2,
                explanation: 'The report is designed for browser printing. Use Cmd+P (Mac) or Ctrl+P (Windows) and select "Save as PDF" as the destination.',
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
                        <button
                            key={i}
                            onClick={() => handleSelect(i)}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${cls}`}
                        >
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
                <button
                    onClick={handleNext}
                    className="w-full py-3 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2"
                >
                    {isLast ? 'See Results' : 'Next Question'} <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

// ─── Main Training Page ───────────────────────────────────────────────────────
export const TrainingPage = () => {
    const [activeModule, setActiveModule] = useState<number | null>(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const [phase, setPhase] = useState<'slides' | 'quiz' | 'result'>('slides');
    const [quizScore, setQuizScore] = useState(0);
    const [completed, setCompleted] = useState<Record<number, number>>({}); // moduleId → score

    const mod = activeModule !== null ? MODULES[activeModule] : null;

    const openModule = (idx: number) => {
        setActiveModule(idx);
        setSlideIndex(0);
        setPhase('slides');
    };

    const closeModule = () => {
        setActiveModule(null);
        setSlideIndex(0);
        setPhase('slides');
    };

    const handleQuizComplete = (score: number) => {
        setQuizScore(score);
        setPhase('result');
        if (mod) {
            setCompleted(prev => ({ ...prev, [mod.id]: score }));
        }
    };

    const totalCompleted = Object.keys(completed).length;
    const allDone = totalCompleted === MODULES.length;

    // ── Module List View ──────────────────────────────────────────────────────
    if (activeModule === null) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-10">
                        <p className="text-[10px] text-[#C5A059] uppercase tracking-[4px] font-bold mb-2">Brasa Prophet Analytics</p>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Training Center</h1>
                        <p className="text-gray-500 mt-2 text-sm">Complete all 5 modules to become certified in Brasa Prophet Analytics.</p>

                        {/* Progress bar */}
                        <div className="mt-6 flex items-center gap-4">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#C5A059] rounded-full transition-all duration-700"
                                    style={{ width: `${(totalCompleted / MODULES.length) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs font-bold text-[#C5A059] font-mono">{totalCompleted}/{MODULES.length}</span>
                        </div>

                        {allDone && (
                            <div className="mt-4 flex items-center gap-3 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-xl p-4">
                                <Award className="w-8 h-8 text-[#C5A059]" />
                                <div>
                                    <p className="text-[#C5A059] font-bold text-sm">Training Complete — Certified Operator</p>
                                    <p className="text-gray-500 text-xs">You have completed all 5 modules. Well done!</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Module Cards */}
                    <div className="space-y-3">
                        {MODULES.map((m, idx) => {
                            const score = completed[m.id];
                            const isDone = score !== undefined;
                            const pct = isDone ? Math.round((score / m.quiz.length) * 100) : null;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => openModule(idx)}
                                    className="w-full text-left bg-[#111] border border-white/10 rounded-xl p-5 hover:border-[#C5A059]/40 hover:bg-[#161616] transition-all group flex items-center gap-5"
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-[#C5A059]' : 'bg-white/5 group-hover:bg-[#C5A059]/10'}`}>
                                        {isDone
                                            ? <CheckCircle className="w-6 h-6 text-black" />
                                            : <span className={isDone ? 'text-black' : 'text-[#C5A059]'}>{m.icon}</span>
                                        }
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

    // ── Module Detail View ────────────────────────────────────────────────────
    const slide = mod!.slides[slideIndex];
    const isLastSlide = slideIndex === mod!.slides.length - 1;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Top bar */}
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
                        {/* Screenshot */}
                        <div className="relative">
                            <img
                                src={mod!.img}
                                alt={`Module ${mod!.id} screenshot`}
                                className="w-full rounded-xl border border-white/10 shadow-2xl"
                                onError={(e) => {
                                    // Fallback if image not found
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-white/10 rounded px-2 py-1">
                                <p className="text-[9px] text-[#C5A059] uppercase tracking-widest font-bold">Live Screenshot</p>
                            </div>
                        </div>

                        {/* Slide content */}
                        <div className="space-y-5">
                            <div>
                                <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold mb-1">
                                    Slide {slideIndex + 1} of {mod!.slides.length}
                                </p>
                                <h2 className="text-2xl font-black">{slide.title}</h2>
                            </div>

                            <div className="space-y-3">
                                {slide.body.map((line, i) => (
                                    <div key={i} className="flex gap-3 text-sm text-gray-300 leading-relaxed">
                                        <span className="text-[#C5A059] font-bold flex-shrink-0 font-mono text-xs mt-0.5">
                                            {line.startsWith('①') || line.startsWith('②') || line.startsWith('③') || line.startsWith('④') ? '' : '→'}
                                        </span>
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

                            {/* Navigation */}
                            <div className="flex gap-3 pt-2">
                                {slideIndex > 0 && (
                                    <button
                                        onClick={() => setSlideIndex(s => s - 1)}
                                        className="px-4 py-2.5 border border-white/10 text-gray-400 text-sm rounded-lg hover:border-white/30 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (isLastSlide) setPhase('quiz');
                                        else setSlideIndex(s => s + 1);
                                    }}
                                    className="flex-1 py-2.5 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2"
                                >
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
                            <p className="text-gray-500 text-sm mt-1">{mod!.quiz.length} questions · Select the best answer</p>
                        </div>
                        <Quiz questions={mod!.quiz} onComplete={handleQuizComplete} />
                    </div>
                )}

                {phase === 'result' && (
                    <div className="max-w-md mx-auto text-center space-y-6">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl font-black border-4 ${quizScore === mod!.quiz.length ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : quizScore >= Math.ceil(mod!.quiz.length * 0.67) ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-red-500 bg-red-500/10 text-red-400'}`}>
                            {Math.round((quizScore / mod!.quiz.length) * 100)}%
                        </div>

                        <div>
                            <h2 className="text-2xl font-black">
                                {quizScore === mod!.quiz.length ? 'Perfect Score!' : quizScore >= Math.ceil(mod!.quiz.length * 0.67) ? 'Module Passed!' : 'Keep Practicing'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                You got {quizScore} out of {mod!.quiz.length} questions correct.
                            </p>
                        </div>

                        {quizScore < Math.ceil(mod!.quiz.length * 0.67) && (
                            <p className="text-yellow-400 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3">
                                We recommend reviewing the slides again before moving on.
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setPhase('slides'); setSlideIndex(0); }}
                                className="flex-1 py-3 border border-white/10 text-gray-400 text-sm rounded-lg hover:border-white/30 hover:text-white transition-all"
                            >
                                Review Slides
                            </button>
                            {activeModule! < MODULES.length - 1 ? (
                                <button
                                    onClick={() => openModule(activeModule! + 1)}
                                    className="flex-1 py-3 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2"
                                >
                                    Next Module <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={closeModule}
                                    className="flex-1 py-3 bg-[#C5A059] text-black font-bold text-sm uppercase tracking-widest rounded-lg hover:bg-[#d4b06a] transition-all flex items-center justify-center gap-2"
                                >
                                    <Award className="w-4 h-4" /> Finish Training
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Send, Settings, AlertCircle, Gift, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ApiKeyModal from "@/components/ApiKeyModal";
import BlackBoxCard from "@/components/BlackBoxCard";
import ScoreCard from "@/components/ScoreCard";
import FollowupQuestions from "@/components/FollowupQuestions";
import ExplosionAnimation from "@/components/ExplosionAnimation";
import {
  loadState,
  setPhase,
  addPreVote,
  addTestResult,
  revealRound,
  claimHandbook,
  onStateChange,
  setActiveKeyword,
} from "@/lib/client-state";
import {
  BLACK_BOX_BANK,
  type BlackBox,
  type TestResult,
} from "@/lib/data";
import {
  generateFollowups,
  rewriteToHighScore,
  generateInterviewQuestion,
  scoreInterviewAnswer,
  fallbackInterviewScore,
  type FollowupItem,
  type RewriteResult,
  type InterviewScoreResult,
} from "@/lib/deepseek-client";

export default function QAPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState(() => loadState());
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [testAnswer, setTestAnswer] = useState("");
  const [scoreResult, setScoreResult] = useState<TestResult | null>(null);
  const [scoreStreaming, setScoreStreaming] = useState("");
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplosion, setShowExplosion] = useState(false);
  const [showHandbookPopup, setShowHandbookPopup] = useState(false);
  const [userPreVote, setUserPreVote] = useState<number | undefined>();
  const testInputRef = useRef<HTMLTextAreaElement>(null);

  // Interview question generation
  const [interviewQuestion, setInterviewQuestion] = useState<string | null>(null);
  const [interviewQuestionLoading, setInterviewQuestionLoading] = useState(false);
  const [interviewScoreResult, setInterviewScoreResult] = useState<InterviewScoreResult | null>(null);

  // Testing sub-phase: "answering" | "followups" | "scored"
  type TestingSubPhase = "answering" | "followups" | "scored";
  const [testingSubPhase, setTestingSubPhase] = useState<TestingSubPhase>("answering");

  // Follow-up state
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [savedFollowupQAs, setSavedFollowupQAs] = useState<{ question: string; answer: string }[]>([]);

  // Rewrite state
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);

  useEffect(() => {
    return onStateChange((s) => setState(s));
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const keyword = state.activeKeyword;
  const boxEntry = keyword ? BLACK_BOX_BANK[keyword] : null;
  const dynamicBox = !boxEntry && keyword
    ? state.activeBoxes.find(b => b.keyword === keyword)
    : null;
  const box: BlackBox | null = boxEntry
    ? {
        keyword: keyword || "",
        question: boxEntry.q,
        emoji: boxEntry.emoji,
        options: boxEntry.options,
        correct: boxEntry.correct,
        optionLean: boxEntry.option_lean,
        truth: boxEntry.truth,
        proStance: boxEntry["正方"],
        conStance: boxEntry["反方"],
        testQuestion: boxEntry.test_question,
        testConclusion: boxEntry.test_conclusion,
        freq: 0,
      }
    : dynamicBox ?? null;
  const round = keyword ? state.rounds[keyword] : null;
  const phase = state.phase;
  const activeBoxes = state.activeBoxes;

  // Trigger explosion when entering blasted phase
  useEffect(() => {
    if (phase !== "blasted" || !keyword) return;

    // Show explosion
    setShowExplosion(true);

    // Auto-show handbook popup after explosion (fallback timer)
    const popupTimer = setTimeout(() => {
      setShowExplosion(false);
      setShowHandbookPopup(true);
    }, 2800);

    return () => clearTimeout(popupTimer);
  }, [phase, keyword]);

  const nextPhase = useCallback(() => {
    const phases: Array<typeof phase> = ["pre_vote", "testing", "blasted"];
    const idx = phases.indexOf(phase);
    if (idx < phases.length - 1) {
      const next = phases[idx + 1];

      // Generate interview question when entering testing
      if (next === "testing" && keyword && box) {
        setTestingSubPhase("answering");
        generateInterviewQuestionForTopic();
      }

      if (next === "blasted" && keyword) {
        // Chain: set phase first, then reveal on the phased state
        const phased = setPhase(state, next);
        const revealed = revealRound(phased, keyword);
        setState(revealed);
      } else {
        setPhase(state, next);
        setState((s) => ({ ...s, phase: next }));
      }
    }
  }, [phase, state, keyword, scoreResult, testAnswer, box]);

  const handlePreVote = (optionIndex: number) => {
    if (!keyword) return;
    setUserPreVote(optionIndex);
    const newState = addPreVote(state, keyword, optionIndex);
    setState(newState);
  };

  // Generate interview question for the topic
  const generateInterviewQuestionForTopic = async () => {
    if (!keyword || !box) return;
    setInterviewQuestionLoading(true);
    setInterviewQuestion(null);
    setInterviewScoreResult(null);
    try {
      const result = await generateInterviewQuestion(keyword, box.question);
      if (result?.question) {
        setInterviewQuestion(result.question);
      } else {
        // Fallback to the box's testQuestion
        setInterviewQuestion(box.testQuestion);
      }
    } catch {
      setInterviewQuestion(box.testQuestion);
    } finally {
      setInterviewQuestionLoading(false);
    }
  };

  const handleSubmitTest = async () => {
    if (!testAnswer.trim() || !keyword) return;
    setScoring(true);
    setScoreResult(null);
    setScoreStreaming("");
    setError(null);
    setFollowups([]);
    setRewriteResult(null);
    setInterviewScoreResult(null);

    // Step 1: Generate follow-up questions based on the answer
    setFollowupLoading(true);
    try {
      const result = await generateFollowups(testAnswer);
      if (result.followups && result.followups.length > 0) {
        setFollowups(result.followups);
        setTestingSubPhase("followups");
      } else {
        // No follow-ups needed, score directly
        await performInterviewScoring(testAnswer, []);
        setTestingSubPhase("scored");
      }
    } catch {
      // Even if follow-up generation fails, proceed to score
      await performInterviewScoring(testAnswer, []);
      setTestingSubPhase("scored");
    } finally {
      setScoring(false);
      setFollowupLoading(false);
    }
  };

  // Score the complete interview Q&A
  const performInterviewScoring = async (
    originalAnswer: string,
    followupQAs: { question: string; answer: string }[]
  ) => {
    if (!keyword) return;
    const scoringStart = Date.now();
    const MIN_SCORING_MS = 2000;
    setScoring(true);
    try {
      const topic = box?.question || keyword;
      const result = await scoreInterviewAnswer(topic, originalAnswer, followupQAs);

      // Ensure scoring animation plays for at least MIN_SCORING_MS
      const elapsed = Date.now() - scoringStart;
      if (elapsed < MIN_SCORING_MS) {
        await new Promise((r) => setTimeout(r, MIN_SCORING_MS - elapsed));
      }

      setInterviewScoreResult(result);

      // Also create a backwards-compatible TestResult for existing components
      const legacyResult: TestResult = {
        score: result.score,
        logic: result.dimensions[0]?.score ?? 0,
        content: result.dimensions[1]?.score ?? 0,
        fluency: result.dimensions[2]?.score ?? 0,
        comment: result.overall,
        followup_answers: followupQAs.map((qa) => qa.answer),
        original_answer: originalAnswer,
        followup_qa_pairs: followupQAs,
      };
      setScoreResult(legacyResult);
      const newState = addTestResult(state, keyword, legacyResult);
      setState(newState);
      claimHandbook(newState, keyword);

      setTestingSubPhase("scored");
    } catch (e) {
      // Ensure scoring animation plays for at least MIN_SCORING_MS even on error
      const elapsed = Date.now() - scoringStart;
      if (elapsed < MIN_SCORING_MS) {
        await new Promise((r) => setTimeout(r, MIN_SCORING_MS - elapsed));
      }

      const msg = e instanceof Error ? e.message : "评分失败";
      if (msg === "NO_API_KEY") {
        const fallback = fallbackInterviewScore(originalAnswer, followupQAs.map((qa) => qa.answer));
        setInterviewScoreResult(fallback);
        const legacyResult: TestResult = {
          score: fallback.score,
          logic: fallback.dimensions[0]?.score ?? 0,
          content: fallback.dimensions[1]?.score ?? 0,
          fluency: fallback.dimensions[2]?.score ?? 0,
          comment: fallback.overall,
          followup_answers: followupQAs.map((qa) => qa.answer),
          original_answer: originalAnswer,
          followup_qa_pairs: followupQAs,
        };
        setScoreResult(legacyResult);
        const newState = addTestResult(state, keyword, legacyResult);
        setState(newState);
        claimHandbook(newState, keyword);
        setTestingSubPhase("scored");
      } else {
        setError(msg);
      }
    } finally {
      setScoring(false);
    }
  };

  const handleFollowupAnswers = (answers: string[]) => {
    // Build followup Q&A pairs and trigger scoring
    const followupQAs = followups.map((fq, i) => ({
      question: fq.question,
      answer: answers[i] || "",
    }));
    setSavedFollowupQAs(followupQAs);
    performInterviewScoring(testAnswer, followupQAs);
  };

  // AI Rewrite Coach
  const handleRewrite = async () => {
    if (!testAnswer) return;
    setRewriteLoading(true);
    try {
      // Build full answer text including follow-up Q&A
      const followupText = savedFollowupQAs.length > 0
        ? "\n\n【追问环节】\n" + savedFollowupQAs.map((qa, i) => `追问${i + 1}：${qa.question}\n回答：${qa.answer}`).join("\n\n")
        : "";
      const fullAnswer = testAnswer + followupText;

      // Find weakest dimension for targeted rewrite
      let weakestDim = "表达条理";
      let weakestScore = 100;
      // Prefer interview score dimensions if available
      if (interviewScoreResult?.dimensions && interviewScoreResult.dimensions.length > 0) {
        for (const d of interviewScoreResult.dimensions) {
          if (d.score < weakestScore) {
            weakestScore = d.score;
            weakestDim = d.name;
          }
        }
      } else if (scoreResult?.dimensions) {
        const dims = scoreResult.dimensions;
        const entries = [
          { key: "逻辑思维", val: dims.logical_thinking?.score ?? 0 },
          { key: "问题解决", val: dims.problem_solving?.score ?? 0 },
          { key: "沟通协作", val: dims.communication_collaboration?.score ?? 0 },
          { key: "价值观匹配", val: dims.value_alignment?.score ?? 0 },
        ];
        for (const e of entries) {
          if (e.val < weakestScore) {
            weakestScore = e.val;
            weakestDim = e.key;
          }
        }
      }
      const result = await rewriteToHighScore(fullAnswer, weakestDim, weakestScore);
      setRewriteResult(result);
    } catch {
      // silent fail
    } finally {
      setRewriteLoading(false);
    }
  };

  // Demo example answers for each topic (used in Module 2)
  const DEMO_ANSWERS: Record<string, string> = {
    "歧视": "我就读于XX大学（非985/211）。我的核心竞争力体现在三个方面：第一，我在校期间主导了3个跨部门合作项目，从需求调研到方案落地全程负责，其中一个项目将用户留存率提升了12%；第二，我自学了Python和SQL，在实习中用数据驱动的方式优化了客户运营流程，每月节省了约20小时的人工成本；第三，我在团队中通常担任协调者角色，擅长在多方需求中找到平衡点并推动达成共识。我认为实际的项目经验和解决问题的能力，远比学校标签更能体现一个人的岗位胜任力。",
    "双非": "我毕业于一所双非院校，但我始终相信能力比出身更重要。在校期间，我主动参与了两段实习，其中一段在创业公司从0到1搭建了用户反馈系统，处理了超过5000条用户反馈并归类为12个产品迭代方向。这段经历锻炼了我的：①快速学习能力——从零上手内部系统只用了3天；②问题拆解能力——将模糊的用户反馈转化为可执行的产品需求；③跨部门协作能力——协调产品、技术、运营三个团队推进改进落地。我相信这些实战经验比学历更能证明我的岗位胜任力。",
    "公平": "我曾在一个跨部门项目中遇到一个棘手问题：运营团队要求两周内上线一个促销功能，但技术团队评估至少需要三周。我的处理方式是：第一步，分别和两边的负责人沟通，理解运营的真实需求（是为了应对竞品促销）和技术的实际瓶颈（需要重构部分老代码）；第二步，我提出了一个折中方案——先上线一个简化版功能满足80%的需求，两周可交付，剩余20%的优化放在下一个迭代；第三步，我推动建立了一个需求优先级评估框架，让后续类似争议有了统一的标准。最终项目按时上线，竞品促销的冲击被有效化解，技术团队也认可了这个务实的方案。",
    "内向": "作为性格偏内向的人，我的沟通风格是「准备充分，直击要点」。在一次客户方案汇报中，我没有选择华丽的演讲技巧，而是提前做了三件事：①将方案的核心逻辑梳理成了一页纸的思维导图；②准备了5个客户最可能问的问题及详细回答；③用数据和案例支撑了每个关键论点。汇报结束后，客户说这是他们见过最清晰的方案——不是因为我口才好，而是因为我准备充分且逻辑清楚。我认为内向者在书面表达和深度思考方面反而有优势，这在需要严谨分析的岗位上是宝贵的特质。",
    "算法": "关于我擅长的专业能力，我的核心优势是数据分析和问题诊断。在实习期间，我负责监控一个电商平台的用户转化数据。某天我发现注册转化率突然下降了约8%，我按照以下步骤排查：首先，按渠道（PC端/移动端/小程序）拆分数据，定位到问题出在移动端；其次，按时间维度逐小时对比，发现问题从当天下午2点开始出现；最后，和开发团队确认——是下午2点的一次发版中，移动端注册页面的短信验证码接口出现了延迟。修复后转化率在2小时内恢复到正常水平。这次经历让我深刻理解了数据驱动问题诊断的价值。",
    "申诉": "我在一次课程项目中经历过一次高压任务：需要在48小时内完成一份行业研究报告，但负责数据收集的组员临时请假。我的处理步骤是：首先，快速评估剩余时间和可用资源——我一个人无法完成原计划的完整数据收集+分析+撰写；其次，我调整了策略，将报告范围从全行业缩小到三个头部公司的深度对比，这样数据收集量减少了60%但分析深度反而增加；同时，我使用了自动化爬虫工具加速了数据获取；最后，我主动和老师沟通了情况并申请了半天的延期，最终报告获得了全班最高分。这次经历让我学会了在压力下如何优先级排序和灵活调整策略。",
    "紧张": "我的抗压能力主要体现在两个方面：一是情绪稳定性，二是策略调整能力。在一次实习中，我负责的一个项目在交付前三天被客户临时要求增加两个核心功能。起初我确实感到压力，但我没有陷入焦虑，而是立即做了三件事：①和客户沟通确认了新增功能的优先级排序；②重新评估了工作量和时间，制定了三天的冲刺计划；③主动协调了一位同事协助分担了部分测试工作。最终我们按时交付了客户最看重的功能，另一个功能也在一周后完成上线。我的适应能力体现在：我从这次经历中总结了一套「需求变更应对清单」，后续类似情况我都能更快地进入应对状态而不是慌乱。",
    "透明": "我最擅长的专业能力是用户研究和产品设计。在一次课程项目中，我们团队要为一款面向老年人的健康管理App设计功能。我主导了整个设计流程：首先，我访谈了12位55-70岁的老年人，了解他们在健康管理中的真实痛点——不是技术问题，而是「不知道自己的数据意味着什么」；其次，我基于访谈结果设计了3个核心功能原型，核心原则是「用最少的字传达最重要的信息」；然后，我组织了两轮可用性测试，根据反馈迭代了交互设计；最终我们的设计获得了课程的最高分，并被推荐参加校级创新比赛。这个项目让我确认了：好的产品设计来自于对用户需求的深入理解，而不是主观猜测。",
    "偏见": "我解决过的最复杂的问题发生在一段实习中：公司的客户数据分散在三个不同的系统中（CRM、客服系统、支付系统），导致无法形成完整的客户画像。我的解决思路是：第一步，花了一周时间梳理三个系统的数据结构和字段映射关系，绘制了数据血缘图；第二步，识别了关键冲突——CRM中的客户ID和支付系统中的客户ID不是一一对应的，存在多对多的合并问题；第三步，我设计了一套基于手机号和邮箱的模糊匹配算法，将匹配准确率从60%提升到了95%；第四步，写了一个自动化脚本每天同步数据并生成异常报告。最终这套方案被团队采纳并纳入了正式的数据治理体系，我也因此获得了实习转正的机会。",
    "长相": "我的职业发展目标是在3-5年内成长为一名懂技术的产品经理。为此我制定了三个阶段的准备计划：第一阶段（当前-1年），深度掌握数据分析技能——我正在学习SQL和Python，并计划考取Google Data Analytics认证，同时在当前工作中主动承担数据驱动的产品优化项目；第二阶段（1-3年），积累行业 know-how——我计划在电商或SaaS领域深耕，通过阅读行业报告、参加行业会议、和资深PM交流来建立系统化的行业认知；第三阶段（3-5年），培养管理和战略视野——我希望能带一个小团队，同时参与公司级别的产品战略规划。我相信技术背景+产品sense+行业深度的组合能让我在5年内成为有竞争力的产品负责人。",
    "能力": "我的学习能力和成长潜力可以通过一段经历来说明：大一暑假，我加入了一个创业团队做校园外卖小程序，当时我对小程序开发完全不懂。我的学习路径是：第一周，通过官方文档和一个实战教程学会了小程序的基础开发，每天投入约6小时；第二周，我开始独立负责订单管理模块的开发，遇到问题就查文档、逛社区、请教团队的前辈；一个月后，我不仅完成了自己的模块，还主动优化了首页加载速度（从3秒降到1.2秒）。更重要的是，我从零基础到能独立开发的过程只用了30天，而且总结了一套快速上手新技术的方法——先看架构图理解全局，再看核心API文档，最后通过一个小demo验证理解。这种学习能力让我有信心胜任任何需要快速上手的技术岗位。",
  };

  const handleFillDemo = () => {
    if (!keyword) return;
    const demoAnswer = DEMO_ANSWERS[keyword] || DEMO_ANSWERS["能力"];
    setTestAnswer(demoAnswer);
    testInputRef.current?.focus();
  };

  if (!hydrated) {
    return <div className="min-h-screen" style={{ background: "#EEE" }} />;
  }

  // Select a keyword to start
  if (!keyword || !box) {
    const available = activeBoxes;

    return (
      <div className="min-h-screen pb-24" style={{ background: "#EEE" }}>
        <div className="pt-8 px-5 pb-4">
          <h1 className="text-xl font-semibold text-[#0052D9]">💣 黑箱拆解室</h1>
          <p className="text-xs text-slate-500 mt-1">挑一个你最想搞明白的黑箱，跟着懂面鹅一起拆</p>
        </div>
        <div className="px-5">
          {available.length === 0 && (
            <div className="text-center py-16">
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-5xl mb-4 inline-block"
              >
                🐧
              </motion.div>
              <p className="text-sm font-semibold text-slate-500 mb-1">还没有匹配到黑箱</p>
              <p className="text-xs text-slate-400">回首页说说你的担忧，懂面鹅会帮你找到相关的黑箱</p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[#0052D9] text-white text-xs font-medium rounded-full hover:bg-[#366EF4] transition-colors"
              >
                <ArrowLeft size={14} />
                回首页
              </motion.button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {available.map((b, i) => (
              <motion.button
                key={b.keyword}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  const s1 = setActiveKeyword(state, b.keyword);
                  const s2 = setPhase(s1, "pre_vote");
                  setState(s2);
                  setUserPreVote(undefined);
                  setScoreResult(null);
                  setScoreStreaming("");
                  setTestAnswer("");
                  setFollowups([]);
                  setRewriteResult(null);
                  setSavedFollowupQAs([]);
                  setInterviewQuestion(null);
                  setInterviewScoreResult(null);
                  setTestingSubPhase("answering");
                }}
                className="group relative flex flex-col items-center text-center p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-[#0052D9] hover:bg-slate-750 hover:shadow-[0_4px_20px_rgba(0,82,217,0.2)] transition-all duration-200"
              >
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-200">{b.emoji}</span>
                <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{b.question}</p>
                <p className="text-[10px] text-slate-400 mt-2">#{b.keyword}</p>
              </motion.button>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#EEE" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E8E8E8]">
        <div className="flex items-center gap-3 px-5 py-3">
          <button onClick={() => {
            const newState = setActiveKeyword(state, "");
            setState(newState);
          }}>
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] text-[#0052D9] font-semibold">
              阶段 {["pre_vote", "testing", "blasted"].indexOf(phase) + 1}/3
            </p>
            <p className="text-xs text-slate-400">
              {phase === "pre_vote" && "🤔 拆弹预测"}
              {phase === "testing" && "🧪 AI 实测"}
              {phase === "blasted" && "💣 爆破揭晓"}
            </p>
          </div>
          <button onClick={() => setApiKeyModal(true)} className="p-2">
            <Settings size={18} className="text-slate-400" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-[#E8E8E8]">
          <motion.div
            className="h-full bg-[#0052D9]"
            initial={false}
            animate={{
              width: `${((["pre_vote", "testing", "blasted"].indexOf(phase) + 1) / 3) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-[#FFF0ED] border border-[#D54941]/20 rounded-sm">
            <AlertCircle size={16} className="text-[#D54941]" />
            <p className="text-sm text-[#D54941]">{error}</p>
          </div>
        )}

        {/* Phase: pre_vote */}
        {phase === "pre_vote" && box && (
          <>
            <BlackBoxCard
              box={box}
              revealed={false}
              phase={phase}
              onVote={handlePreVote}
              userVote={userPreVote}
            />
            {userPreVote !== undefined && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={nextPhase}
                className="w-full py-3 bg-[#0052D9] text-white font-semibold rounded-sm flex items-center justify-center gap-2 hover:bg-[#366EF4] active:bg-[#003CAB] transition-colors"
                style={{ height: 40 }}
                whileTap={{ scale: 0.98 }}
              >
                进入实测 <ArrowRight size={18} />
              </motion.button>
            )}
          </>
        )}

        {/* Phase: testing */}
        {phase === "testing" && box && (
          <>
            {/* Step 1: Generate & show interview question */}
            {testingSubPhase === "answering" && (
              <div className="bg-white border border-[#E8E8E8] rounded-md p-5">
                <h3 className="font-semibold text-slate-800 mb-1">🧪 AI 面试实测</h3>

                {/* Loading interview question */}
                {!scoring && interviewQuestionLoading && (
                  <div className="flex items-center gap-2 my-8 justify-center">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-4 h-4 rounded-full bg-[#0052D9]"
                    />
                    <span className="text-xs text-slate-400">懂面鹅正在出面试题...</span>
                  </div>
                )}

                {/* Interview question */}
                {!interviewQuestionLoading && interviewQuestion && (
                  <>
                    <div className="mb-4 p-3 bg-[#F2F3FF] border border-[#0052D9]/10 rounded-sm">
                      <p className="text-[11px] font-semibold text-[#0052D9] mb-1">面试官提问</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{interviewQuestion}</p>
                    </div>
                    <textarea
                      ref={testInputRef}
                      value={testAnswer}
                      onChange={(e) => setTestAnswer(e.target.value)}
                      placeholder="把你的回答写在这里..."
                      className="w-full h-36 px-3 py-3 bg-[#E8E8E8] rounded-sm text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052D9] resize-none"
                      style={{
                        border: "1px solid transparent",
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid #0052D9";
                        e.target.style.boxShadow = "0 0 0 2px #D9E1FF";
                      }}
                      onBlur={(e) => {
                        e.target.style.border = "1px solid transparent";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <button
                      onClick={handleFillDemo}
                      type="button"
                      className="w-full mt-2 py-2 border border-dashed border-[#0052D9]/30 text-[#0052D9] text-xs font-medium rounded-sm hover:bg-[#E8F3FF] transition-colors"
                    >
                      📝 填入示例回答（Demo 演示用）
                    </button>
                    <button
                      onClick={handleSubmitTest}
                      disabled={!testAnswer.trim() || scoring}
                      className="w-full mt-3 py-3 bg-[#0052D9] disabled:bg-[#B5C7FF] text-white font-semibold rounded-sm flex items-center justify-center gap-2 hover:bg-[#366EF4] active:bg-[#003CAB] transition-colors"
                      style={{ height: 40 }}
                    >
                      {scoring ? "提交中..." : (
                        <>
                          提交回答 <Send size={16} />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Follow-up questions */}
            {testingSubPhase === "followups" && (
              <>
                {/* Show the original question and answer */}
                <div className="bg-white border border-[#E8E8E8] rounded-md p-4">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">你的回答已提交</p>
                  <p className="text-xs text-slate-600 line-clamp-3">{testAnswer}</p>
                </div>

                {/* Follow-up loading */}
                {followupLoading && (
                  <div className="bg-white border border-[#E8E8E8] rounded-md p-5">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-4 h-4 rounded-full bg-[#0052D9]"
                      />
                      <span className="text-xs text-slate-400">懂面鹅正在根据你的回答生成追问...</span>
                    </div>
                  </div>
                )}

                {/* Follow-up Questions */}
                {followups.length > 0 && !followupLoading && (
                  <FollowupQuestions
                    followups={followups}
                    onAnswer={handleFollowupAnswers}
                    loading={scoring}
                  />
                )}

                {/* Analyzing answer after followup submission */}
                {scoring && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white border border-[#E8E8E8] rounded-md p-5 flex flex-col items-center py-8"
                  >
                    <motion.div
                      animate={{ y: [-4, 4, -4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="mb-4"
                    >
                      <span className="text-5xl">🐧</span>
                    </motion.div>
                    <p className="text-sm font-semibold text-[#1D2129] mb-1">懂面鹅正在分析你的回答...</p>
                    <p className="text-[11px] text-[#6B7187] mb-4">综合评估你的回答与追问</p>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-[#0052D9]"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {/* Step 3: Scoring result */}
            {testingSubPhase === "scored" && (
              <>
                {/* Scoring in progress */}
                {scoring && !interviewScoreResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-[0_4px_20px_rgba(0,82,217,0.08)]"
                  >
                    {/* Center animation */}
                    <div className="flex flex-col items-center mb-5">
                      <motion.div
                        className="relative mb-3"
                        animate={{ y: [-6, 6, -6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <span className="text-6xl">🐧</span>
                      </motion.div>
                      <p className="text-sm font-semibold text-[#1D2129] mb-1">懂面鹅正在综合评分中...</p>
                      <p className="text-[11px] text-[#6B7187]">多维度分析你的回答表现</p>
                    </div>

                    {/* Progress steps */}
                    <div className="space-y-2.5">
                      {[
                        { label: "分析回答结构", icon: "🧠", delay: 0 },
                        { label: "评估维度匹配", icon: "📊", delay: 0.6 },
                        { label: "生成评分报告", icon: "📝", delay: 1.2 },
                      ].map((step, i) => (
                        <motion.div
                          key={step.label}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: step.delay, duration: 0.4 }}
                          className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg"
                        >
                          <span className="text-base">{step.icon}</span>
                          <span className="text-xs text-slate-600">{step.label}</span>
                          <motion.div
                            className="ml-auto w-4 h-4 rounded-full border-2 border-[#0052D9] border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          />
                        </motion.div>
                      ))}
                    </div>

                    {/* Pulsing dots at bottom */}
                    <div className="flex items-center justify-center gap-1.5 mt-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#0052D9]"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-[#FFF0ED] border border-[#D54941]/20 rounded-sm">
                    <AlertCircle size={16} className="text-[#D54941]" />
                    <p className="text-sm text-[#D54941]">{error}</p>
                  </div>
                )}

                {/* Interview Score Result */}
                {interviewScoreResult && (
                  <ScoreCard
                    logic={interviewScoreResult.dimensions[0]?.score ?? 0}
                    content={interviewScoreResult.dimensions[1]?.score ?? 0}
                    fluency={interviewScoreResult.dimensions[2]?.score ?? 0}
                    comment={interviewScoreResult.overall}
                    interviewResult={interviewScoreResult}
                    onRewrite={handleRewrite}
                    rewriteLoading={rewriteLoading}
                    rewriteResult={rewriteResult}
                  />
                )}

                {/* Legacy score fallback (when BBSI mode is used) */}
                {!interviewScoreResult && scoreResult && (
                  <ScoreCard
                    logic={scoreResult.logic}
                    content={scoreResult.content}
                    fluency={scoreResult.fluency}
                    comment={scoreResult.comment}
                    truth={scoreResult.truth}
                    mechanism={scoreResult.mechanism}
                    bbsiResult={scoreResult}
                    onRewrite={handleRewrite}
                    rewriteLoading={rewriteLoading}
                    rewriteResult={rewriteResult}
                  />
                )}

                {/* Streaming score */}
                {scoreStreaming && !scoreResult && !interviewScoreResult && (
                  <ScoreCard
                    logic={0}
                    content={0}
                    fluency={0}
                    comment=""
                    streaming={scoreStreaming}
                  />
                )}

                {/* Next phase button */}
                {(interviewScoreResult || scoreResult) && (
                  <button
                    onClick={nextPhase}
                    className="w-full py-3 bg-[#0052D9] text-white font-semibold rounded-sm flex items-center justify-center gap-2 hover:bg-[#366EF4] active:bg-[#003CAB] transition-colors"
                    style={{ height: 40 }}
                  >
                    拆箱看真相 <ArrowRight size={18} />
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* Phase: blasted */}
        {phase === "blasted" && box && (
          <>
            <BlackBoxCard
              box={box}
              revealed={true}
              phase={phase}
              userVote={userPreVote}
            />

            {/* Handbook Claim Popup — appears after explosion */}
            {showHandbookPopup && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="relative overflow-hidden bg-gradient-to-br from-[#0052D9] via-[#366EF4] to-[#722ED1] rounded-xl p-5 shadow-[0_8px_32px_rgba(0,82,217,0.25)]"
              >
                {/* Decorative background circles */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/8 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎁</span>
                    <p className="text-sm font-bold text-white">恭喜！你拆开了一个黑箱</p>
                  </div>
                  <p className="text-xs text-white/70 mb-4 leading-relaxed">
                    你的通关手册已经悄悄更新了～这次拆箱的真相和评分解析已经收录其中。去看看你解锁了哪些新发现？
                  </p>
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/15 rounded-lg">
                    <BookOpen size={14} className="text-white/80" />
                    <div className="flex-1">
                      <p className="text-[10px] text-white/60">已解锁手册卡片</p>
                      <p className="text-xs font-bold text-white">{state.handbookClaimed?.length || 0} 张</p>
                    </div>
                    <Gift size={14} className="text-white/80" />
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => router.push("/handbook")}
                      className="flex-1 py-2.5 bg-white text-[#0052D9] text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#E8F3FF] transition-colors"
                    >
                      领取干货手册 <ArrowRight size={14} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowHandbookPopup(false)}
                      className="px-4 py-2.5 bg-white/10 text-white/80 text-xs rounded-lg hover:bg-white/20 transition-colors"
                    >
                      稍后
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            <button
              onClick={() => router.push("/handbook")}
              className="w-full py-3 bg-[#0052D9] text-white font-semibold rounded-sm flex items-center justify-center gap-2 hover:bg-[#366EF4] active:bg-[#003CAB] transition-colors"
              style={{ height: 40 }}
            >
              翻翻干货手册 <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>

      <ApiKeyModal open={apiKeyModal} onClose={() => setApiKeyModal(false)} />

      {/* Explosion overlay */}
      <ExplosionAnimation show={showExplosion} onComplete={() => setShowExplosion(false)}>
        <div className="text-center">
          <p className="text-4xl mb-3">💣</p>
          <p className="text-2xl font-semibold text-white">黑箱炸开了！</p>
          <p className="text-sm text-white/60 mt-2">真相马上来</p>
        </div>
      </ExplosionAnimation>

      <BottomNav />
    </div>
  );
}

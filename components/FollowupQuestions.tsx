"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, ChevronDown, ChevronUp, FileText } from "lucide-react";

interface FollowupItem {
  question: string;
  targets: "action" | "result";
}

interface Props {
  followups: FollowupItem[];
  onAnswer: (answers: string[]) => void;
  loading?: boolean;
}

const DEMO_FOLLOWUP_ANSWERS: Record<string, string> = {
  action: "在发现数据异常后，我主动联系了三个相关团队的负责人，组织了一次15分钟的快速同步会议。我制作了一份简洁的数据对比表，标出了异常时间段和可能的原因，然后和各团队一起逐项排查。最终定位到是移动端的一个接口超时导致的。我推动开发团队在2小时内完成了修复，并建议增加了接口监控告警。",
  result: "这次优化带来的结果很具体：用户注册转化率从原来的12.3%恢复到了正常水平的20.1%，相当于每天多带来了约50个有效注册用户。我还把这次排查的过程整理成了一份SOP文档，后续类似的监控告警响应时间从平均40分钟缩短到了15分钟。老板在周会上专门提到了这个案例。",
};

export default function FollowupQuestions({ followups, onAnswer, loading }: Props) {
  const [answers, setAnswers] = useState<string[]>(followups.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleSubmit = () => {
    const filled = answers.filter((a) => a.trim());
    if (filled.length === 0) return;
    setSubmitted(true);
    onAnswer(answers);
  };

  const handleFillDemo = (index: number, targets: "action" | "result") => {
    const demo = DEMO_FOLLOWUP_ANSWERS[targets] || DEMO_FOLLOWUP_ANSWERS.action;
    const next = [...answers];
    next[index] = demo;
    setAnswers(next);
  };

  if (followups.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#E8E8E8] rounded-md p-5"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-[#0052D9]" />
          <span className="text-sm font-semibold text-slate-800">AI 追问链</span>
          <span className="text-[10px] text-[#0052D9] bg-[#F2F3FF] px-1.5 py-0.5 rounded-sm font-semibold">
            深度追问
          </span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <>
          <p className="text-[11px] text-slate-400 mb-3">
            基于你的回答，AI 生成了追问，帮你补全 STAR 短板。可选答。
          </p>

          <div className="space-y-3">
            {followups.map((fq, i) => (
              <div key={i}>
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0052D9] text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs text-slate-700 font-medium">{fq.question}</p>
                    <span className="text-[10px] text-slate-400">
                      追问目标：{fq.targets === "action" ? "行动细节 (A)" : "量化结果 (R)"}
                    </span>
                  </div>
                </div>
                <textarea
                  value={answers[i]}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  disabled={submitted}
                  placeholder={`针对追问 ${i + 1} 输入你的回答...`}
                  className="w-full h-20 px-3 py-2 bg-slate-50 border border-[#E8E8E8] rounded-sm text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052D9] resize-none disabled:opacity-50"
                />
                {!submitted && (
                  <button
                    onClick={() => handleFillDemo(i, fq.targets)}
                    type="button"
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-[#0052D9]/60 hover:text-[#0052D9] transition-colors"
                  >
                    <FileText size={10} />
                    填入示例回答
                  </button>
                )}
              </div>
            ))}
          </div>

          {!submitted && (
            <button
              onClick={handleSubmit}
              disabled={loading || answers.every((a) => !a.trim())}
              className="w-full mt-3 py-2.5 bg-[#0052D9] disabled:bg-slate-300 text-white text-sm font-semibold rounded-sm flex items-center justify-center gap-1.5"
            >
              {loading ? "提交中..." : (
                <>
                  提交回答 <Send size={14} />
                </>
              )}
            </button>
          )}

          {submitted && (
            <p className="mt-3 text-[11px] text-green-600 text-center">
              ✅ 追问回答已提交，将纳入综合评估
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}

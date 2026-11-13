import { useState } from 'react';
import { Award, BookOpen, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/curriculum';

interface MasteryQuizProps {
  onOpenDoc: (docId: string) => void;
}

export function MasteryQuiz({ onOpenDoc }: MasteryQuizProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const answeredCount = Object.keys(answers).length;
  const correctCount = QUIZ_QUESTIONS.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;

  const handleSelect = (questionId: string, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  return (
    <section aria-labelledby="quiz-heading" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm">
        <div>
          <h2 id="quiz-heading" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Award className="size-5 text-[var(--accent)]" aria-hidden="true" />
            实战通关测验（8 题情景检验）
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            每道题都源自 Palantir 官方文档里的真实陷阱（主键确定性、双向链接、Webhook 回滚、OSv2 冲突解决与权限架构）。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs">
            <span className="text-[var(--text-muted)]">当前得分：</span>
            <strong className="font-mono text-sm text-[var(--accent)]">
              {correctCount} / {QUIZ_QUESTIONS.length}
            </strong>
            <span className="ms-2 text-[var(--text-muted)]">
              (已答 {answeredCount} 题)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAnswers({})}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            重测
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {QUIZ_QUESTIONS.map((q, qi) => {
          const chosen = answers[q.id];
          const isAnswered = chosen !== undefined;
          const isCorrect = chosen === q.correctIndex;

          return (
            <article
              key={q.id}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--text-secondary)]">
                  Q{qi + 1} · {q.level}
                </span>
                {isAnswered ? (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      isCorrect ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        回答正确
                      </>
                    ) : (
                      <>
                        <XCircle className="size-4" aria-hidden="true" />
                        再思考一下
                      </>
                    )}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-2.5 text-base font-semibold text-[var(--text-primary)]">
                {q.question}
              </h3>

              <div className="mt-3 grid gap-2">
                {q.options.map((opt, oi) => {
                  const selected = chosen === oi;
                  const rightOption = oi === q.correctIndex;
                  let cls =
                    'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)]';
                  if (isAnswered) {
                    if (rightOption) {
                      cls =
                        'border-[var(--success)] bg-[var(--success-soft)] text-[var(--text-primary)] font-medium';
                    } else if (selected) {
                      cls =
                        'border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--text-primary)]';
                    }
                  }

                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => handleSelect(q.id, oi)}
                      aria-pressed={selected}
                      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-start text-sm transition ${cls}`}
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-current font-mono text-xs font-semibold">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {isAnswered ? (
                <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-xs leading-relaxed">
                  <p className="text-[var(--text-primary)]">
                    <strong>解析：</strong>
                    {q.explanation}
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenDoc(q.docId)}
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                  >
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    追溯原文：{q.docTitle} →
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

import { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Lightbulb,
  ZoomIn,
} from 'lucide-react';
import { CURRICULUM_STAGES } from '../data/curriculum';

interface LearningPathProps {
  completedLessons: string[];
  onToggleLesson: (lessonId: string) => void;
  onOpenDoc: (docId: string) => void;
  onInspectImage: (src: string, alt: string) => void;
}

export function LearningPath({
  completedLessons,
  onToggleLesson,
  onOpenDoc,
  onInspectImage,
}: LearningPathProps) {
  const [selectedStageId, setSelectedStageId] = useState<string>('all');
  const totalLessons = CURRICULUM_STAGES.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedCount = CURRICULUM_STAGES.reduce(
    (acc, s) => acc + s.lessons.filter((l) => completedLessons.includes(l.id)).length,
    0
  );
  const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  const visibleStages =
    selectedStageId === 'all'
      ? CURRICULUM_STAGES
      : CURRICULUM_STAGES.filter((s) => s.id === selectedStageId);

  return (
    <div className="space-y-6">
      {/* Progress Overview Banner */}
      <section
        aria-labelledby="path-progress-heading"
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="path-progress-heading" className="text-xl font-bold tracking-tight">
              6 阶段新手精通路线图（15 节核心精讲）
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              按官方文档逻辑重新编排：从「为什么建 Ontology」到「语义建模、Action/Functions、反模式避坑与 OSv2 架构」，每节课直连本地官方原版文档与配图。
            </p>
          </div>
          <div className="min-w-44 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-[var(--text-secondary)]">通关进度</span>
              <span className="font-mono font-bold text-[var(--accent)]">
                {completedCount}/{totalLessons} ({pct}%)
              </span>
            </div>
            <progress
              value={completedCount}
              max={totalLessons}
              aria-label="学习路线完成进度"
              className="mt-2 h-2 w-full overflow-hidden rounded-full"
            />
          </div>
        </div>

        {/* Stage Filter Pills */}
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="按阶段筛选课程">
          <button
            type="button"
            onClick={() => setSelectedStageId('all')}
            aria-pressed={selectedStageId === 'all'}
            className={`min-h-9 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              selectedStageId === 'all'
                ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            全部 6 个阶段
          </button>
          {CURRICULUM_STAGES.map((stage) => {
            const doneInStage = stage.lessons.filter((l) =>
              completedLessons.includes(l.id)
            ).length;
            const active = selectedStageId === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedStageId(stage.id)}
                aria-pressed={active}
                className={`min-h-9 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="font-mono opacity-80">{stage.number}</span> {stage.title}{' '}
                <span className="font-mono text-[11px] opacity-80">
                  ({doneInStage}/{stage.lessons.length})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Stages List */}
      <div className="space-y-8">
        {visibleStages.map((stage) => (
          <section key={stage.id} aria-labelledby={`stage-title-${stage.id}`} className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--accent)]">
                    STAGE {stage.number}
                  </span>
                  <h3 id={`stage-title-${stage.id}`} className="text-lg font-bold">
                    {stage.title}
                  </h3>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{stage.goal}</p>
              </div>
            </div>

            <div className="grid gap-5">
              {stage.lessons.map((lesson) => {
                const isDone = completedLessons.includes(lesson.id);
                return (
                  <article
                    key={lesson.id}
                    className={`rounded-2xl border p-5 transition-colors ${
                      isDone
                        ? 'border-[var(--success)]/45 bg-[var(--bg-surface)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-[var(--text-muted)]">
                            #{String(lesson.order).padStart(2, '0')}
                          </span>
                          <span className="rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 font-medium text-[var(--text-secondary)]">
                            {lesson.level}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                            <Clock className="size-3.5" aria-hidden="true" />
                            {lesson.duration}
                          </span>
                          <span className="font-mono text-[var(--text-muted)]">{lesson.enSubtitle}</span>
                        </div>
                        <h4 className="mt-1.5 text-lg font-bold text-[var(--text-primary)]">
                          {lesson.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleLesson(lesson.id)}
                        aria-pressed={isDone}
                        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          isDone
                            ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            <span>已掌握</span>
                          </>
                        ) : (
                          <>
                            <Circle className="size-4" aria-hidden="true" />
                            <span>标记为已掌握</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/25 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]">
                      一句话核心：{lesson.tldr}
                    </p>

                    <div className={`mt-4 grid gap-4 ${lesson.diagram ? 'lg:grid-cols-12' : ''}`}>
                      <div className={`space-y-3 ${lesson.diagram ? 'lg:col-span-7' : ''}`}>
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-sm">
                          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                            <Lightbulb className="size-4" aria-hidden="true" />
                            <span>白话类比</span>
                          </div>
                          <p className="text-[var(--text-secondary)]">{lesson.analogy}</p>
                        </div>

                        <div>
                          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            必须掌握的要点
                          </div>
                          <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                            {lesson.keyPoints.map((kp, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span
                                  aria-hidden="true"
                                  className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                                />
                                <span>{kp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border border-[var(--warning)]/35 bg-[var(--warning-soft)] p-3.5 text-xs">
                          <div className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--warning)]">
                            <AlertTriangle className="size-4" aria-hidden="true" />
                            <span>新手避坑提示</span>
                          </div>
                          <p className="text-[var(--text-primary)] leading-relaxed">{lesson.pitfall}</p>
                        </div>
                      </div>

                      {lesson.diagram ? (
                        <figure className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 lg:col-span-5">
                          <button
                            type="button"
                            onClick={() =>
                              onInspectImage(lesson.diagram!.src, lesson.diagram!.alt)
                            }
                            aria-label={`放大查看配图：${lesson.diagram.caption}`}
                            className="group relative overflow-hidden rounded-lg bg-[var(--bg-surface)] p-2 text-start"
                          >
                            <img
                              src={`./${lesson.diagram.src}`}
                              alt={lesson.diagram.alt}
                              loading="lazy"
                              className="mx-auto max-h-64 w-auto rounded object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--accent)]">
                              <ZoomIn className="size-3.5" aria-hidden="true" />
                              放大查看官方高清图
                            </span>
                          </button>
                          <figcaption className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--text-secondary)]">
                            {lesson.diagram.caption}
                          </figcaption>
                        </figure>
                      ) : null}
                    </div>

                    {/* Direct Source Doc Links */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)]">
                        <BookOpen className="size-3.5" aria-hidden="true" />
                        对应本地官方文档：
                      </span>
                      {lesson.sourceDocs.map((sd) => (
                        <button
                          key={sd.docId}
                          type="button"
                          onClick={() => onOpenDoc(sd.docId)}
                          className="inline-flex min-h-8 items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]/40"
                        >
                          {sd.label} →
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

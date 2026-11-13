import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface AccessibleTabsProps {
  ariaLabel: string;
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  panelBodyClassName?: string;
}

export function AccessibleTabs({
  ariaLabel,
  tabs,
  activeId,
  onChange,
  className = '',
  panelBodyClassName = 'pt-4',
}: AccessibleTabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const activeIndex = tabs.findIndex((t) => t.id === activeId);
    const activeBtn = tabRefs.current[activeIndex];
    if (activeBtn) {
      activeBtn.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeId, tabs]);

  // Sync tab selection if browser find-in-page reveals a hidden="until-found" panel
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    panelRefs.current.forEach((panel, index) => {
      if (!panel) return;
      const tab = tabs[index];
      if (!tab) return;
      const onBeforeMatch = () => {
        onChange(tab.id);
      };
      panel.addEventListener('beforematch', onBeforeMatch);
      cleanups.push(() => panel.removeEventListener('beforematch', onBeforeMatch));
    });
    return () => cleanups.forEach((fn) => fn());
  }, [tabs, onChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const currentIdx = tabs.findIndex((t) => t.id === activeId);
    if (currentIdx === -1) return;

    let nextIdx = -1;
    if (e.key === 'ArrowRight') {
      nextIdx = (currentIdx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = tabs.length - 1;
    }

    if (nextIdx !== -1) {
      e.preventDefault();
      const nextTab = tabs[nextIdx];
      onChange(nextTab.id);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        className="tabs-bar"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          const tabDomId = `${baseId}-tab-${tab.id}`;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={tabDomId}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className="tab-btn"
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className="rounded-md bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeId;
          const tabDomId = `${baseId}-tab-${tab.id}`;
          return (
            <div
              key={tab.id}
              ref={(el) => {
                panelRefs.current[index] = el;
                if (el) {
                  if (selected) {
                    el.removeAttribute('hidden');
                  } else {
                    el.setAttribute('hidden', 'until-found');
                  }
                }
              }}
              role="tabpanel"
              aria-labelledby={tabDomId}
              tabIndex={selected ? 0 : undefined}
              className="col-start-1 row-start-1 min-w-0"
            >
              {/* Inner wrapper avoids hidden="until-found" empty strip issue */}
              <div className={panelBodyClassName}>{tab.content}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

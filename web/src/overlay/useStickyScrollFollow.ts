import { type UIEventHandler, useCallback, useLayoutEffect, useRef, useState, type WheelEventHandler } from 'react';

export type ScrollMode = 'following' | 'detached';

type UseStickyScrollFollowOptions = {
  enabled?: boolean;
  contentVersion?: string | number;
  resetKey?: string | number;
  attachThresholdPx?: number;
};

function maxScrollTop(container: HTMLElement): number {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

function distanceFromBottom(container: HTMLElement): number {
  return maxScrollTop(container) - container.scrollTop;
}

export function useStickyScrollFollow({
  enabled = true,
  contentVersion,
  resetKey,
  attachThresholdPx = 24,
}: UseStickyScrollFollowOptions) {
  const [mode, setMode] = useState<ScrollMode>('following');
  const containerRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const previousContentVersionRef = useRef<string | number | undefined>(undefined);
  const previousResetKeyRef = useRef<string | number | undefined>(resetKey);
  const programmaticRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    programmaticRef.current = true;
    container.scrollTo({ top: maxScrollTop(container), behavior: 'auto' });
    window.requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
  }, []);

  const jumpToLatest = useCallback(() => {
    setMode('following');
    scrollToBottom();
  }, [scrollToBottom]);

  const onWheel = useCallback<WheelEventHandler<HTMLDivElement>>((event) => {
    if (!enabled || programmaticRef.current) return;
    if (event.deltaY < 0) {
      setMode('detached');
    }
  }, [enabled]);

  const onScroll = useCallback<UIEventHandler<HTMLDivElement>>((event) => {
    if (!enabled || programmaticRef.current) return;
    if (distanceFromBottom(event.currentTarget) <= attachThresholdPx) {
      setMode('following');
    }
  }, [attachThresholdPx, enabled]);

  useLayoutEffect(() => {
    if (previousResetKeyRef.current === resetKey) return;
    previousResetKeyRef.current = resetKey;
    setMode('following');
    scrollToBottom();
  }, [resetKey, scrollToBottom]);

  useLayoutEffect(() => {
    if (!enabled || mode !== 'following') {
      previousContentVersionRef.current = contentVersion;
      return;
    }
    if (previousContentVersionRef.current === contentVersion) return;
    previousContentVersionRef.current = contentVersion;
    scrollToBottom();
  }, [contentVersion, enabled, mode, scrollToBottom]);

  useLayoutEffect(() => {
    if (!enabled || mode !== 'following' || !tailRef.current || typeof MutationObserver === 'undefined') return;
    const timeline = tailRef.current.parentElement;
    if (!(timeline instanceof HTMLElement)) return;
    const observer = new MutationObserver(() => scrollToBottom());
    observer.observe(timeline, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [enabled, mode, scrollToBottom]);

  return { containerRef, tailRef, mode, jumpToLatest, onScroll, onWheel, scrollToBottom };
}

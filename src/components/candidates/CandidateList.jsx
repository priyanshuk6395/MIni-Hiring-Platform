import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ReactWindow from 'react-window'; // Import namespace for safety
import { CANDIDATE_STAGES } from '../../db';

export const CandidateList = ({ candidates, navigate }) => {
  // Try to pick up FixedSizeList synchronously from the namespace import.
  const initialList =
    ReactWindow.FixedSizeList ||
    (ReactWindow.default && ReactWindow.default.FixedSizeList) ||
    null;

  const [ListComponent, setListComponent] = useState(initialList);
  const [loadingList, setLoadingList] = useState(!initialList);

  // Container ref + width state — pass numeric width to FixedSizeList to avoid
  // measurement/layout loops with dnd-kit.
  const containerRef = useRef(null);
  const [listWidth, setListWidth] = useState(0);

  useEffect(() => {
    // Measure initial width and listen for resize via ResizeObserver.
    const el = containerRef.current;
    const measure = () => {
      const w = el?.clientWidth || 0;
      if (w && w !== listWidth) setListWidth(w);
    };

    measure();

    let ro;
    if (typeof ResizeObserver !== 'undefined' && el) {
      ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(el);
    } else {
      // Fallback to window resize
      const onResize = () => measure();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    return () => {
      if (ro && el) ro.unobserve(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  useEffect(() => {
    if (ListComponent) return; // no-op if already resolved

    let mounted = true;
    setLoadingList(true);

    // Dynamic import as a fallback to handle Vite/interop variations
    import('react-window')
      .then((mod) => {
        const comp = mod.FixedSizeList || (mod.default && mod.default.FixedSizeList);
        if (mounted && comp) {
          setListComponent(() => comp);
        }
      })
      .catch(() => {
        // ignore - we'll fall back to non-virtualized rendering below
      })
      .finally(() => {
        if (mounted) setLoadingList(false);
      });

    return () => {
      mounted = false;
    };
    // run once
  }, []); // <-- changed to run only once

  // Memoize row renderer so its identity is stable between renders
  const Row = useCallback(
    ({ index, style }) => {
      const candidate = candidates[index];
      const stage = CANDIDATE_STAGES.find((s) => s.id === candidate.stage);

      return (
        <div style={style} className="border-b border-gray-200">
          <div className="flex items-center p-4 hover:bg-gray-50">
            <img
              src={candidate.avatarUrl}
              alt={candidate.name}
              className="h-10 w-10 rounded-full"
            />
            <div className="ml-4 flex-grow">
              <a
                href={`#/candidates/${candidate.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/candidates/${candidate.id}`);
                }}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                {candidate.name}
              </a>
              <p className="text-sm text-gray-500">{candidate.email}</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {stage?.title || 'Unknown'}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                Applied: {new Date(candidate.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      );
    },
    [candidates, navigate]
  );

  const listHeight = 600;

  // If ListComponent loaded, use virtualized list (pass numeric width)
  if (ListComponent) {
    const VirtualList = ListComponent;
    // If we haven't measured the width yet, show a placeholder to avoid
    // passing 0 width which can trigger repeated measurements.
    const widthToUse = listWidth || undefined;

    return (
      <div ref={containerRef} className="bg-white rounded-lg shadow border border-gray-200">
        {widthToUse ? (
          <VirtualList
            height={listHeight}
            itemCount={candidates.length}
            itemSize={73} // 72px for row + 1px for border
            width={widthToUse}
          >
            {Row}
          </VirtualList>
        ) : (
          // lightweight placeholder while we measure container width
          <div className="p-6 flex items-center justify-center">
            <svg
              className="animate-spin h-6 w-6 text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }

  // While attempting to load, show a lightweight spinner/placeholder (optional)
  if (loadingList) {
    return (
      <div ref={containerRef} className="bg-white rounded-lg shadow border border-gray-200 p-6 flex items-center justify-center">
        <svg
          className="animate-spin h-6 w-6 text-indigo-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    );
  }

  // Final fallback: non-virtualized list to avoid crashing the app
  return (
    <div ref={containerRef} className="bg-white rounded-lg shadow border border-gray-200">
      {candidates.map((candidate) => {
        const stage = CANDIDATE_STAGES.find((s) => s.id === candidate.stage);
        return (
          <div key={candidate.id} className="border-b border-gray-200">
            <div className="flex items-center p-4 hover:bg-gray-50">
              <img
                src={candidate.avatarUrl}
                alt={candidate.name}
                className="h-10 w-10 rounded-full"
              />
              <div className="ml-4 flex-grow">
                <a
                  href={`#/candidates/${candidate.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/candidates/${candidate.id}`);
                  }}
                  className="text-sm font-medium text-indigo-600 hover:underline"
                >
                  {candidate.name}
                </a>
                <p className="text-sm text-gray-500">{candidate.email}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {stage?.title || 'Unknown'}
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Applied: {new Date(candidate.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
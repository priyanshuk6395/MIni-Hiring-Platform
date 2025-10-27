import React, { useMemo } from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CANDIDATE_STAGES, STAGE_IDS } from '../../db';

export const CandidateKanban = ({ candidates, navigate, activeCandidate }) => {
  
  // Group candidates by stage for rendering columns
  const candidatesByStage = useMemo(() => {
    const grouped = {};
    STAGE_IDS.forEach(stageId => { grouped[stageId] = []; });
    candidates.forEach(c => {
      if (grouped[c.stage]) {
        grouped[c.stage].push(c);
      }
    });
    return grouped;
  }, [candidates]);
  
  return (
    <>
      <div className="flex space-x-4 overflow-x-auto custom-scrollbar p-4 bg-gray-50 h-full">
        <SortableContext items={STAGE_IDS} >
          {CANDIDATE_STAGES.map(stage => (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.title}
              candidates={candidatesByStage[stage.id]}
              navigate={navigate}
            />
          ))}
        </SortableContext>
      </div>
      
      <DragOverlay>
        {activeCandidate ? (
          <div className="shadow-2xl">
            <KanbanCard candidate={activeCandidate} navigate={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </>
  );
};
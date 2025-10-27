import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { KanbanCard } from './KanbanCard';

export const KanbanColumn = ({ id, title, candidates, navigate }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className="w-72 flex-shrink-0 bg-gray-100 rounded-lg p-3"
    >
      <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">
        {title.toUpperCase()} ({candidates.length})
      </h3>
      <SortableContext
        items={candidates.map(c => c.id)}
        strategy={verticalListSortingStrategy}
        id={id}
      >
        <div className="h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar pr-1">
          {candidates.map(c => (
            <KanbanCard key={c.id} candidate={c} navigate={navigate} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const KanbanCard = ({ candidate, navigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-white p-3 rounded-md shadow-sm border border-gray-200 mb-2 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center space-x-2">
        <img 
          src={candidate.avatarUrl} 
          alt={candidate.name}
          className="h-8 w-8 rounded-full"
        />
        <div>
          <a
            href={`#/candidates/${candidate.id}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/candidates/${candidate.id}`);
            }}
            className="text-sm font-medium text-gray-800 hover:underline"
          >
            {candidate.name}
          </a>
          <p className="text-xs text-gray-500">{candidate.email}</p>
        </div>
      </div>
    </div>
  );
};
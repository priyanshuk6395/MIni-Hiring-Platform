import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/Button';
import { GripVertical } from 'lucide-react';

export const JobListItem = ({ job, navigate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  const statusColor =
    job.status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center bg-white shadow-sm rounded-lg p-4 border border-gray-200"
    >
      <Button
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </Button>
      <div className="ml-4 flex-grow">
        <a
          href={`#/jobs/${job.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/jobs/${job.slug}`);
          }}
          className="text-lg font-semibold text-indigo-600 hover:underline"
        >
          {job.title}
        </a>
        <div className="text-sm text-gray-500">
          Created: {new Date(job.createdAt).toLocaleDateString()}
        </div>
        <div className="mt-2 flex space-x-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
          >
            {job.status}
          </span>
          {job.tags?.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={() => navigate(`/jobs/${job.slug}`)}
      >
        Manage
      </Button>
    </div>
  );
};
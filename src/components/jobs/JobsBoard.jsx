import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { JobListItem } from './JobListItem';
import { Spinner } from '../ui/Spinner';

export const JobsBoard = ({ jobs, navigate, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-lg shadow-sm">
        <h3 className="text-xl font-medium text-gray-700">No jobs found</h3>
        <p className="text-gray-500 mt-1">Try adjusting your filters or create a new job.</p>
      </div>
    );
  }

  return (
    <SortableContext
      items={jobs.map((j) => j.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-4">
        {jobs.map((job) => (
          <JobListItem
            key={job.id}
            job={job}
            navigate={navigate}
          />
        ))}
      </div>
    </SortableContext>
  );
};
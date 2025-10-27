import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useToasts } from '../hooks/useToasts';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Pagination } from '../components/ui/Pagination';
import { JobFormModal } from '../components/jobs/JobFormModal';
import { JobsBoard } from '../components/jobs/JobsBoard';
import { JobListItem } from '../components/jobs/JobListItem';
import { Plus, Search } from 'lucide-react';

export const JobsPage = ({ navigate }) => {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    page: 1,
  });
  
  const debouncedSearch = useDebounce(filters.search, 300);
  const { addToast } = useToasts();
  
  const [activeJob, setActiveJob] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const fetchJobs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        status: filters.status,
        page: page,
        pageSize: 10,
        sort: 'order',
      });
      const res = await fetch(`/jobs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters.status, addToast]);

  useEffect(() => {
    fetchJobs(filters.page);
  }, [fetchJobs, filters.page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveJob(jobs.find((j) => j.id === active.id));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveJob(null);

    if (over && active.id !== over.id) {
      const oldIndex = jobs.findIndex((j) => j.id === active.id);
      const newIndex = jobs.findIndex((j) => j.id === over.id);

      const newJobsArray = arrayMove(jobs, oldIndex, newIndex);
      
      const newJobsWithOrder = newJobsArray.map((job, index) => ({
        ...job,
        order: (filters.page - 1) * 10 + index, // Recalculate order based on page
      }));
      
      const apiPayload = newJobsWithOrder.map(j => ({ id: j.id, order: j.order }));
      const originalJobs = [...jobs];

      setJobs(newJobsWithOrder);

      try {
        const res = await fetch('/jobs/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedJobs: apiPayload }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'API Reorder failed');
        }
        
        addToast('Job order saved!', 'success');
        
      } catch (error) {
        addToast(`Error: ${error.message}. Reverting changes.`, 'error');
        setJobs(originalJobs);
      }
    }
  };

  const onJobCreated = () => {
    setIsModalOpen(false);
    fetchJobs(1);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Jobs Board</h1>
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Create Job
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow-sm">
        <Input
          name="search"
          placeholder="Search by title..."
          icon={Search}
          value={filters.search}
          onChange={handleFilterChange}
        />
        <Select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <JobsBoard
          jobs={jobs}
          navigate={navigate}
          isLoading={isLoading}
        />
        <DragOverlay>
          {activeJob ? (
            <div className="shadow-2xl">
              <JobListItem job={activeJob} navigate={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!isLoading && pagination && (
        <div className="mt-8">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setFilters(prev => ({...prev, page}))}
          />
        </div>
      )}

      <JobFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJobCreated={onJobCreated}
      />
    </div>
  );
};

export default JobsPage;
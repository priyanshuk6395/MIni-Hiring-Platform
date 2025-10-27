import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useToasts } from '../hooks/useToasts';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { CandidateList } from '../components/candidates/CandidateList';
import { CandidateKanban } from '../components/candidates/CandidateKanban';
import { CandidateFormModal } from '../components/candidates/CandidateFormModal';
import { Plus, Search } from 'lucide-react';
import { CANDIDATE_STAGES, STAGE_IDS } from '../db';

export const CandidatesPage = ({ navigate }) => {
  const [view, setView] = useState('list'); // 'list' or 'kanban'
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToasts();
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const [activeCandidate, setActiveCandidate] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const fetchAllCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/candidates?page=1&pageSize=1000');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      const data = await res.json();
      setCandidates(data.candidates);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAllCandidates();
  }, [fetchAllCandidates]);
  
  const onCandidateCreated = () => {
    setIsModalOpen(false);
    fetchAllCandidates();
  };
  
  const filteredCandidates = useMemo(() => {
    const lowerSearch = debouncedSearch.toLowerCase();
    return candidates.filter(c => {
      const nameMatch = c.name.toLowerCase().includes(lowerSearch);
      const emailMatch = c.email.toLowerCase().includes(lowerSearch);
      return nameMatch || emailMatch;
    });
  }, [candidates, debouncedSearch]);

  // --- D&D Handlers for Kanban ---
  const findContainer = (id) => {
    if (STAGE_IDS.includes(id)) return id;
    return candidates.find(c => c.id === id)?.stage;
  };
  
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveCandidate(candidates.find(c => c.id === active.id));
  };
  
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }
    
    setCandidates(prev => {
      const activeIndex = prev.findIndex(c => c.id === active.id);
      if (activeIndex === -1) return prev;
      prev[activeIndex].stage = overContainer;
      return [...prev];
    });
  };
  
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCandidate(null);
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    const activeContainer = findContainer(activeId);
    let overContainer = findContainer(overId);
    
    if (overContainer) {
        // Dropped on a column
    } else if (candidates.find(c => c.id === overId)) {
        // Dropped on another card
        overContainer = findContainer(overId);
    } else {
        // Invalid drop
        return;
    }

    const originalCandidate = candidates.find(c => c.id === activeId);
    if (!originalCandidate) return;
    
    const oldStage = originalCandidate.stage;
    const newStage = overContainer;

    if (oldStage === newStage) return;

    // Optimistic update already happened in handleDragOver
    // Here we just finalize and make the API call
    
    try {
      const res = await fetch(`/candidates/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'API call failed');
      }
      
      addToast(`${originalCandidate.name} moved to ${CANDIDATE_STAGES.find(s=>s.id === newStage).title}`, 'success');
      
    } catch (error) {
      addToast(`Error: ${error.message}. Reverting stage change.`, 'error');
      setCandidates(prev => 
        prev.map(c => 
          c.id === activeId ? { ...c, stage: oldStage } : c
        )
      );
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Add Candidate
        </Button>
      </div>
      
      <div className="mb-4 p-4 bg-white rounded-lg shadow-sm flex justify-between items-center">
        <div className="w-1/2">
          <Input
            name="search"
            placeholder="Client-side search by name/email..."
            icon={Search}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex rounded-md shadow-sm">
           <Button 
            onClick={() => setView('list')}
            variant={view === 'list' ? 'primary' : 'secondary'}
            className="rounded-r-none"
          >
            List
          </Button>
          <Button 
            onClick={() => setView('kanban')}
            variant={view === 'kanban' ? 'primary' : 'secondary'}
            className="rounded-l-none"
          >
            Kanban
          </Button>
        </div>
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      )}
      
      {!isLoading && view === 'list' && (
        <CandidateList 
          candidates={filteredCandidates} 
          navigate={navigate} 
        />
      )}
      
      {!isLoading && view === 'kanban' && (
        <div className="flex-grow">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <CandidateKanban 
              candidates={filteredCandidates}
              navigate={navigate} 
              activeCandidate={activeCandidate}
            />
          </DndContext>
        </div>
      )}

      <CandidateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCandidateCreated={onCandidateCreated}
      />
    </div>
  );
};

export default CandidatesPage;
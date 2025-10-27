import React, { useState, useEffect } from 'react';
import { useToasts } from '../hooks/useToasts';
import { db } from '../db';
import { Spinner } from '../components/ui/Spinner';
import { ChevronLeft, FileText } from 'lucide-react';

export const CandidateDetailPage = ({ id, navigate }) => {
  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToasts();
  
  useEffect(() => {
    const fetchCandidate = async () => {
      setIsLoading(true);
      try {
        const cand = await db.candidates.get(parseInt(id, 10));
        if (!cand) throw new Error('Candidate not found');
        setCandidate(cand);
        
        const res = await fetch(`/candidates/${id}/timeline`);
        if (!res.ok) throw new Error('Failed to fetch timeline');
        const tl = await res.json();
        setTimeline(tl);
        
      } catch (error) {
        addToast(error.message, 'error');
        navigate('/candidates');
      } finally {
        setIsLoading(false);
      }
    }
    fetchCandidate();
  }, [id, navigate, addToast]);
  
  if (isLoading) {
    return <div className="p-8 flex justify-center"><Spinner /></div>;
  }
  
  if (!candidate) return null;

  return (
    <div className="p-8">
      <a href="#/candidates" onClick={e => { e.preventDefault(); navigate('/candidates')}} className="text-sm text-indigo-600 hover:underline flex items-center mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Candidates
      </a>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4">
          <img src={candidate.avatarUrl} alt={candidate.name} className="h-20 w-20 rounded-full" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{candidate.name}</h1>
            <p className="text-lg text-gray-600">{candidate.email}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Timeline</h2>
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {timeline.map((item, itemIdx) => (
              <li key={item.id}>
                <div className="relative pb-8">
                  {itemIdx !== timeline.length - 1 ? (
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          {item.event} - <span className="font-medium text-gray-900">{item.notes}</span>
                        </p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        <time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetailPage;
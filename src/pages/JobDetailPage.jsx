import React, { useState, useEffect } from 'react';
import { useToasts } from '../hooks/useToasts';
import { db } from '../db';
import { Spinner } from '../components/ui/Spinner';
import { ChevronLeft } from 'lucide-react';
import { AssessmentBuilder } from '../components/assessments/AssessmentBuilder';

export const JobDetailPage = ({ slug, navigate }) => {
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToasts();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        // Use Dexie directly to get job by slug
        const matchingJob = await db.jobs.where('slug').equals(slug).first();
        
        if (matchingJob) {
          setJob(matchingJob);
        } else {
          throw new Error('Job not found');
        }
      } catch (error) {
        addToast(error.message, 'error');
        navigate('/jobs');
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [slug, addToast, navigate]);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Spinner /></div>;
  }
  
  if (!job) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-white">
        <a href="#/jobs" onClick={e => { e.preventDefault(); navigate('/jobs')}} className="text-sm text-indigo-600 hover:underline flex items-center mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Jobs
        </a>
        <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
      </div>
      
      <AssessmentBuilder jobId={job.id} />
    </div>
  );
};

export default JobDetailPage;
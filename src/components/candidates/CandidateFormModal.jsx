import React, { useState, useEffect } from 'react';
import { useToasts } from '../../hooks/useToasts';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

export const CandidateFormModal = ({ isOpen, onClose, onCandidateCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobId, setJobId] = useState('');
  
  const [jobs, setJobs] = useState([]); // To populate the dropdown
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { addToast } = useToasts();

  // Fetch active jobs when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchActiveJobs = async () => {
        try {
          // Fetch all active jobs for the assignment dropdown
          const res = await fetch('/jobs?status=active&pageSize=1000');
          if (!res.ok) throw new Error('Failed to fetch jobs');
          const data = await res.json();
          setJobs(data.jobs);
          // Default to the first job if available
          if (data.jobs.length > 0) {
            setJobId(data.jobs[0].id);
          }
        } catch (error) {
          addToast(error.message, 'error');
        }
      };
      fetchActiveJobs();
    }
  }, [isOpen, addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // Validation
    let newErrors = {};
    if (!name) newErrors.name = 'Name is required';
    if (!email) newErrors.email = 'Email is required';
    if (!jobId) newErrors.jobId = 'A job must be selected';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    const newCandidate = {
      name,
      email,
      jobId: parseInt(jobId, 10),
    };

    try {
      const res = await fetch('/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCandidate),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create candidate');
      }

      addToast('Candidate created successfully!', 'success');
      onCandidateCreated(); // Call callback to refresh list
      
      // Reset form
      setName('');
      setEmail('');
      setJobId(jobs.length > 0 ? jobs[0].id : '');
      
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Candidate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Jane Doe"
          error={errors.name}
          required
        />
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g., jane.doe@example.com"
          error={errors.email}
          required
        />
        <Select
          label="Assign to Job"
          name="jobId"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          error={errors.jobId}
          required
        >
          <option value="" disabled>Select a job...</option>
          {jobs.map(job => (
            <option key={job.id} value={job.id}>{job.title}</option>
          ))}
        </Select>
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} disabled={isLoading}>
            Add Candidate
          </Button>
        </div>
      </form>
    </Modal>
  );
};
import React, { useState } from 'react';
import { useToasts } from '../../hooks/useToasts';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

// Simple slugify
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text

export const JobFormModal = ({ isOpen, onClose, onJobCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { addToast } = useToasts();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!title) {
      setErrors({ title: 'Title is required' });
      return;
    }

    setIsLoading(true);
    const newJob = {
      title,
      slug: slugify(title),
      description,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      const res = await fetch('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create job');
      }

      addToast('Job created successfully!', 'success');
      onJobCreated();
      // Reset form
      setTitle('');
      setDescription('');
      setTags('');
      
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Job Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Senior React Engineer"
          error={errors.title}
          required
        />
        <Textarea
          label="Description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
        <Input
          label="Tags (comma-separated)"
          name="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., React, Remote, TypeScript"
        />
        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} disabled={isLoading}>
            Create Job
          </Button>
        </div>
      </form>
    </Modal>
  );
};
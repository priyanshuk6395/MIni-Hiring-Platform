import React, { useState, useEffect, useMemo } from 'react';
import { useToasts } from '../../hooks/useToasts';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { AssessmentForm } from './AssessmentForm';
import { AssessmentQuestionEditor } from './AssessmentQuestionEditor';
import { Plus, Save, Eye, Settings2, Trash2 } from 'lucide-react';

export const AssessmentBuilder = ({ jobId }) => {
  const [assessment, setAssessment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { addToast } = useToasts();
  
  const [previewResponses, setPreviewResponses] = useState({});
  const [previewErrors, setPreviewErrors] = useState({});

  useEffect(() => {
    const fetchAssessment = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/assessments/${jobId}`);
        if (!res.ok) throw new Error('Failed to load assessment');
        const data = await res.json();
        setAssessment(data);
      } catch (error) {
        addToast(error.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessment();
  }, [jobId, addToast]);
  
  // --- Builder Mutators ---
  
  const genId = () => `id_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;

  const updateAssessment = (field, value) => {
    setAssessment(prev => ({ ...prev, [field]: value }));
  };
  
  const addSection = () => {
    const newSection = {
      id: genId(),
      title: 'New Section',
      description: '',
      questions: []
    };
    setAssessment(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };
  
  const updateSection = (sectionId, updates) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      )
    }));
  };

  const removeSection = (sectionId) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };
  
  const addQuestion = (sectionId) => {
    const newQuestion = {
      id: genId(),
      type: 'short-text',
      label: 'New Question',
      required: false,
    };
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, questions: [...s.questions, newQuestion] }
          : s
      )
    }));
  };
  
  const updateQuestion = (sectionId, questionId, updates) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId
          ? { ...s, questions: s.questions.map(q => 
              q.id === questionId ? { ...q, ...updates } : q
            )}
          : s
      )
    }));
  };
  
  const removeQuestion = (sectionId, questionId) => {
    setAssessment(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId
          ? { ...s, questions: s.questions.filter(q => q.id !== questionId) }
          : s
      )
    }));
  };
  
  const allQuestions = useMemo(() => {
    return assessment?.sections.flatMap(s => s.questions) || [];
  }, [assessment]);
  
  // --- Save Handler ---
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/assessments/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save');
      }
      addToast('Assessment saved successfully!', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // --- Preview Validation (Client-side) ---
  const isQuestionVisible = (question, responses) => {
    if (!question.condition || !question.condition.questionId) return true;
    const { questionId, operator, value } = question.condition;
    const targetResponse = responses[questionId];
    if (!targetResponse) return false;
    switch (operator) {
      case 'eq': return Array.isArray(targetResponse) ? targetResponse.includes(value) : targetResponse === value;
      case 'neq': return Array.isArray(targetResponse) ? !targetResponse.includes(value) : targetResponse !== value;
      case 'contains': return Array.isArray(targetResponse) ? targetResponse.includes(value) : String(targetResponse).includes(value);
      default: return true;
    }
  };

  const validatePreview = () => {
    const errors = {};
    for (const q of allQuestions) {
      const isVisible = isQuestionVisible(q, previewResponses);
      if (q.required && isVisible) {
        const value = previewResponses[q.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          errors[q.id] = 'This field is required';
        }
      }
      
      if (q.type === 'numeric' && previewResponses[q.id] != null) {
        const num = parseFloat(previewResponses[q.id]);
        if (q.min != null && num < q.min) {
          errors[q.id] = `Must be at least ${q.min}`;
        }
        if (q.max != null && num > q.max) {
          errors[q.id] = `Must be at most ${q.max}`;
        }
      }
    }
    setPreviewErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  if (isLoading) {
    return <div className="p-8 flex justify-center items-center h-64"><Spinner /></div>;
  }

  return (
    <div className="h-full">
      <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
        <Input
          name="title"
          value={assessment.title}
          onChange={e => updateAssessment('title', e.target.value)}
          className="text-xl font-semibold !border-none !shadow-none focus:!ring-0"
        />
        <div className="flex space-x-2">
          {/* Toggle Builder/Preview */}
          <div className="flex rounded-md shadow-sm">
             <Button 
              onClick={() => setPreviewMode(false)}
              variant={!previewMode ? 'primary' : 'secondary'}
              className="rounded-r-none"
              icon={Settings2}
            >
              Builder
            </Button>
            <Button 
              onClick={() => setPreviewMode(true)}
              variant={previewMode ? 'primary' : 'secondary'}
              className="rounded-l-none"
              icon={Eye}
            >
              Preview
            </Button>
          </div>
          
          <Button icon={Save} loading={isSaving} onClick={handleSave}>
            Save Assessment
          </Button>
        </div>
      </div>

      <div className="h-[calc(100vh-264px)] overflow-y-auto custom-scrollbar bg-gray-100 p-8"> {/* Adjusted height */}
        {previewMode ? (
          // --- Preview Pane ---
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg">
            <AssessmentForm 
              assessment={assessment}
              responses={previewResponses}
              setResponses={setPreviewResponses}
              errors={previewErrors}
            />
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button onClick={() => {
                if(validatePreview()) {
                  addToast('Preview submitted successfully! (No data saved)', 'success')
                } else {
                  addToast('Please fix validation errors', 'error')
                }
              }}>
                Submit (Preview)
              </Button>
            </div>
          </div>
        ) : (
          // --- Builder Pane ---
          <div className="max-w-3xl mx-auto space-y-6">
            {assessment.sections.map((section) => (
              <div key={section.id} className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <Input 
                    name="sectionTitle"
                    value={section.title}
                    onChange={e => updateSection(section.id, { title: e.target.value })}
                    className="text-lg font-medium !border-none !shadow-none focus:!ring-0 -ml-3"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSection(section.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <Textarea
                  name="sectionDescription"
                  value={section.description}
                  onChange={e => updateSection(section.id, { description: e.target.value })}
                  placeholder="Section description (optional)"
                  rows={2}
                  className="mb-4"
                />
                
                <div className="space-y-4">
                  {section.questions.map((q) => (
                    <AssessmentQuestionEditor
                      key={q.id}
                      question={q}
                      updateQuestion={(updates) => updateQuestion(section.id, q.id, updates)}
                      removeQuestion={() => removeQuestion(section.id, q.id)}
                      allQuestions={allQuestions}
                    />
                  ))}
                </div>
                
                <Button 
                  icon={Plus} 
                  variant="secondary" 
                  onClick={() => addQuestion(section.id)}
                  className="mt-6"
                >
                  Add Question
                </Button>
              </div>
            ))}
            
            <Button 
              icon={Plus} 
              variant="secondary" 
              onClick={addSection}
              className="w-full border-dashed"
            >
              Add Section
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
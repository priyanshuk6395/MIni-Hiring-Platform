import React from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { UploadCloud } from 'lucide-react';

// Renamed from AssessmentRuntime
export const AssessmentForm = ({ assessment, responses, setResponses, errors, readOnly = false }) => {
  
  const handleResponseChange = (id, value) => {
    if (readOnly) return;
    setResponses(prev => ({ ...prev, [id]: value }));
  };
  
  const handleMultiChoiceChange = (id, option, checked) => {
    if (readOnly) return;
    const current = responses[id] || [];
    let newValues;
    if (checked) {
      newValues = [...current, option];
    } else {
      newValues = current.filter(item => item !== option);
    }
    handleResponseChange(id, newValues);
  };
  
  // Check conditional logic
  const isQuestionVisible = (question) => {
    if (!question.condition || !question.condition.questionId) {
      return true;
    }
    
    const { questionId, operator, value } = question.condition;
    const targetResponse = responses[questionId];
    
    if (!targetResponse) return false;
    
    switch (operator) {
      case 'eq':
        return Array.isArray(targetResponse) 
          ? targetResponse.includes(value)
          : targetResponse === value;
      case 'neq':
        return Array.isArray(targetResponse)
          ? !targetResponse.includes(value)
          : targetResponse !== value;
      case 'contains':
        return Array.isArray(targetResponse) 
          ? targetResponse.includes(value) 
          : String(targetResponse).includes(value);
      default:
        return true;
    }
  };
  
  // Render a single question based on its type
  const renderQuestion = (q) => {
    const value = responses[q.id];
    const error = errors[q.id];
    
    switch (q.type) {
      case 'short-text':
        return <Input 
                  name={q.id} 
                  value={value || ''} 
                  onChange={e => handleResponseChange(q.id, e.target.value)} 
                  error={error}
                  disabled={readOnly}
                />;
      case 'long-text':
        return <Textarea 
                  name={q.id} 
                  value={value || ''} 
                  onChange={e => handleResponseChange(q.id, e.target.value)} 
                  rows={4}
                  error={error}
                  disabled={readOnly}
                />;
      case 'numeric':
        return <Input 
                  type="number"
                  name={q.id} 
                  value={value ?? ''} 
                  onChange={e => handleResponseChange(q.id, e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                  min={q.min}
                  max={q.max}
                  error={error}
                  disabled={readOnly}
                />;
      case 'single-choice':
        return <div className="space-y-2">
          {q.options.map(opt => (
            <div key={opt} className="flex items-center">
              <input 
                type="radio" 
                id={`${q.id}-${opt}`}
                name={q.id} 
                value={opt}
                checked={value === opt}
                onChange={e => handleResponseChange(q.id, e.target.value)}
                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                disabled={readOnly}
              />
              <label htmlFor={`${q.id}-${opt}`} className="ml-2 block text-sm text-gray-700">{opt}</label>
            </div>
          ))}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>;
      case 'multi-choice':
        return <div className="space-y-2">
          {q.options.map(opt => (
            <div key={opt} className="flex items-center">
              <input 
                type="checkbox" 
                id={`${q.id}-${opt}`}
                name={q.id} 
                value={opt}
                checked={value?.includes(opt) || false}
                onChange={e => handleMultiChoiceChange(q.id, opt, e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                disabled={readOnly}
              />
              <label htmlFor={`${q.id}-${opt}`} className="ml-2 block text-sm text-gray-700">{opt}</label>
            </div>
          ))}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>;
      case 'file':
        return <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label htmlFor={q.id} className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                <span>Upload a file</span>
                <input id={q.id} name={q.id} type="file" className="sr-only" disabled={readOnly} />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">File upload is stubbed</p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      default:
        return <p className="text-red-500">Unknown question type: {q.type}</p>
    }
  }

  return (
    <div className="space-y-8 p-4">
      <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
      {assessment.sections?.map(section => (
        <div key={section.id} className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{section.title}</h3>
            {section.description && <p className="mt-1 text-sm text-gray-500">{section.description}</p>}
          </div>
          
          <div className="space-y-6">
            {section.questions.filter(isQuestionVisible).map(q => (
              <div key={q.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderQuestion(q)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Trash2 } from 'lucide-react';
import { QUESTION_TYPES } from '../../db';

export const AssessmentQuestionEditor = ({ question, updateQuestion, removeQuestion, allQuestions }) => {
  const [optionsText, setOptionsText] = useState(
    question.options?.join('\n') || ''
  );

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    const updates = { type: newType };
    if (newType === 'single-choice' || newType === 'multi-choice') {
      updates.options = question.options || ['Option 1', 'Option 2'];
      setOptionsText(updates.options.join('\n'));
    } else {
      delete updates.options;
    }
    
    if (newType === 'numeric') {
      updates.min = 0;
      updates.max = 100;
    } else {
      delete updates.min;
      delete updates.max;
    }
    
    if (newType === 'long-text') {
      updates.maxLength = 500;
    } else {
      delete updates.maxLength;
    }
    
    updateQuestion(updates);
  };
  
  const handleOptionsChange = (e) => {
    setOptionsText(e.target.value);
    updateQuestion({ options: e.target.value.split('\n').filter(Boolean) });
  };
  
  const handleConditionChange = (field, value) => {
    updateQuestion({
      condition: {
        ...(question.condition || {}),
        [field]: value
      }
    });
  };

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-800">Question: {question.id.substring(0, 6)}...</h4>
        <Button
          variant="ghost"
          size="icon"
          onClick={removeQuestion}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Label & Type */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Input
            label="Question Label"
            value={question.label || ''}
            onChange={(e) => updateQuestion({ label: e.target.value })}
          />
        </div>
        <Select
          label="Question Type"
          value={question.type}
          onChange={handleTypeChange}
        >
          {QUESTION_TYPES.map(qt => (
            <option key={qt.id} value={qt.id}>{qt.name}</option>
          ))}
        </Select>
      </div>
      
      {/* Required Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id={`required-${question.id}`}
          checked={question.required || false}
          onChange={(e) => updateQuestion({ required: e.target.checked })}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor={`required-${question.id}`} className="ml-2 block text-sm text-gray-900">
          Required
        </label>
      </div>

      {/* Type-specific options */}
      {(question.type === 'single-choice' || question.type === 'multi-choice') && (
        <Textarea
          label="Options (one per line)"
          value={optionsText}
          onChange={handleOptionsChange}
          rows={4}
        />
      )}
      
      {question.type === 'long-text' && (
        <Input
          label="Max Length"
          type="number"
          value={question.maxLength || ''}
          onChange={(e) => updateQuestion({ maxLength: parseInt(e.target.value, 10) || 0 })}
        />
      )}
      
      {question.type === 'numeric' && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Value"
            type="number"
            value={question.min ?? ''}
            onChange={(e) => updateQuestion({ min: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
          />
          <Input
            label="Max Value"
            type="number"
            value={question.max ?? ''}
            onChange={(e) => updateQuestion({ max: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
          />
        </div>
      )}
      
      {/* Conditional Logic */}
      <div className="pt-3 border-t border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Conditional Logic</h5>
        <p className="text-xs text-gray-500 mb-2">Show this question only if...</p>
        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Question"
            value={question.condition?.questionId || ''}
            onChange={(e) => handleConditionChange('questionId', e.target.value)}
          >
            <option value="">(No Condition)</option>
            {allQuestions.filter(q => q.id !== question.id && (q.type === 'single-choice' || q.type === 'multi-choice')).map(q => (
              <option key={q.id} value={q.id}>{q.label || q.id.substring(0, 6)}</option>
            ))}
          </Select>
          <Select
            label="Operator"
            value={question.condition?.operator || 'eq'}
            onChange={(e) => handleConditionChange('operator', e.target.value)}
          >
            <option value="eq">is equal to</option>
            <option value="neq">is not equal to</option>
            <option value="contains">contains</option>
          </Select>
          <Input
            label="Value"
            value={question.condition?.value || ''}
            onChange={(e) => handleConditionChange('value', e.target.value)}
            placeholder="e.g., Yes"
          />
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Button } from './Button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronsLeft,
} from 'lucide-react';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
      <div className="flex-1 flex justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="secondary"
        >
          Previous
        </Button>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="secondary"
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">
        <div>
          <nav
            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            <Button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              variant="ghost"
              size="icon"
              className="rounded-l-md"
            >
              <ChevronsLeft className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="ghost"
              size="icon"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              variant="ghost"
              size="icon"
              className="rounded-r-md"
            >
              <ChevronsRight className="h-5 w-5" />
            </Button>
          </nav>
        </div>
      </div>
    </nav>
  );
};
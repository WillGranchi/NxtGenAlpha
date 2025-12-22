/**
 * Accordion component for collapsible sections
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({ items, allowMultiple = false }) => {
  const [openItems, setOpenItems] = useState<Set<string>>(
    new Set(items.filter(item => item.defaultOpen).map(item => item.id))
  );

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        return (
          <div
            key={item.id}
            className="border border-border-default rounded-lg overflow-hidden bg-bg-tertiary"
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-bg-elevated transition-colors duration-300"
            >
              <span className="text-lg font-semibold text-text-primary">{item.title}</span>
              <ChevronDown
                className={clsx(
                  'w-5 h-5 text-text-secondary transition-transform duration-300',
                  isOpen && 'transform rotate-180'
                )}
              />
            </button>
            <div
              className={clsx(
                'overflow-hidden transition-all duration-300',
                isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="px-6 py-4 text-text-secondary border-t border-border-default">
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


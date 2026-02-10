"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  placeholder?: string;
  className?: string;
  isOpen?: boolean;
  onOpen?: () => void;
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  onClose,
  placeholder = "Select...",
  className = "",
  isOpen: controlledIsOpen,
  onOpen,
}: CustomDropdownProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(false);

  // Use controlled or uncontrolled open state
  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Calculate initial highlighted index based on current value
  const initialHighlightedIndex = useMemo(() => {
    const currentIndex = options.findIndex((opt) => opt.value === value);
    return currentIndex >= 0 ? currentIndex : 0;
  }, [options, value]);

  const [highlightedIndex, setHighlightedIndex] = useState(
    initialHighlightedIndex,
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback(
    (selectedValue: string) => {
      onChange(selectedValue);
      if (controlledIsOpen !== undefined) {
        onClose?.();
      } else {
        setInternalIsOpen(false);
      }
    },
    [onChange, controlledIsOpen, onClose],
  );

  const handleToggle = useCallback(() => {
    if (controlledIsOpen !== undefined) {
      if (!isOpen) {
        onOpen?.();
      } else {
        onClose?.();
      }
    } else {
      setInternalIsOpen(!isOpen);
    }
  }, [controlledIsOpen, isOpen, onOpen, onClose]);

  // Reset highlighted index when dropdown opens (not on every render)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Dropdown just opened - reset to value's index asynchronously
      const currentIndex = options.findIndex((opt) => opt.value === value);
      const frameId = requestAnimationFrame(() => {
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      });
      prevIsOpenRef.current = isOpen;
      return () => cancelAnimationFrame(frameId);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, options, value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        if (controlledIsOpen !== undefined) {
          onClose?.();
        } else {
          setInternalIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, controlledIsOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex].value);
          }
          break;
        case "Escape":
          event.preventDefault();
          if (controlledIsOpen !== undefined) {
            onClose?.();
          } else {
            setInternalIsOpen(false);
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    highlightedIndex,
    options,
    controlledIsOpen,
    onClose,
    handleSelect,
  ]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionsRef.current) {
      const highlightedElement = optionsRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          bg-white border rounded-md shadow-sm
          text-left text-sm
          transition-all duration-150
          ${
            isOpen
              ? "border-blue-500 ring-2 ring-blue-200"
              : "border-gray-300 hover:border-gray-400"
          }
          focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
        `}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <FiChevronDown
          className={`
            text-gray-400 transition-transform duration-200
            ${isOpen ? "rotate-180" : ""}
          `}
          size={16}
        />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div
          ref={optionsRef}
          className="
            absolute z-50 mt-1 w-full min-w-[160px]
            bg-white border border-gray-200 rounded-md shadow-lg
            max-h-60 overflow-auto
            transition-opacity duration-150
          "
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;

            return (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  flex items-center justify-between gap-2 px-3 py-2
                  cursor-pointer text-sm
                  transition-colors duration-75
                  ${isHighlighted ? "bg-blue-50" : ""}
                  ${isSelected ? "text-blue-600 font-medium" : "text-gray-700"}
                  hover:bg-blue-50
                `}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <FiCheck className="text-blue-600 flex-shrink-0" size={16} />
                )}
              </div>
            );
          })}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500 italic">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline version for table cells - more compact styling
interface CellDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export function CellDropdown({
  options,
  value,
  onChange,
  onClose,
  placeholder = "",
}: CellDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Calculate initial highlighted index based on current value
  const initialHighlightedIndex = useMemo(() => {
    const currentIndex = options.findIndex((opt) => opt.value === value);
    return currentIndex >= 0 ? currentIndex : 0;
  }, [options, value]);

  const [highlightedIndex, setHighlightedIndex] = useState(
    initialHighlightedIndex,
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback(
    (selectedValue: string) => {
      onChange(selectedValue);
      onClose();
    },
    [onChange, onClose],
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          event.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex].value);
          }
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [highlightedIndex, options, onClose, handleSelect]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current) {
      const highlightedElement = optionsRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Dropdown Options - absolutely positioned */}
      <div
        ref={optionsRef}
        className="
          absolute left-0 top-0 z-[100] min-w-[180px]
          bg-white border-2 border-blue-500 rounded-lg shadow-xl
          max-h-[240px] overflow-auto
        "
      >
        {/* Header showing current selection */}
        <div className="sticky top-0 bg-blue-50 border-b border-blue-200 px-3 py-2">
          <span className="text-xs font-medium text-blue-700">
            {selectedOption?.label || placeholder || "Select option"}
          </span>
        </div>

        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isHighlighted = index === highlightedIndex;

          return (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                flex items-center justify-between gap-2 px-3 py-2
                cursor-pointer text-xs
                transition-colors duration-75
                ${isHighlighted ? "bg-blue-100" : ""}
                ${isSelected ? "text-blue-700 font-semibold bg-blue-50" : "text-gray-700"}
                hover:bg-blue-100
              `}
            >
              <span>{option.label}</span>
              {isSelected && (
                <FiCheck className="text-blue-600 flex-shrink-0" size={14} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

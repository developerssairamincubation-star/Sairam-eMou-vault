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
          bg-white border border-black shadow-sm
          text-left text-sm
          transition-all duration-150
          ${isOpen ? "border-2 ring-2 ring-black" : "border border-black hover:bg-neutral-100"}
          focus:outline-none focus:border-black focus:ring-2 focus:ring-black
        `}
      >
        <span className={selectedOption ? "text-black" : "text-neutral-400"}>
          {selectedOption?.label || placeholder}
        </span>
        <FiChevronDown
          className={`
            text-black transition-transform duration-200
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
            bg-white border-2 border-black rounded-md shadow-xl
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
                  ${isHighlighted ? "bg-neutral-100" : ""}
                  ${isSelected ? "text-black font-semibold" : "text-neutral-700"}
                  hover:bg-neutral-200
                `}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <FiCheck className="text-black flex-shrink-0" size={16} />
                )}
              </div>
            );
          })}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-400 italic">
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
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate initial highlighted index based on current value
  const initialHighlightedIndex = useMemo(() => {
    const currentIndex = options.findIndex((opt) => opt.value === value);
    return currentIndex >= 0 ? currentIndex : 0;
  }, [options, value]);

  const [highlightedIndex, setHighlightedIndex] = useState(
    initialHighlightedIndex,
  );

  const selectedOption = options.find((opt) => opt.value === value);

  // Calculate position on mount
  useEffect(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left,
      });
    }
  }, []);

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
    <div ref={dropdownRef} className="relative z-[10000]">
      {/* Dropdown Options - fixed positioned to break out of table stacking context */}
      <div
        ref={optionsRef}
        className="
          fixed z-[10000] min-w-[180px]
          bg-white border-2 border-black rounded-lg shadow-xl
          max-h-[240px] overflow-auto
        "
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Header showing current selection */}
        <div className="sticky top-0 bg-neutral-100 border-b border-black px-3 py-2">
          <span className="text-xs font-medium text-black">
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
                ${isHighlighted ? "bg-neutral-200" : ""}
                ${isSelected ? "text-black font-semibold bg-neutral-100" : "text-neutral-700"}
                hover:bg-neutral-200
              `}
            >
              <span>{option.label}</span>
              {isSelected && (
                <FiCheck className="text-black flex-shrink-0" size={14} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

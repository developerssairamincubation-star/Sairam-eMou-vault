"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { FiChevronDown, FiCheck, FiSearch, FiX } from "react-icons/fi";

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
          onMouseDown={(e) => e.stopPropagation()}
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
        onMouseDown={(e) => e.stopPropagation()}
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

// Searchable inline dropdown for table cells (for large option lists like IEEE Societies)
interface SearchableCellDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export function SearchableCellDropdown({
  options,
  value,
  onChange,
  onClose,
  placeholder = "",
}: SearchableCellDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [options, searchTerm],
  );

  const initialHighlightedIndex = useMemo(() => {
    const idx = filteredOptions.findIndex((opt) => opt.value === value);
    return idx >= 0 ? idx : 0;
  }, [filteredOptions, value]);

  const [highlightedIndex, setHighlightedIndex] = useState(
    initialHighlightedIndex,
  );

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.left });
    }
    // Auto-focus search input
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  // Reset highlighted index when search changes
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setHighlightedIndex(0);
    });
    return () => cancelAnimationFrame(frameId);
  }, [searchTerm]);

  const handleSelect = useCallback(
    (selectedValue: string) => {
      onChange(selectedValue);
      onClose();
    },
    [onChange, onClose],
  );

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          event.preventDefault();
          if (
            highlightedIndex >= 0 &&
            highlightedIndex < filteredOptions.length
          ) {
            handleSelect(filteredOptions[highlightedIndex].value);
          }
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [highlightedIndex, filteredOptions, onClose, handleSelect]);

  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current) {
      const el = optionsRef.current.children[
        highlightedIndex + 1
      ] as HTMLElement; // +1 for search header
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  return (
    <div ref={dropdownRef} className="relative z-[10000]">
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed z-[10000] min-w-[280px] bg-white border-2 border-black rounded-lg shadow-xl max-h-[300px] overflow-hidden flex flex-col"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        {/* Search input */}
        <div className="sticky top-0 bg-white border-b border-black p-2">
          <div className="relative">
            <FiSearch
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
              size={12}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1 px-1">
            {selectedOption?.label || placeholder || "Select option"}
          </div>
        </div>

        {/* Options */}
        <div ref={optionsRef} className="overflow-auto flex-1">
          {filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  flex items-center justify-between gap-2 px-3 py-2
                  cursor-pointer text-xs transition-colors duration-75
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
          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400 italic">
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Multi-select inline dropdown for table cells (for EMoU Outcome with predefined + custom options)
interface MultiSelectCellDropdownProps {
  predefinedOptions: string[];
  value: string; // comma-separated
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export function MultiSelectCellDropdown({
  predefinedOptions,
  value,
  onChange,
  onClose,
  placeholder = "",
}: MultiSelectCellDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [customInput, setCustomInput] = useState("");

  const selectedItems = useMemo(
    () =>
      value && value !== "Not Applicable"
        ? value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [value],
  );

  useEffect(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.left });
    }
  }, []);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleItem = (item: string) => {
    let newItems: string[];
    if (selectedItems.includes(item)) {
      newItems = selectedItems.filter((i) => i !== item);
    } else {
      newItems = [...selectedItems, item];
    }
    const newValue =
      newItems.length > 0 ? newItems.join(", ") : "Not Applicable";
    onChange(newValue);
  };

  const addCustomItem = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedItems.includes(trimmed)) {
      const newItems = [...selectedItems, trimmed];
      onChange(newItems.join(", "));
      setCustomInput("");
    }
  };

  const removeItem = (item: string) => {
    const newItems = selectedItems.filter((i) => i !== item);
    const newValue =
      newItems.length > 0 ? newItems.join(", ") : "Not Applicable";
    onChange(newValue);
  };

  return (
    <div ref={dropdownRef} className="relative z-[10000]">
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="fixed z-[10000] min-w-[300px] bg-white border-2 border-black rounded-lg shadow-xl max-h-[360px] overflow-hidden flex flex-col"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-neutral-100 border-b border-black px-3 py-2">
          <span className="text-xs font-medium text-black">
            {placeholder || "Select outcomes"}
          </span>
        </div>

        {/* Selected items */}
        {selectedItems.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-200 flex flex-wrap gap-1">
            {selectedItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 border border-blue-300"
              >
                {item}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <FiX size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Predefined options */}
        <div className="overflow-auto flex-1">
          {predefinedOptions.map((option) => {
            const isSelected = selectedItems.includes(option);
            return (
              <div
                key={option}
                onClick={() => toggleItem(option)}
                className={`
                  flex items-center justify-between gap-2 px-3 py-2
                  cursor-pointer text-xs transition-colors duration-75
                  ${isSelected ? "text-black font-semibold bg-blue-50" : "text-neutral-700"}
                  hover:bg-neutral-200
                `}
              >
                <span>{option}</span>
                {isSelected && (
                  <FiCheck className="text-blue-600 flex-shrink-0" size={14} />
                )}
              </div>
            );
          })}
        </div>

        {/* Custom input */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-2 flex gap-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomItem();
              }
            }}
            placeholder="Custom outcome..."
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addCustomItem();
            }}
            className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
          >
            Add
          </button>
        </div>

        {/* Done button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-300 p-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full px-3 py-1.5 text-xs font-medium bg-black text-white rounded hover:bg-neutral-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

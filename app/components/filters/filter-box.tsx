import {
  Autocomplete,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteLabel,
  AutocompleteList,
  useAutocompleteAnchor,
} from "~/components/ui/autocomplete";

export interface FilterOption {
  /** What picking the option puts in the box. */
  value: string;
  /** How many rows it would keep; shown on the right, and 0 dims the option. */
  count?: number;
  /** Secondary text after the value, e.g. a function's signature. */
  hint?: string;
}

export interface FilterGroup {
  /** The heading over the group. */
  value: string;
  items: FilterOption[];
}

interface FilterBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Empty groups are left out. */
  groups: FilterGroup[];
  /** Whether an option stays listed for the typed text. Default: case-insensitive substring of the value. */
  match?: (option: FilterOption, query: string) => boolean;
  placeholder: string;
  /** The accessible name of the box. */
  label: string;
  className?: string;
}

const substring = (option: FilterOption, query: string) =>
  option.value.toLowerCase().includes(query.trim().toLowerCase());

/**
 * A table filter: a text box whose typed text is the filter, with a pulldown
 * of known values to pick from. The list narrows by the same rule as the table.
 */
export function FilterBox({
  value,
  onValueChange,
  groups,
  match = substring,
  placeholder,
  label,
  className = "w-56",
}: FilterBoxProps) {
  const anchor = useAutocompleteAnchor();
  const items = groups.filter((g) => g.items.length > 0);
  return (
    <Autocomplete
      items={items}
      value={value}
      onValueChange={onValueChange}
      itemToStringValue={(item: FilterOption) => item.value}
      filter={(item: FilterOption, query: string) => match(item, query)}
      openOnInputClick
    >
      <AutocompleteInput
        placeholder={placeholder}
        aria-label={label}
        spellCheck={false}
        showClear
        anchorRef={anchor}
        className={`font-mono ${className}`}
      />
      <AutocompleteContent anchor={anchor}>
        <AutocompleteEmpty>No matches.</AutocompleteEmpty>
        <AutocompleteList>
          {(group: FilterGroup) => (
            <AutocompleteGroup key={group.value} items={group.items}>
              <AutocompleteLabel>{group.value}</AutocompleteLabel>
              <AutocompleteCollection>
                {(item: FilterOption) => (
                  <AutocompleteItem
                    key={item.value}
                    value={item}
                    className={`font-mono text-xs ${
                      item.count === 0 ? "text-muted-foreground" : ""
                    }`}
                  >
                    <span className="flex-1 truncate">
                      {item.value}
                      {item.hint && (
                        <span className="text-muted-foreground">
                          {" "}
                          {item.hint}
                        </span>
                      )}
                    </span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="text-muted-foreground tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </AutocompleteItem>
                )}
              </AutocompleteCollection>
            </AutocompleteGroup>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}

/** Options for a plain column: each distinct value with its row count, sorted. */
export function countedOptions(
  values: Iterable<string>,
  known: Iterable<string> = [],
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const v of known) counts.set(v, 0);
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { sensitivity: "base" }),
    );
}

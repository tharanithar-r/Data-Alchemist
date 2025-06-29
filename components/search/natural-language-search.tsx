'use client';

import {
  Search,
  X,
  Filter,
  Loader2,
  Sparkles,
  History,
  Target,
} from 'lucide-react';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  SearchResult,
  SearchQuery,
} from '@/lib/ai/natural-language-search';
import { useDataStoreSelectors } from '@/lib/stores/data-store';
import { Client, Worker, Task } from '@/lib/types/entities';

interface NaturalLanguageSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  onResultsChange?: (results: SearchResult[]) => void;
  className?: string;
}

export function NaturalLanguageSearch({
  onResultSelect,
  onResultsChange,
  className,
}: NaturalLanguageSearchProps) {
  const { clients, workers, tasks } = useDataStoreSelectors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Remove direct search engine instantiation - use API route instead
  const [showFilters, setShowFilters] = useState(false);
  const [entityFilter, setEntityFilter] = useState<
    ('client' | 'worker' | 'task')[]
  >([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Memoized search data
  const searchData = useMemo(
    () => ({ clients, workers, tasks }),
    [clients, workers, tasks]
  );

  // Debounced search execution
  const executeSearch = useCallback(
    async (
      searchQuery: string,
      entityTypes?: ('client' | 'worker' | 'task')[]
    ) => {
      if (!searchQuery.trim()) {
        setResults([]);
        onResultsChange?.([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchOptions: Partial<SearchQuery> = {};
        if (entityTypes?.length) {
          searchOptions.entityTypes = entityTypes;
        }

        // Use API route for server-side search
        const response = await fetch('/api/ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            entities: searchData,
            options: searchOptions,
          }),
        });

        if (!response.ok) {
          throw new Error(`Search API failed: ${response.statusText}`);
        }

        const searchResults = await response.json();

        setResults(searchResults);
        onResultsChange?.(searchResults);

        // Add to search history
        if (searchQuery.length > 2) {
          setSearchHistory(prev => {
            const newHistory = [
              searchQuery,
              ...prev.filter(q => q !== searchQuery),
            ];
            return newHistory.slice(0, 10); // Keep last 10 searches
          });
        }
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
        onResultsChange?.([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchData, onResultsChange]
  );

  // Debounce search execution
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      executeSearch(query, entityFilter.length ? entityFilter : undefined);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, entityFilter, executeSearch]);

  // Static search suggestions (since we moved to server-side API)
  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    
    const staticSuggestions = [
      'high priority clients',
      'clients with JavaScript tasks',
      'workers with React skills',
      'tasks requiring senior level',
      'urgent tasks this week',
      'workers available > 20 hours',
      'clients in priority level 1',
      'tasks with duration < 5 days',
      'workers in engineering group',
      'clients requesting mobile tasks'
    ];
    
    return staticSuggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }, [query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    onResultsChange?.([]);
    setShowSuggestions(false);
  };

  const handleEntityFilterToggle = (
    entityType: 'client' | 'worker' | 'task'
  ) => {
    setEntityFilter(prev => {
      if (prev.includes(entityType)) {
        return prev.filter(type => type !== entityType);
      } else {
        return [...prev, entityType];
      }
    });
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'client':
        return '👤';
      case 'worker':
        return '👷';
      case 'task':
        return '📋';
      default:
        return '📄';
    }
  };

  const getEntityColor = (entityType: string) => {
    switch (entityType) {
      case 'client':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'worker':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'task':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatEntityDisplay = (
    entity: Client | Worker | Task,
    entityType: string
  ) => {
    switch (entityType) {
      case 'client':
        const client = entity as Client;
        return {
          title: client.ClientName,
          subtitle: client.ClientID,
          details: `Priority: ${client.PriorityLevel}`,
        };
      case 'worker':
        const worker = entity as Worker;
        return {
          title: worker.WorkerName,
          subtitle: worker.WorkerID,
          details: `Skills: ${worker.Skills.split(',').slice(0, 2).join(', ')}`,
        };
      case 'task':
        const task = entity as Task;
        return {
          title: task.TaskName,
          subtitle: task.TaskID,
          details: `Category: ${task.Category}`,
        };
      default:
        return { title: 'Unknown', subtitle: '', details: '' };
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Natural Language Search
            </CardTitle>
            <CardDescription>
              {`Search using natural language like "high priority clients" or "JavaScript developers" `}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-50' : ''}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search for clients, workers, or tasks..."
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              className="pl-10 pr-12"
              onFocus={() => setShowSuggestions(query.length > 0)}
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />
            )}
          </div>

          {/* Search Suggestions */}
          {showSuggestions &&
            (suggestions.length > 0 || searchHistory.length > 0) && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <Card className="shadow-lg">
                  <CardContent className="p-2">
                    {suggestions.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-medium text-gray-500 flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Suggestions
                        </div>
                        {suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => handleSuggestionSelect(suggestion)}
                          >
                            <Sparkles className="h-3 w-3 mr-2 text-blue-500" />
                            {suggestion}
                          </Button>
                        ))}
                        {searchHistory.length > 0 && (
                          <Separator className="my-2" />
                        )}
                      </>
                    )}

                    {searchHistory.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-medium text-gray-500 flex items-center gap-1">
                          <History className="h-3 w-3" />
                          Recent Searches
                        </div>
                        {searchHistory
                          .slice(0, 3)
                          .map((historyQuery, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left h-auto py-2"
                              onClick={() =>
                                handleSuggestionSelect(historyQuery)
                              }
                            >
                              <History className="h-3 w-3 mr-2 text-gray-400" />
                              {historyQuery}
                            </Button>
                          ))}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
        </div>

        {/* Entity Type Filters */}
        {showFilters && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">
              Filter by type:
            </span>
            {(['client', 'worker', 'task'] as const).map(entityType => (
              <Button
                key={entityType}
                variant={
                  entityFilter.includes(entityType) ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => handleEntityFilterToggle(entityType)}
                className="capitalize"
              >
                {getEntityIcon(entityType)} {entityType}s
              </Button>
            ))}
            {entityFilter.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEntityFilter([])}
                className="text-gray-500"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Search Results ({results.length})
              </h4>
              {query && (
                <Badge variant="outline" className="text-xs">
                  Query: {query}
                </Badge>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => {
                const display = formatEntityDisplay(
                  result.entity,
                  result.entityType
                );
                return (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onResultSelect?.(result)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            className={`text-xs ${getEntityColor(result.entityType)}`}
                          >
                            {getEntityIcon(result.entityType)}{' '}
                            {result.entityType}
                          </Badge>
                          <span className="font-medium">{display.title}</span>
                          <span className="text-sm text-gray-500">
                            {display.subtitle}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {display.details}
                        </p>

                        {result.matchReasons.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {result.matchReasons
                              .slice(0, 2)
                              .map((reason, reasonIndex) => (
                                <Badge
                                  key={reasonIndex}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {reason}
                                </Badge>
                              ))}
                            {result.matchReasons.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{result.matchReasons.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {Math.round(result.confidence * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">confidence</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {query && !isSearching && results.length === 0 && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No results found
            </h3>
            <p className="text-gray-600 mb-4">
              Try a different search term or check your filters
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                💡 <strong>Try these examples:</strong>
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'high priority clients',
                  'JavaScript developers',
                  'senior workers',
                  'React tasks',
                ].map(example => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionSelect(example)}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!query && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              AI-Powered Search
            </h3>
            <p className="text-gray-600 mb-4">
              Search using natural language across all your data
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                💡 <strong>Example queries:</strong>
              </p>
              <div className="grid grid-cols-2 gap-2 text-left">
                <div>high priority clients</div>
                <div>JavaScript developers</div>
                <div>senior workers with React</div>
                <div>urgent tasks</div>
                <div>available workers</div>
                <div>development tasks</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default NaturalLanguageSearch;

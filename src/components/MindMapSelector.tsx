import React from "react"
import {
  ArrowDownAZ,
  PlusCircle,
  Search,
  Network,
  Eye,
  EyeOff,
  Link,
  X,
} from "lucide-react"
import { useMindMapStore, type MindMap } from "../store/mindMapStore"
import { useAuthStore } from "../store/authStore"

/**
 * MindMapSelector Component
 * 
 * A reusable component for selecting mindmaps with search, sort, and create functionality.
 *  * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState("")
 * const [sortBy, setSortBy] = useState<'alphabetical' | 'lastEdited'>('lastEdited')
 * const [showCreateForm, setShowCreateForm] = useState(false)
 * const [newMapTitle, setNewMapTitle] = useState("")
 * const [showSelector, setShowSelector] = useState(false)
 * 
 * const handleSelectMindMap = (mapId: string) => {
 *   console.log("Selected mindmap:", mapId)
 *   setShowSelector(false)
 * }
 * 
 * return (
 *   <div className="relative">
 *     <button onClick={() => setShowSelector(true)}>
 *       Show MindMap Selector
 *     </button>
 *     {showSelector && (
 *       <MindMapSelector
 *         searchTerm={searchTerm}
 *         setSearchTerm={setSearchTerm}
 *         sortBy={sortBy}
 *         setSortBy={setSortBy}
 *         showCreateForm={showCreateForm}
 *         setShowCreateForm={setShowCreateForm}
 *         newMapTitle={newMapTitle}
 *         setNewMapTitle={setNewMapTitle}
 *         onSelectMindMap={handleSelectMindMap}
 *         onCreateMindMap={() => {
 *           setShowCreateForm(false)
 *           setNewMapTitle("")
 *         }}
 *         onCancelCreate={() => {
 *           setShowCreateForm(false)
 *           setNewMapTitle("")
 *         }}
 *         isAIConversation={true}
 *         onClose={() => setShowSelector(false)}
 *         excludeMapId="current-map-id-to-exclude"
 *       />
 *     )}
 *   </div>
 * )
 *           setNewMapTitle("")
 *         }}
 *         onCancelCreate={() => {
 *           setShowCreateForm(false)
 *           setNewMapTitle("")
 *         }}
 *         isAIConversation={true}
 *         onClose={() => setShowSelector(false)}
 *       />
 *     )}
 *   </div>
 * )
 * ```
 */

interface MindMapSelectorProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortBy: 'alphabetical' | 'lastEdited'
  setSortBy: (sortBy: 'alphabetical' | 'lastEdited') => void
  showCreateForm: boolean
  setShowCreateForm: (show: boolean) => void
  newMapTitle: string
  setNewMapTitle: (title: string) => void
  onSelectMindMap: (mapId: string) => void
  onCreateMindMap: () => void
  onCancelCreate: () => void
  isAIConversation?: boolean
  onClose: () => void
  title?: string
  mode?: 'overlay' | 'inline'
  excludeMapId?: string // ID of the current map being edited to exclude from the list
}

const MindMapSelector: React.FC<MindMapSelectorProps> = ({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  showCreateForm,
  setShowCreateForm,
  newMapTitle,
  setNewMapTitle,
  onSelectMindMap,
  onCreateMindMap,
  onCancelCreate,
  isAIConversation = false,
  onClose,
  title = "Choose a mindmap",
  mode = 'inline',
  excludeMapId
}) => {
  const { maps } = useMindMapStore()
  const { user } = useAuthStore()

  // Debug logging
  console.log('MindMapSelector: maps:', maps, 'user:', user?.id);

  // Filter and sort mindmaps based on search term and sort option
  const getFilteredAndSortedMaps = (): MindMap[] => {
    let filteredMaps = maps.filter(map => 
      map.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      map.id !== excludeMapId // Exclude the current map being edited
    )

    return filteredMaps.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title)      } else {
        // Sort by lastEdited (most recent first)
        const aDate = new Date(a.updatedAt || a.createdAt || 0)
        const bDate = new Date(b.updatedAt || b.createdAt || 0)
        return bDate.getTime() - aDate.getTime()
      }
    })
  }

  // Highlight search matches in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-sky-400/30 text-sky-200 rounded px-0.5">
          {part}
        </span>
      ) : part
    )
  }

  const handleCreateMindMapAccept = () => {
    if (!newMapTitle.trim() || newMapTitle.length > 25) {
      return;
    }
    
    // Create the mindmap using the mindMapStore
    const { addMap } = useMindMapStore.getState();
    const userId = user?.id;
    
    if (userId) {
      const newMapId = addMap(newMapTitle.trim(), userId);
      console.log("Created mindmap with ID:", newMapId, "and title:", newMapTitle.trim());
      
      // Select the newly created mindmap
      onSelectMindMap(newMapId);
    } else {
      console.error("No user ID available for creating mindmap");
    }
    
    onCreateMindMap()
    onClose()
  }
  const handleCreateMindMapReject = () => {
    onCancelCreate()
  }
    // Determine container classes based on mode
  const containerClasses = mode === 'overlay' 
    ? "absolute bottom-12 left-0 z-50 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden mindmap-selector"
    : "w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden mindmap-selector"
  
  return (
    <div className={containerClasses}>      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-200">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Search and Sort Controls */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search mindmaps..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'alphabetical' ? 'lastEdited' : 'alphabetical')}
            className="p-1.5 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-gray-200 transition-colors"
            title={sortBy === 'alphabetical' ? 'Sorted alphabetically - click for last edited' : 'Sorted by last edited - click for alphabetical'}
          >
            {sortBy === 'alphabetical' ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>
        
        {showCreateForm ? (
          <div className="border-b border-gray-700 mb-3 pb-3">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newMapTitle}
                onChange={(e) => setNewMapTitle(e.target.value)}
                placeholder="Enter mindmap title..."
                maxLength={25}
                className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateMindMapAccept()
                  } else if (e.key === "Escape") {
                    handleCreateMindMapReject()
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateMindMapAccept}
                  disabled={!newMapTitle.trim() || newMapTitle.length > 25}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={handleCreateMindMapReject}
                  className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Create new mindmap option - only for AI conversations */}
            {isAIConversation && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center gap-2 p-2 text-sm text-blue-400 hover:bg-blue-500/20 rounded transition-colors mb-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create new mindmap</span>
              </button>
            )}
          </>
        )}
        
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {(() => {
            const filteredMaps = getFilteredAndSortedMaps()
            
            if (filteredMaps.length > 0) {
              return filteredMaps.map((map) => (
                <button
                  key={map.id}
                  onClick={() => {
                    onSelectMindMap(map.id)
                    onClose()
                  }}
                  className="w-full flex items-center gap-2 p-2 text-sm text-gray-200 hover:bg-gray-700/70 rounded transition-colors text-left"
                >
                  {map.visibility === 'public' ? (
                    <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : map.visibility === 'linkOnly' ? (
                    <Link className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">
                    {highlightSearchTerm(map.title, searchTerm)}
                  </span>                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(map.updatedAt || map.createdAt || 0).toLocaleDateString()}
                  </span>
                </button>
              ))
            } else if (searchTerm.trim()) {
              return (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Search className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No mindmaps found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )
            } else {
              return (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Network className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No mindmaps yet</p>
                  <p className="text-xs mt-1">Create your first mindmap to share it</p>
                </div>
              )
            }
          })()}
        </div>
      </div>
    </div>
  )
}

export default MindMapSelector

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User, Network } from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleSearch = async () => {
      if (!query || query.trim() === "") {
        setSearchResults([]);
        return;
      }

      setLoading(true);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${query}%`);

      const { data: mindmapsData, error: mindmapsError } = await supabase
        .from("mindmaps")
        .select("id, title, username, permalink")
        .ilike("title", `%${query}%`);

      if (profilesError || mindmapsError) {
        console.error("Error searching:", profilesError || mindmapsError);
        setSearchResults([]);
      } else {
        setSearchResults([
          ...(profilesData || []).map((profile) => ({ type: "profile", ...profile })),
          ...(mindmapsData || []).map((mindmap) => ({ type: "mindmap", ...mindmap })),
        ]);
      }
      setLoading(false);
    };

    handleSearch();
  }, [query]);

  const handleSearchResultClick = (result: any) => {
    if (result.type === "profile" && result.username) {
      navigate(`/${result.username}`);
    } else if (result.type === "mindmap" && result.username && result.permalink) {
      navigate(`/${result.username}/${result.permalink}`);
    }
  };

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold">Search Results for "{query}"</h1>
      {loading && <p className="mt-4">Loading...</p>}
      {!loading && searchResults.length === 0 && (
        <p className="mt-4">No results found for "{query}".</p>
      )}
      {!loading && searchResults.length > 0 && (
        <div className="mt-4 grid gap-4">
          {searchResults.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center transition-all duration-200 border border-slate-700/50"
              onClick={() => handleSearchResultClick(result)}
            >
              {result.type === "profile" ? (
                <>
                  {result.avatar_url ? (
                    <img
                      src={result.avatar_url || "/placeholder.svg"}
                      alt={result.username}
                      className="w-10 h-10 rounded-full mr-4 border-2 border-slate-600"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mr-4">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-lg">{result.username}</span>
                    <p className="text-sm text-slate-400">Profile</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mr-4">
                    <Network className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <span className="font-medium text-lg">{result.title}</span>
                    <p className="text-sm text-slate-400">Mind Map by @{result.username}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
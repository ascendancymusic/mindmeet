import { getAIBotConfig, aiBots } from "../config/aiBot"
import { supabase } from "../supabaseClient"
import { useAuthStore } from "../store/authStore"
import { useAISettingsStore } from "../store/aiSettingsStore"
import AI_tools_mindmap from "../examples/AI_tools_mindmap.json"
import Music_mindmap from "../examples/Music_mindmap.json"
import simple_mindmap from "../examples/simple_mindmap.json"
import social_links_mindmap from "../examples/social_links_mindmap.json"
import Math_Course_mindmap from "../examples/Math_Course_mindmap.json"
import All_Containing_Map from "../examples/All_Containing_Map.json"
import { getPublicMindmaps } from "./publicMindmapsCache"

class AIService {
  private apiKey: string
  private config = getAIBotConfig()
  private currentBotId = "bigglesmooth"
  private exampleMindmaps = [AI_tools_mindmap, Music_mindmap, simple_mindmap, social_links_mindmap, Math_Course_mindmap, All_Containing_Map]
  private publicMindmaps: Array<{ title: string; json_data: any }> = [];
  private publicMindmapsLoaded = false;

  constructor() {
    const apiKey = import.meta.env.VITE_PORTKEY_API_KEY
    if (!apiKey) {
      throw new Error("Portkey API key is not configured")
    }
    this.apiKey = apiKey
    this.config.apiKey = apiKey
  }

  private async ensurePublicMindmapsLoaded() {
    if (!this.publicMindmapsLoaded) {
      try {
        this.publicMindmaps = await getPublicMindmaps();
        this.publicMindmapsLoaded = true;
      } catch (e) {
        console.warn("Failed to load public mindmaps for AI context", e);
        this.publicMindmaps = [];
      }
    }
  }

  /**
   * Fetches conversation history from Supabase for a specific conversation
   * @param supabaseConversationId The Supabase conversation ID
   * @returns Array of conversation messages formatted for AI context
   */
  private async fetchConversationHistory(supabaseConversationId: string): Promise<Array<{ role: string; text: string; senderId?: string }>> {
    try {
      const currentUser = useAuthStore.getState().user
      if (!currentUser) {
        console.warn("No authenticated user found, returning empty history")
        return []
      }

      // Get conversation-specific settings
      const aiSettings = useAISettingsStore.getState()
      const { memoryLength } = aiSettings.getConversationSettings(supabaseConversationId)

      // Fetch messages for this specific conversation from Supabase
      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", supabaseConversationId)
        .order("timestamp", { ascending: true })

      if (error) {
        console.error("Error fetching conversation history from Supabase:", error)
        return []
      }

      if (!messages || messages.length === 0) {
        return []
      }

      // Get the conversation metadata to access last_message_sent_by
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("last_message_sent_by")
        .eq("id", supabaseConversationId)
        .single()

      if (convError) {
        console.warn("Could not fetch conversation metadata:", convError)
      }

      const lastMessageSentBy = conversation?.last_message_sent_by || "Unknown"

      // Convert Supabase messages to AI conversation format
      const conversationHistory = messages.map(msg => {
        let role = "user"
        let text = msg.text

        // Determine the role based on message type and sender
        if (msg.type === "ai-message") {
          role = "model" // Gemini uses "model" for AI responses
        } else if (msg.sender_id === currentUser.id) {
          role = "user"
          // For current user messages, just use the text as-is
        } else {
          // Message from another user - we can use the last_message_sent_by for context
          role = "user"
          text = `${lastMessageSentBy}: ${text}` // Prefix with username for context
        }

        return {
          role,
          text,
          senderId: msg.sender_id
        }
      })

      // Limit history to the configured memory length
      const limitedHistory = conversationHistory.slice(-memoryLength)

      console.log(`Fetched ${limitedHistory.length} messages from conversation ${supabaseConversationId} (max: ${memoryLength})`)
      return limitedHistory

    } catch (error) {
      console.error("Failed to fetch conversation history:", error)
      return []
    }
  }

  /**
   * Gets the last message sender from the conversation for context
   * @param supabaseConversationId The Supabase conversation ID
   * @returns The username of the last message sender
   */
  private async getLastMessageSender(supabaseConversationId: string): Promise<string | null> {
    try {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .select("last_message_sent_by")
        .eq("id", supabaseConversationId)
        .single()

      if (error) {
        console.error("Error fetching conversation metadata:", error)
        return null
      }

      return conversation?.last_message_sent_by || null
    } catch (error) {
      console.error("Failed to get last message sender:", error)
      return null
    }
  }

  async generateResponse(message: string, conversationId: number, mindMapData?: any): Promise<string> {
    await this.ensurePublicMindmapsLoaded();
    const aiSettings = useAISettingsStore.getState();

    try {
      const currentBot = this.getCurrentBot()

      // Get the conversation's Supabase ID from the chat store
      const { useChatStore } = await import("../store/chatStore")
      const chatStore = useChatStore.getState()
      const conversation = chatStore.conversations.find(c => c.id === conversationId)
      
      if (!conversation) {
        throw new Error(`Conversation with ID ${conversationId} not found`)
      }

      if (!conversation.supabaseId) {
        console.warn(`Conversation ${conversationId} has no Supabase ID, using empty history`)
      }

      // Fetch conversation-specific history from Supabase
      const history = conversation.supabaseId 
        ? await this.fetchConversationHistory(conversation.supabaseId)
        : []

      // Get last message sender for additional context
      const lastMessageSender = conversation.supabaseId 
        ? await this.getLastMessageSender(conversation.supabaseId)
        : null

      // Add current user message to history with mindmap data if present
      const messageWithMetadata = mindMapData
        ? `${message}\n[Mindmap Metadata: ${JSON.stringify(mindMapData)}]`
        : message

      // Get conversation-specific settings
      const aiSettings = useAISettingsStore.getState()
      const { customContext } = conversation.supabaseId
        ? aiSettings.getConversationSettings(conversation.supabaseId)
        : { customContext: "" }

      // Add conversation context to the system prompt, including custom context if available
      let conversationContext = lastMessageSender 
        ? `\n\nConversation Context: The last message in this conversation was sent by "${lastMessageSender}". You are responding in the context of this ongoing conversation.`
        : ""

      // Add custom context if available
      if (customContext) {
        conversationContext += `\n\nAdditional Context: ${customContext}`
      }

      const mindMapContext = mindMapData
        ? `
        You are an AI assistant helping with mindmap editing. The user has shared a mindmap with the following exact structure:

        ${JSON.stringify(mindMapData, null, 2)}

        Here are some example mindmaps for reference on proper structure and formatting:
        ${JSON.stringify(this.exampleMindmaps, null, 2)}

        STRICT RULES FOR MINDMAP MODIFICATIONS:

        1. Response Format Rules:
           - Same JSON format as sent map or the exampleMindmaps. 

        2. Node Modification Rules:
           - CANNOT delete the root node (id: "1")
           - Node IDs must be unique timestamps
           - Must preserve all required node properties
           - In style object, can ONLY modify "background" color
           - Must preserve all other style properties exactly as provided
           - For Spotify nodes, only provide the track/album/artist name - the actual URL will be resolved through SpotifySearch
           - For YouTube nodes:
             * Provide simple, general search terms that a user would typically use on YouTube
             * Keep titles concise and focused on main topic/content
             * Avoid overly specific or complex descriptions
             * Focus on commonly searched terms for better video availability
             * Examples: "Learn Python Basics", "Taylor Swift Shake It Off", "Easy Pasta Recipe"
             * The actual URL will be resolved through YouTubeSearch

        3. Edge Rules:
           - Edge IDs must follow format: "reactflow__edge-[source]-[target]"
           - Cannot create edges without valid source and target nodes

        4. Data Integrity Rules:
           - Must maintain all existing metadata fields
           - Cannot modify createdAt timestamp
           - Must update updatedAt timestamp
           - Cannot delete or edit node border settings
           - Cannot modify text color
           - Must preserve all social/media-specific node properties

        5. Special Node Rules:
           - Social media nodes usernames (label) do not need an "@" symbol, simply the username is enough
           - For Spotify nodes, only specify the track/album/artist name - do not include full URLs
           - Spotify nodes are wide and should be a bit further away from each other and other nodes
           - For YouTube nodes, only specify the video title - do not include full URLs
          
        6. Other:
          - The title of the map should be at maximum 20 characters long
          - Study the node positioning from the example mindmaps, but do not copy the exact positioning from the examples and keep the maps symmetrical.
          - Avoid using white as the background color because the text color is white
      `
        : ""

      // Add public mindmaps to the context
      const publicMindmapsContext = this.publicMindmaps.length > 0 ? `\n\nHere are some public mindmaps from other users for additional reference and learning (titles and structures):\n${JSON.stringify(this.publicMindmaps, null, 2)}` : "";

  // Build messages array for Portkey API
      const messages = [
        { 
          role: "system", 
          content: currentBot.systemPrompt + mindMapContext + conversationContext + publicMindmapsContext
        },
        // Add the fetched conversation history
        ...history.map((msg) => ({
          role: msg.role === "model" ? "assistant" : msg.role,
          content: msg.text,
        })),
        // Add the current user message
        {
          role: "user",
          content: messageWithMetadata
        }
      ]

      // Make request to Portkey API
      // Get model from aiSettingsStore (conversation or global)
      // Use existing aiSettings variable (already declared above)
      const model = conversation && conversation.supabaseId
        ? aiSettings.getConversationSettings(conversation.supabaseId).model
        : aiSettings.defaultModel;
      const response = await fetch('https://api.portkey.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messages,
          temperature: currentBot.temperature,
          max_tokens: currentBot.maxTokens
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Portkey API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const responseText = data.choices[0]?.message?.content || 'No response generated'

      // Extract the conversational part and JSON part
      let conversationalResponse = responseText
      let jsonStartIndex = responseText.indexOf('{')

      if (jsonStartIndex !== -1) {
        // Extract the conversational part (everything before the JSON) and clean it up
        conversationalResponse = responseText.substring(0, jsonStartIndex).replace(/\s+$/, '')
      }

      // Process AI suggestions for mindmap updates
      if (mindMapData) {
        console.log(`[AI Service] Started editing mindmap: ${mindMapData.id}`)
        try {
          // Extract JSON suggestions from the response using a more robust approach
          let validJson = null

          if (jsonStartIndex !== -1) {
            let bracketCount = 0
            let jsonEndIndex = -1

            // Parse through the response to find matching brackets
            for (let i = jsonStartIndex; i < responseText.length; i++) {
              if (responseText[i] === "{") bracketCount++
              if (responseText[i] === "}") bracketCount--

              if (bracketCount === 0) {
                jsonEndIndex = i + 1
                break
              }
            }

            if (jsonEndIndex !== -1) {
              const jsonStr = responseText.substring(jsonStartIndex, jsonEndIndex)

              try {
                // Clean and parse the JSON string
                const normalizedJson = jsonStr
                  .replace(/[\n\r\t]/g, "")
                  .replace(/\s+/g, " ")
                  .trim()

                const parsed = JSON.parse(normalizedJson)
                if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
                  validJson = parsed
                } else {
                  console.error("Parsed JSON does not have required nodes and edges arrays")
                }
              } catch (parseError) {
                console.error("Failed to parse JSON:", parseError)
              }
            }
          }

          if (validJson) {
            const { useMindMapStore } = await import("../store/mindMapStore")
            const store = useMindMapStore.getState()
            const { usePreviewMindMapStore } = await import("../store/previewMindMapStore")
            const previewStore = usePreviewMindMapStore.getState()

            // Process Spotify and YouTube nodes to get proper URLs
            if (validJson.nodes) {
              const { searchTracks } = await import("./spotifySearch")
              const { searchVideos } = await import("./youtubeSearch")

              // Process each node that needs URL resolution
              for (const node of validJson.nodes) {
                if (node.type === "spotify") {
                  try {
                    // Search Spotify using the provided track/artist name
                    const searchResult = await searchTracks(node.data.label)
                    if (searchResult && searchResult.length > 0) {
                      // Assign URL to spotifyUrl field for Spotify nodes
                      node.data.spotifyUrl = searchResult[0].external_urls.spotify
                    }
                  } catch (error) {
                    console.error("Failed to fetch Spotify URL:", error)
                  }
                } else if (node.type === "youtube" || node.type === "youtube-video") {
                  try {
                    console.log("Processing YouTube node:", node.data)
                    // Initialize videoUrl field if not already set
                    if (!node.data.videoUrl || node.data.videoUrl === node.data.label) {
                      // Search YouTube using the provided video title/description
                      console.log("Initiating YouTube search for:", node.data.label)
                      const searchResult = await searchVideos(node.data.label)
                      console.log("YouTube search results:", searchResult)

                      if (searchResult && searchResult.length > 0) {
                        // Assign URL to videoUrl field for YouTube nodes
                        node.data.videoUrl = searchResult[0].url
                        console.log("Successfully assigned YouTube URL:", node.data.videoUrl)
                      } else {
                        console.warn(`No YouTube results found for: ${node.data.label}`)
                        // Set a default value to indicate no results were found
                        node.data.videoUrl = null
                      }
                    }
                    // Ensure type is set correctly
                    node.data.type = "youtube-video"
                  } catch (error) {
                    console.error("Failed to fetch YouTube URL:", error)
                    // Ensure we set videoUrl to null in case of error
                    node.data.videoUrl = null
                  }
                }
              }
            }

            // Apply AI-suggested changes to the mindmap
            store.proposeAIChanges(
              mindMapData.id,
              validJson.nodes,
              validJson.edges,
              validJson.title || mindMapData.title,
            )

            // Save AI-suggested changes to the preview store
            // Use setPreviewMap for the first version, addPreviewMapVersion for subsequent versions
            const existingVersions = previewStore.getVersionCount(mindMapData.id)
            if (existingVersions === 0) {
              previewStore.setPreviewMap(
                mindMapData.id,
                validJson.nodes,
                validJson.edges,
                validJson.title || mindMapData.title,
                conversationalResponse, // Pass the AI response text
              )
            } else if (existingVersions < 3) {
              previewStore.addPreviewMapVersion(
                mindMapData.id,
                validJson.nodes,
                validJson.edges,
                validJson.title || mindMapData.title,
                conversationalResponse, // Pass the AI response text
              )
            }

            console.log(`[AI Service] Finished editing mindmap: ${mindMapData.id}`)
          } else {
            console.error("No valid JSON structure found in AI response")
          }
        } catch (error) {
          console.error("Failed to process AI mindmap suggestions:", error)
        }
      }

      // Return only the conversational part
      return conversationalResponse
    } catch (error) {
      console.error("Error generating AI response:", error)
      throw error
    }
  }

  getBotConfig() {
    return this.config
  }

  getCurrentBot() {
    return aiBots.find((bot) => bot.id === this.currentBotId) || aiBots[0]
  }

  setCurrentBot(botId: string) {
    const bot = aiBots.find((b) => b.id === botId)
    if (bot) {
      this.currentBotId = botId
    }
  }

  getAllBots() {
    return aiBots
  }

  /**
   * Generate AI content specifically for mindmap AI Fill feature
   * This is a standalone method that doesn't rely on chat conversations
   */
  async generateMindMapContent(prompt: string, mindMapData: any): Promise<string> {
    await this.ensurePublicMindmapsLoaded();
    const aiSettings = useAISettingsStore.getState();

    try {
      const currentBot = this.getCurrentBot()
      
      // Determine if this is a full generation or hierarchical expansion
      const isFullGeneration = mindMapData.isFullGeneration !== false;
      const isHierarchicalExpansion = !isFullGeneration && mindMapData.selectedNodeId;
      
      // Analyze existing hierarchy for better context awareness
      let hierarchyAnalysis = "";
      if (isHierarchicalExpansion) {
        // Use branch context if available, otherwise fall back to analyzing the nodes
        const branchNodes = mindMapData.branchContext?.branchNodes || mindMapData.nodes.filter((n: any) => 
          n.id === mindMapData.selectedNodeId || mindMapData.nodes.some((node: any) => 
            mindMapData.edges.some((e: any) => e.source === mindMapData.selectedNodeId && e.target === node.id)
          )
        );
        const branchEdges = mindMapData.branchContext?.branchEdges || mindMapData.edges;
        
        const selectedNode = branchNodes.find((n: any) => n.id === mindMapData.selectedNodeId);
        const childNodes = branchNodes.filter((n: any) => 
          branchEdges.some((e: any) => e.source === mindMapData.selectedNodeId && e.target === n.id)
        );
        const grandchildNodes = branchNodes.filter((n: any) => 
          childNodes.some((child: any) => 
            branchEdges.some((e: any) => e.source === child.id && e.target === n.id)
          )
        );

        hierarchyAnalysis = `
        EXISTING HIERARCHY ANALYSIS:
        - Selected Node: "${selectedNode?.data?.label}" (ID: ${mindMapData.selectedNodeId})
        - Direct Children: ${childNodes.length > 0 ? childNodes.map((n: any) => `"${n.data?.label}"`).join(', ') : 'None'}
        - Grandchildren: ${grandchildNodes.length > 0 ? grandchildNodes.map((n: any) => `"${n.data?.label}"`).join(', ') : 'None'}
        - Total nodes in branch: ${branchNodes.length}
        
        CONTEXT-AWARE INSTRUCTIONS:
        ${childNodes.length > 0 ? `
        - This node already has ${childNodes.length} direct child(ren): ${childNodes.map((n: any) => `"${n.data?.label}"`).join(', ')}
        - You can either:
          a) Add NEW sibling nodes at the same level as existing children
          b) Add NEW child nodes to the existing children (creating grandchildren)
          c) Create NEW sub-branches with multiple levels
        - Consider the existing content to avoid duplication and ensure logical flow
        ` : `
        - This node currently has no children - you can create a new hierarchical structure
        - Add multiple child nodes that break down the topic into logical subtopics
        `}`;
      }
      
      // Prepare the enhanced prompt with mindmap context
      let mindMapContext = `
        You are an AI assistant helping with mindmap editing. `;
      
      if (isFullGeneration) {
        mindMapContext += `The user wants to generate a complete mindmap structure.

        Current mindmap structure:
        ${JSON.stringify(mindMapData, null, 2)}

        INSTRUCTIONS: Generate a complete new mindmap structure in the same JSON format.`;
      } else {
        mindMapContext += `The user wants to expand a specific branch of their existing mindmap.

        COMPLETE MINDMAP STRUCTURE (for context):
        ${JSON.stringify({ nodes: mindMapData.nodes, edges: mindMapData.edges, title: mindMapData.title }, null, 2)}

        TARGET EXPANSION BRANCH (selected node: "${mindMapData.selectedNodeId}" - "${mindMapData.selectedNodeLabel}"):
        ${mindMapData.branchContext ? JSON.stringify({ 
          targetNode: mindMapData.selectedNodeId,
          branchNodes: mindMapData.branchContext.branchNodes, 
          branchEdges: mindMapData.branchContext.branchEdges 
        }, null, 2) : 'Branch context not available'}

        Full mindmap context: ${JSON.stringify(mindMapData.fullMindmapContext, null, 2)}

        ${hierarchyAnalysis}

        SMART EXPANSION INSTRUCTIONS: 
        - You can add content in multiple ways:
          a) Add NEW child nodes directly to the selected node ("${mindMapData.selectedNodeId}")
          b) Add NEW child nodes to EXISTING child nodes (creating grandchildren/deeper hierarchy)
          c) Add NEW sibling nodes to existing children
        - Analyze the existing structure and choose the most logical approach
        - If existing children are broad topics that could benefit from subtopics, add children to them
        - If the selected node needs more main branches, add direct children
        - Keep ALL existing nodes exactly as they are
        - Only ADD new nodes and edges, do not modify or remove existing ones
        - New nodes should be relevant to the topics in the hierarchy
        - Connect new nodes appropriately to form a coherent structure
        - Be intelligent about existing content - complement and expand rather than duplicate
        - CRITICAL: Return the COMPLETE mindmap structure including ALL existing nodes and edges PLUS your new additions`;
      }

      mindMapContext += `

        🚨🚨🚨 CRITICAL ID UNIQUENESS REQUIREMENTS - READ CAREFULLY 🚨🚨🚨
        ⚠️  DUPLICATE IDs WILL BREAK THE APPLICATION AND CAUSE CRASHES ⚠️
        
        ABSOLUTE REQUIREMENTS:
        - NEVER EVER use duplicate node IDs - each node must have a completely unique ID
        - NEVER EVER use duplicate edge IDs - each edge must have a completely unique ID
        - When creating new nodes, use unique timestamp IDs that don't match any existing IDs
        - When creating new edges, ensure the edge ID is unique and doesn't already exist
        - IF YOU CREATE DUPLICATE IDs, THE APPLICATION WILL CRASH AND FAIL
        
        🔴 EXAMPLES OF WHAT NOT TO DO (WILL CRASH):
        - Two nodes with ID "1746261489421" 
        - Two edges with ID "reactflow__edge-1746260464978-1746260464994"
        
        ✅ EXAMPLES OF CORRECT UNIQUE IDs:
        - Node IDs: "1746261489421", "1746261489422", "1746261489423" (each different)
        - Edge IDs: "reactflow__edge-1746261489421-1746261489422", "reactflow__edge-1746261489422-1746261489423"
        
        📝 ID GENERATION RULES:
        - Use current timestamp + increment for each new node (e.g., Date.now() + 1, Date.now() + 2, etc.)
        - NEVER reuse an existing ID from the mindmap data provided above
        - Check ALL existing node and edge IDs before creating new ones
        - If you're adding multiple new nodes, make sure each has a different timestamp (e.g., 1746261489421, 1746261489422, 1746261489423, etc.)

        Here are some example mindmaps for reference on proper structure and formatting:
        ${JSON.stringify(this.exampleMindmaps, null, 2)}

        STRICT RULES FOR MINDMAP MODIFICATIONS:

        1. Response Format Rules:
           - Same JSON format as sent map or the exampleMindmaps. 

        2. Node Modification Rules:
           - CANNOT delete the root node (id: "1")
           - 🚨 CRITICAL: Node IDs must be COMPLETELY UNIQUE - never reuse or duplicate any ID 🚨
           - 🚨 CRITICAL: Generate node IDs using unique timestamps - each new node must have a different timestamp 🚨
           - 🚨 CRITICAL: NEVER use the same ID for multiple nodes - this will break the application 🚨
           - Example: if one node has ID "1746261489421", the next must be "1746261489422" or higher
           - If adding multiple new nodes, ensure each has a different timestamp ID
           - When adding 3 new nodes, use IDs like: "1746261489421", "1746261489422", "1746261489423"
           - SCAN the existing mindmap data for ALL existing IDs before creating new ones
           - NEVER reuse any ID that already exists in the mindmap
           - Must preserve all required node properties
           - In style object, can ONLY modify "background" color
           - Must preserve all other style properties exactly as provided`;

      if (isHierarchicalExpansion) {
        mindMapContext += `
           - MUST include all existing nodes unchanged in the response
           - Only add NEW nodes with NEW unique timestamp IDs
           - Do not modify any existing node properties, positions, or styles
           - SMART EXPANSION: You can connect new nodes to ANY existing node in the branch, not just the selected node
           - Consider which existing nodes would benefit from child nodes based on their content and context
           - If an existing child node represents a broad topic, feel free to add children to it to create subtopics`;
      }

      mindMapContext += `
           - For Spotify nodes, only provide the track/album/artist name - the actual URL will be resolved through SpotifySearch
           - For YouTube nodes:
             * Provide simple, general search terms that a user would typically use on YouTube
             * Keep titles concise and focused on main topic/content
             * Avoid overly specific or complex descriptions
             * Focus on commonly searched terms for better video availability
             * Examples: "Learn Python Basics", "Taylor Swift Shake It Off", "Easy Pasta Recipe"
             * The actual URL will be resolved through YouTubeSearch

        3. Edge Rules:
           - Edge IDs must follow format: "reactflow__edge-[source]-[target]"
           - 🚨 CRITICAL: Edge IDs must be COMPLETELY UNIQUE - never create duplicate edge IDs 🚨  
           - 🚨 CRITICAL: SCAN all existing edge IDs before creating new ones 🚨
           - 🚨 CRITICAL: If multiple edges connect the same source and target, add a unique suffix 🚨
           - Examples: "reactflow__edge-[source]-[target]-1", "reactflow__edge-[source]-[target]-2", etc.
           - NEVER reuse any edge ID that already exists in the mindmap
           - Cannot create edges without valid source and target nodes`;

      if (isHierarchicalExpansion) {
        mindMapContext += `
           - MUST include all existing edges unchanged in the response
           - Only add NEW edges connecting new nodes to existing nodes OR connecting new nodes to each other
           - You can connect new nodes to ANY existing node in the provided branch structure
           - Choose parent nodes for new nodes based on semantic relevance and logical hierarchy`;
      }

      mindMapContext += `

        4. Data Integrity Rules:
           - Must maintain all existing metadata fields
           - Cannot modify createdAt timestamp
           - Must update updatedAt timestamp
           - Cannot delete or edit node border settings
           - Cannot modify text color
           - Must preserve all social/media-specific node properties

        5. Special Node Rules:
           - Social media nodes usernames (label) do not need an "@" symbol, simply the username is enough
           - For Spotify nodes, only specify the track/album/artist name - do not include full URLs
           - Spotify nodes are wide and should be a bit further away from each other and other nodes
           - For YouTube nodes, only specify the video title - do not include full URLs
          
        6. Other:
          - The title of the map should be at maximum 20 characters long`;

      if (isHierarchicalExpansion) {
        mindMapContext += `
          - DO NOT change the existing mindmap title
          - Position new nodes appropriately relative to their parent nodes`;
      }

      mindMapContext += `
          - Study the node positioning from the example mindmaps, but do not copy the exact positioning from the examples and keep the maps symmetrical.
          - Avoid using white as the background color because the text color is white

        ${isHierarchicalExpansion ? 
          'CRITICAL: You must return the complete mindmap structure including ALL existing nodes and edges plus the new additions. Do not omit any existing content.' : 
          'Generate a complete new mindmap structure.'}

        🚨🚨🚨 FINAL REMINDER - ABSOLUTELY CRITICAL 🚨🚨🚨
        Before you generate your response, REMEMBER:
        ✅ Every node ID must be UNIQUE - never duplicate any ID
        ✅ Every edge ID must be UNIQUE - never duplicate any ID  
        ✅ Check all existing IDs in the mindmap data provided above
        ✅ Use incremental timestamps for new node IDs (e.g., 1746261489421, 1746261489422, 1746261489423)
        ❌ Duplicate IDs will crash the application and cause errors
        ❌ NEVER reuse any existing node or edge ID
        
        PROMPT INTERPRETATION GUIDELINES:
        ${isHierarchicalExpansion ? `
        - If the user's prompt mentions specific topics or areas, focus on adding content related to those areas
        - If the user's prompt suggests expanding existing children, add content to those specific branches
        - If the user's prompt is general, intelligently analyze the existing structure and add complementary content
        - Always consider the existing hierarchy when deciding where to place new nodes
        ` : ''}
      `

      // Enhanced prompt processing for better context understanding
      let enhancedPrompt = prompt;
      if (isHierarchicalExpansion && prompt.trim()) {
        // Analyze the user's prompt for specific intentions
        const promptLower = prompt.toLowerCase();
        const hasSpecificTopics = /add|include|expand|more about|details on|subtopics for/.test(promptLower);
        const mentionsExisting = /existing|current|already have/.test(promptLower);
        
        if (hasSpecificTopics || mentionsExisting) {
          enhancedPrompt = `CONTEXT-AWARE REQUEST: ${prompt}

          Based on the existing hierarchy shown above, ${mentionsExisting ? 'consider the current structure and' : ''} ${hasSpecificTopics ? 'focus on the specific topics mentioned in the request.' : 'add relevant content.'}`;
        }
      }

      const messages = [
        { role: "system", content: currentBot.systemPrompt + mindMapContext },
        { role: "user", content: enhancedPrompt },
      ]

      // Make request to Portkey API
      // Get model from aiSettingsStore (global default)
  // Use existing aiSettings variable (already declared above)
  const model = aiSettings.defaultModel;
      const response = await fetch('https://api.portkey.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messages,
          temperature: currentBot.temperature,
          max_tokens: currentBot.maxTokens
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Portkey API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const responseText = data.choices[0]?.message?.content || 'No response generated'

      // Extract the conversational part and JSON part
      let conversationalResponse = responseText
      let jsonStartIndex = responseText.indexOf('{')

      if (jsonStartIndex !== -1) {
        // Extract the conversational part (everything before the JSON) and clean it up
        conversationalResponse = responseText.substring(0, jsonStartIndex).replace(/\s+$/, '')
      }

      // Process AI suggestions for mindmap updates
      console.log(`[AI Service] Started editing mindmap: ${mindMapData.id}`)
      try {
        // Extract JSON suggestions from the response using a more robust approach
        let validJson = null

        if (jsonStartIndex !== -1) {
          let bracketCount = 0
          let jsonEndIndex = -1

          // Parse through the response to find matching brackets
          for (let i = jsonStartIndex; i < responseText.length; i++) {
            if (responseText[i] === "{") bracketCount++
            if (responseText[i] === "}") bracketCount--

            if (bracketCount === 0) {
              jsonEndIndex = i + 1
              break
            }
          }

          if (jsonEndIndex !== -1) {
            const jsonStr = responseText.substring(jsonStartIndex, jsonEndIndex)

            try {
              // Clean and parse the JSON string
              const normalizedJson = jsonStr
                .replace(/[\n\r\t]/g, "")
                .replace(/\s+/g, " ")
                .trim()

              const parsed = JSON.parse(normalizedJson)
              if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
                validJson = parsed
              } else {
                console.error("Parsed JSON does not have required nodes and edges arrays")
              }
            } catch (parseError) {
              console.error("Failed to parse JSON:", parseError)
            }
          }
        }

        if (validJson) {
          const { useMindMapStore } = await import("../store/mindMapStore")
          const store = useMindMapStore.getState()
          const { usePreviewMindMapStore } = await import("../store/previewMindMapStore")
          const previewStore = usePreviewMindMapStore.getState()

          // CRITICAL FIX: Validate and ensure unique node IDs
          if (validJson.nodes) {
            const nodeIdSet = new Set<string>()
            const duplicateIds = new Set<string>()
            
            // First pass: identify duplicate IDs
            validJson.nodes.forEach((node: any) => {
              if (nodeIdSet.has(node.id)) {
                duplicateIds.add(node.id)
              } else {
                nodeIdSet.add(node.id)
              }
            })
            
            // Second pass: generate new unique IDs for duplicates
            if (duplicateIds.size > 0) {
              console.warn(`Found ${duplicateIds.size} duplicate node IDs, generating new unique IDs:`, Array.from(duplicateIds))
              
              // Track all existing IDs to ensure new ones are truly unique
              const allExistingIds = new Set(validJson.nodes.map((node: any) => node.id))
              
              validJson.nodes = validJson.nodes.map((node: any) => {
                if (duplicateIds.has(node.id)) {
                  let newId: string
                  let attempts = 0
                  do {
                    newId = Date.now().toString() + Math.random().toString(36).substr(2, 9) + (attempts > 0 ? `-${attempts}` : '')
                    attempts++
                  } while (allExistingIds.has(newId) && attempts < 100)
                  
                  if (attempts >= 100) {
                    console.error("Failed to generate unique node ID after 100 attempts!")
                    newId = `unique-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                  }
                  
                  console.log(`Replacing duplicate node ID ${node.id} with ${newId}`)
                  allExistingIds.add(newId)
                  
                  // Update any edges that reference this node
                  validJson.edges = validJson.edges.map((edge: any) => {
                    const newSource = edge.source === node.id ? newId : edge.source
                    const newTarget = edge.target === node.id ? newId : edge.target
                    
                    // Only update edge ID if this edge was affected by the node ID change
                    if (edge.source === node.id || edge.target === node.id) {
                      // We'll regenerate ALL edge IDs in the next step to ensure uniqueness
                      return {
                        ...edge,
                        source: newSource,
                        target: newTarget
                        // Don't update ID here - let the comprehensive edge validation handle it
                      }
                    }
                    return edge
                  })
                  
                  return { ...node, id: newId }
                }
                return node
              })
              
              // Final validation: ensure all node IDs are now unique
              const finalNodeIds = new Set(validJson.nodes.map((node: any) => node.id))
              if (finalNodeIds.size !== validJson.nodes.length) {
                console.error("CRITICAL: Still have duplicate node IDs after deduplication!")
              } else {
                console.log("✓ All node IDs are now unique")
              }
            }
          }

          // CRITICAL FIX: Validate and ensure unique edge IDs
          if (validJson.edges) {
            console.log("Starting edge ID validation...")
            
            // First, let's regenerate ALL edge IDs to ensure they follow the correct format
            // and eliminate any potential issues from AI generation
            const edgeIdTracker = new Set<string>()
            
            validJson.edges = validJson.edges.map((edge: any, edgeIndex: number) => {
              // Generate a proper edge ID based on source and target
              let baseEdgeId = `reactflow__edge-${edge.source}-${edge.target}`
              let finalEdgeId = baseEdgeId
              let attempts = 0
              
              // If this base ID already exists, append a unique suffix
              while (edgeIdTracker.has(finalEdgeId)) {
                attempts++
                const timestamp = Date.now()
                const random = Math.random().toString(36).substr(2, 5)
                finalEdgeId = `${baseEdgeId}-${timestamp}-${random}-${attempts}`
                
                // Prevent infinite loop
                if (attempts > 100) {
                  finalEdgeId = `${baseEdgeId}-${timestamp}-${Math.random().toString(36).substr(2, 9)}-fallback-${edgeIndex}`
                  break
                }
              }
              
              edgeIdTracker.add(finalEdgeId)
              
              if (edge.id !== finalEdgeId) {
                console.log(`Regenerated edge ID: ${edge.id} -> ${finalEdgeId}`)
              }
              
              return { ...edge, id: finalEdgeId }
            })
            
            // Final validation: ensure all edge IDs are now unique
            const finalEdgeIds = validJson.edges.map((edge: any) => edge.id)
            const uniqueEdgeIds = new Set(finalEdgeIds)
            
            if (uniqueEdgeIds.size !== finalEdgeIds.length) {
              console.error("CRITICAL: Still have duplicate edge IDs after regeneration!")
              console.error("Duplicate edge IDs:", finalEdgeIds.filter((id: string, index: number) => finalEdgeIds.indexOf(id) !== index))
              
              // Emergency fix: Add random suffixes to any remaining duplicates
              const seenIds = new Set<string>()
              validJson.edges = validJson.edges.map((edge: any) => {
                if (seenIds.has(edge.id)) {
                  const emergencyId = `${edge.id}-emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                  console.log(`Emergency fix: ${edge.id} -> ${emergencyId}`)
                  seenIds.add(emergencyId)
                  return { ...edge, id: emergencyId }
                } else {
                  seenIds.add(edge.id)
                  return edge
                }
              })
            } else {
              console.log("✓ All edge IDs are now unique")
            }
          }

          // FINAL COMPREHENSIVE VALIDATION: Double-check uniqueness before storing
          const allFinalNodeIds = validJson.nodes.map((node: any) => node.id)
          const allFinalEdgeIds = validJson.edges.map((edge: any) => edge.id)
          const allUniqueNodeIds = new Set(allFinalNodeIds)
          const allUniqueEdgeIds = new Set(allFinalEdgeIds)
          
          console.log(`Final validation: ${allFinalNodeIds.length} nodes, ${allFinalEdgeIds.length} edges`)
          console.log(`Unique counts: ${allUniqueNodeIds.size} unique nodes, ${allUniqueEdgeIds.size} unique edges`)
          
          if (allUniqueNodeIds.size !== allFinalNodeIds.length) {
            const duplicateNodeIds = allFinalNodeIds.filter((id: string, index: number) => allFinalNodeIds.indexOf(id) !== index)
            console.error("FINAL VALIDATION FAILED: Duplicate node IDs still exist:", duplicateNodeIds)
            throw new Error(`Duplicate node IDs detected after processing: ${duplicateNodeIds.join(', ')}`)
          }
          
          if (allUniqueEdgeIds.size !== allFinalEdgeIds.length) {
            const duplicateEdgeIds = allFinalEdgeIds.filter((id: string, index: number) => allFinalEdgeIds.indexOf(id) !== index)
            console.error("FINAL VALIDATION FAILED: Duplicate edge IDs still exist:", duplicateEdgeIds)
            throw new Error(`Duplicate edge IDs detected after processing: ${duplicateEdgeIds.join(', ')}`)
          }
          
          console.log("✓ FINAL VALIDATION PASSED: All IDs are unique")

          // Process Spotify and YouTube nodes to get proper URLs
          if (validJson.nodes) {
            const { searchTracks } = await import("./spotifySearch")
            const { searchVideos } = await import("./youtubeSearch")

            // Process each node that needs URL resolution
            for (const node of validJson.nodes) {
              if (node.type === "spotify") {
                try {
                  // Search Spotify using the provided track/artist name
                  const searchResult = await searchTracks(node.data.label)
                  if (searchResult && searchResult.length > 0) {
                    // Assign URL to spotifyUrl field for Spotify nodes
                    node.data.spotifyUrl = searchResult[0].external_urls.spotify
                  }
                } catch (error) {
                  console.error("Failed to fetch Spotify URL:", error)
                }
              } else if (node.type === "youtube" || node.type === "youtube-video") {
                try {
                  console.log("Processing YouTube node:", node.data)
                  // Initialize videoUrl field if not already set
                  if (!node.data.videoUrl || node.data.videoUrl === node.data.label) {
                    // Search YouTube using the provided video title/description
                    console.log("Initiating YouTube search for:", node.data.label)
                    const searchResult = await searchVideos(node.data.label)
                    console.log("YouTube search results:", searchResult)

                    if (searchResult && searchResult.length > 0) {
                      // Assign URL to videoUrl field for YouTube nodes
                      node.data.videoUrl = searchResult[0].url
                      console.log("Successfully assigned YouTube URL:", node.data.videoUrl)
                    } else {
                      console.warn(`No YouTube results found for: ${node.data.label}`)
                      // Set a default value to indicate no results were found
                      node.data.videoUrl = null
                    }
                  }
                  // Ensure type is set correctly
                  node.data.type = "youtube-video"
                } catch (error) {
                  console.error("Failed to fetch YouTube URL:", error)
                  // Ensure we set videoUrl to null in case of error
                  node.data.videoUrl = null
                }
              }
            }
          }

          // FINAL COMPREHENSIVE VALIDATION: Double-check uniqueness before storing
          const finalNodeIds = validJson.nodes.map((node: any) => node.id)
          const finalEdgeIds = validJson.edges.map((edge: any) => edge.id)
          const uniqueNodeIds = new Set(finalNodeIds)
          const uniqueEdgeIds = new Set(finalEdgeIds)
          
          if (uniqueNodeIds.size !== finalNodeIds.length) {
            console.error("FINAL VALIDATION FAILED: Duplicate node IDs still exist:", finalNodeIds.filter((id: string, index: number) => finalNodeIds.indexOf(id) !== index))
            throw new Error("Duplicate node IDs detected after processing")
          }
          
          if (uniqueEdgeIds.size !== finalEdgeIds.length) {
            console.error("FINAL VALIDATION FAILED: Duplicate edge IDs still exist:", finalEdgeIds.filter((id: string, index: number) => finalEdgeIds.indexOf(id) !== index))
            throw new Error("Duplicate edge IDs detected after processing")
          }
          
          console.log("✓ FINAL VALIDATION PASSED: All IDs are unique")

          // Apply AI-suggested changes to the mindmap
          store.proposeAIChanges(
            mindMapData.id,
            validJson.nodes,
            validJson.edges,
            validJson.title || mindMapData.title,
          )

          // Save AI-suggested changes to the preview store
          // Use setPreviewMap for the first version, addPreviewMapVersion for subsequent versions
          const existingVersions = previewStore.getVersionCount(mindMapData.id)
          if (existingVersions === 0) {
            previewStore.setPreviewMap(
              mindMapData.id,
              validJson.nodes,
              validJson.edges,
              validJson.title || mindMapData.title,
            )
          } else if (existingVersions < 3) {
            previewStore.addPreviewMapVersion(
              mindMapData.id,
              validJson.nodes,
              validJson.edges,
              validJson.title || mindMapData.title,
            )
          }

          console.log(`[AI Service] Finished editing mindmap: ${mindMapData.id}`)
        } else {
          console.error("No valid JSON structure found in AI response")
        }
      } catch (error) {
        console.error("Failed to process AI mindmap suggestions:", error)
      }

      // Return only the conversational part
      return conversationalResponse
    } catch (error) {
      console.error("Error generating mindmap AI content:", error)
      throw error
    }
  }
}

export const aiService = new AIService()

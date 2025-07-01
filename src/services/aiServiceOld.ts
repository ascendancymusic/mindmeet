import { GoogleGenerativeAI } from "@google/generative-ai"
import { getAIBotConfig, aiBots } from "../config/aiBot"
import AI_tools_mindmap from "../examples/AI_tools_mindmap.json"
import Music_mindmap from "../examples/Music_mindmap.json"
import simple_mindmap from "../examples/simple_mindmap.json"
import social_links_mindmap from "../examples/social_links_mindmap.json"
import Math_Course_mindmap from "../examples/Math_Course_mindmap.json"
import All_Containing_Map from "../examples/All_Containing_Map.json"

class AIService {
  private genAI: GoogleGenerativeAI
  private model: any
  private config = getAIBotConfig()
  private currentBotId = "bigglesmooth"
  private chatHistory: Map<number, Array<{ role: string; text: string }>> = new Map()
  private exampleMindmaps = [AI_tools_mindmap, Music_mindmap, simple_mindmap, social_links_mindmap, Math_Course_mindmap, All_Containing_Map]
  private maxHistoryLength = 10;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("Gemini API key is not configured")
    }
    this.config.apiKey = apiKey
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: this.config.model })
  }

  async generateResponse(message: string, conversationId: number, mindMapData?: any): Promise<string> {
    try {
      const currentBot = this.getCurrentBot()

      // Initialize chat history for new conversations
      if (!this.chatHistory.has(conversationId)) {
        this.chatHistory.set(conversationId, [])
      }

      // Get existing chat history
      const history = this.chatHistory.get(conversationId)!

      // Add user message to history with mindmap data if present
      const messageWithMetadata = mindMapData
        ? `${message}\n[Mindmap Metadata: ${JSON.stringify(mindMapData)}]`
        : message
      history.push({ role: "user", text: messageWithMetadata })

      // Trim history to the maximum length
      if (history.length > this.maxHistoryLength) {
        history.splice(0, history.length - this.maxHistoryLength)
      }

      // Prepare conversation history for API request with enhanced mindmap context
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

      const contents = [
        { role: "user", parts: [{ text: currentBot.systemPrompt + mindMapContext }] },
        ...history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      ]

      const result = await this.model.generateContent({
        contents,
        generationConfig: {
          temperature: currentBot.temperature,
          maxOutputTokens: currentBot.maxTokens,
        },
      })

      const response = result.response
      const responseText = response.text()

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
      this.model = this.genAI.getGenerativeModel({ model: bot.model })
    }
  }

  getAllBots() {
    return aiBots
  }
}

export const aiService = new AIService()

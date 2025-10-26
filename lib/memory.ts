import { Redis } from "@upstash/redis";
import { Pinecone } from "@pinecone-database/pinecone";
import { Embeddings } from "@langchain/core/embeddings";
import { AsyncCallerParams } from "@langchain/core/utils/async_caller";


export type CompanionKey = {
  companionName: string;
  modelName: string;
  userId: string;
};

// Custom HuggingFace Embeddings class
class HuggingFaceEmbeddings extends Embeddings {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, params: AsyncCallerParams = {}) {
    super(params);
    this.apiKey = apiKey;
    this.apiUrl = "https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-MiniLM-L6-v2";
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.embedQuery(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: text
        })
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error calling Hugging Face API:", error);
      throw error;
    }
  }
}

export class MemoryManager {
  private static instance: MemoryManager;
  private history: Redis;
  private vectorDBClient: Pinecone;

  public constructor() {
    this.history = Redis.fromEnv();
    this.vectorDBClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }

  public async init() {
    // Initialization if needed
  }

  public async vectorSearch(
    recentChatHistory: string,
    companionFileName: string
  ) {
    try {
      const pineconeIndex = this.vectorDBClient.index(
        process.env.PINECONE_INDEX! || ""
      );

      const embeddings = new HuggingFaceEmbeddings(process.env.HUGGINGFACE_API_KEY!);
      const queryEmbedding = await embeddings.embedQuery(recentChatHistory);

      // Use Pinecone's native query method (v6 syntax)
      const queryResponse = await pineconeIndex.query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true,
        filter: {
          fileName: { $eq: companionFileName }
        }
      });

      // Vector search
      const similarDocs = queryResponse.matches?.map(match => ({
        pageContent: match.metadata?.text || match.metadata?.content || "",
        metadata: match.metadata || {}
      })) || [];

      return similarDocs;
    } catch (err) {
      console.log("WARNING: failed to get vector search results.", err);
      return [];
    }
  }

  public static async getInstance(): Promise<MemoryManager> {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
      await MemoryManager.instance.init();
    }
    return MemoryManager.instance;
  }

  private generateRedisCompanionKey(companionKey: CompanionKey): string {
    return `${companionKey.companionName}-${companionKey.modelName}-${companionKey.userId}`;
  }

  public async writeToHistory(text: string, companionKey: CompanionKey) {
    if (!companionKey || typeof companionKey.userId == "undefined") {
      console.log("Companion key set incorrectly");
      return "";
    }

    const key = this.generateRedisCompanionKey(companionKey);
    //zadd and zrange is redis functionality
    const result = await this.history.zadd(key, {
      score: Date.now(),
      member: text,
    });

    return result;
  }

  public async readLatestHistory(companionKey: CompanionKey): Promise<string> {
    if (!companionKey || typeof companionKey.userId == "undefined") {
      console.log("Companion key set incorrectly");
      return "";
    }

    const key = this.generateRedisCompanionKey(companionKey);
    let result = await this.history.zrange(key, 0, Date.now(), {
      byScore: true,
    });
 
    //to get the result we need
    result = result.slice(-30).reverse();
    const recentChats = result.reverse().join("\n");
    return recentChats;
  }

  //to see the chat history 
  public async seedChatHistory(
    seedContent: String,
    delimiter: string = "\n",
    companionKey: CompanionKey
  ) {
    const key = this.generateRedisCompanionKey(companionKey);
    if (await this.history.exists(key)) {
      console.log("User already has chat history");
      return;
    }

    const content = seedContent.split(delimiter);
    let counter = 0;
    for (const line of content) {
      await this.history.zadd(key, { score: counter, member: line });
      counter += 1;
    }
  }
}
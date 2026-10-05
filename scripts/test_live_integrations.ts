import { extractYouTubeVideo } from "../src/lib/extractors/youtube";
import { extractRepository } from "../src/lib/extractors/repository";
import { extractArticleOrUrl } from "../src/lib/extractors/url";
import {
  generateSmartCaptureMetadata,
  analyzeSmartConnections,
  generateKnowledgeClustersAI,
  CandidateItemSummary,
} from "../src/lib/ai/gemma";

async function runLiveTests() {
  console.log("=== ECHO SHELF 2.0 LIVE INTEGRATION TEST MATRIX ===\n");

  // 1. YouTube Live Test
  console.log("[1/6] Testing YouTube Data API v3 (Live)...");
  try {
    const yt = await extractYouTubeVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    console.log("  -> SUCCESS: Title:", yt.titleHint, "| Channel:", yt.authorHint);
  } catch (err: unknown) {
    console.error("  -> FAILED YouTube:", err instanceof Error ? err.message : String(err));
  }

  // 2. GitHub Live Test
  console.log("\n[2/6] Testing GitHub Public API (Live)...");
  try {
    const gh = await extractRepository("https://github.com/facebook/react");
    console.log("  -> SUCCESS: Title:", gh.titleHint, "| Stars:", gh.sourceMetadata.stars);
  } catch (err: unknown) {
    console.error("  -> FAILED GitHub:", err instanceof Error ? err.message : String(err));
  }

  // 3. Web URL / Article Live Test
  console.log("\n[3/6] Testing Web URL / Article Extraction (Live)...");
  try {
    const web = await extractArticleOrUrl("https://example.com", "Article");
    console.log("  -> SUCCESS: Title:", web.titleHint, "| Length:", web.text.length);
  } catch (err: unknown) {
    console.error("  -> FAILED Web URL:", err instanceof Error ? err.message : String(err));
  }

  // 4. Gemma Smart Capture Live Test
  console.log("\n[4/6] Testing Gemma Smart Capture (Live inference via GEMINI_API_KEY)...");
  try {
    const metadata = await generateSmartCaptureMetadata({
      contentType: "Article",
      titleHint: "Introduction to Event-Driven Architecture",
      text: "Event-driven architecture (EDA) is a software design pattern where decoupled applications asynchronously publish and subscribe to events via a message broker. This enables high scalability, loose coupling, and fault isolation in distributed microservices.",
      sourceMetadata: {},
    });
    console.log("  -> SUCCESS Gemma Smart Capture:", {
      title: metadata.title,
      description: metadata.description.slice(0, 80) + "...",
      tags: metadata.tags,
    });
  } catch (err: unknown) {
    console.error("  -> FAILED Gemma Smart Capture:", err instanceof Error ? err.message : String(err));
  }

  // 5. Gemma Smart Connections Live Test
  console.log("\n[5/6] Testing Gemma Smart Connections (Live semantic analysis)...");
  try {
    const target: CandidateItemSummary = {
      id: "item_1",
      title: "Kafka Event Streaming Fundamentals",
      contentType: "Article",
      tags: ["kafka", "streaming", "events", "distributed-systems"],
      description: "Architecture of Apache Kafka topic partitions, consumer groups, and brokers.",
    };

    const candidates: CandidateItemSummary[] = [
      {
        id: "item_2",
        title: "Microservices with RabbitMQ & Event Loops",
        contentType: "Repository",
        tags: ["rabbitmq", "microservices", "event-driven", "distributed-systems"],
        description: "Hands-on implementation of asynchronous message passing across microservices.",
      },
      {
        id: "item_3",
        title: "French Bread Baking Guide",
        contentType: "Article",
        tags: ["baking", "food", "cooking"],
        description: "Step by step recipe for sourdough baguettes.",
      },
    ];

    const connections = await analyzeSmartConnections(target, candidates);
    console.log("  -> SUCCESS Smart Connections:", connections);
  } catch (err: unknown) {
    console.error("  -> FAILED Smart Connections:", err instanceof Error ? err.message : String(err));
  }

  // 6. Gemma Knowledge Clusters Live Test
  console.log("\n[6/6] Testing Gemma Knowledge Clusters (Live thematic synthesis)...");
  try {
    const clusterItems: CandidateItemSummary[] = [
      {
        id: "6ac2b69124af739cc59d4e5d",
        title: "Strategies for Improving Reading Comprehension and Retention",
        contentType: "Article",
        tags: ["learning", "cognition", "reading", "memory"],
        description: "Active reading strategies, Feynman technique, and retention frameworks.",
      },
      {
        id: "6ac2b6cd24af739cc59d4e5e",
        title: "The Five-Step Process for Creative Thinking and Innovation",
        contentType: "Article",
        tags: ["creativity", "thinking", "innovation", "problem-solving"],
        description: "How to connect disparate ideas and cultivate creative breakthroughs.",
      },
      {
        id: "6ac2b78424af739cc59d4e5f",
        title: "The Downside of the 80/20 Rule: Optimizing for the Past vs. Future",
        contentType: "Article",
        tags: ["productivity", "mental-models", "decision-making"],
        description: "Why aggressive Pareto optimization eliminates resilience and slack.",
      },
    ];

    const clusters = await generateKnowledgeClustersAI(clusterItems);
    console.log("  -> SUCCESS Knowledge Clusters:", clusters.map((c) => ({
      title: c.title,
      summary: c.summary,
      itemCount: c.itemIds.length,
      tags: c.tags,
    })));
  } catch (err: unknown) {
    console.error("  -> FAILED Knowledge Clusters:", err instanceof Error ? err.message : String(err));
  }

  console.log("\n=== ALL LIVE INTEGRATION TESTS COMPLETED ===");
}

runLiveTests();

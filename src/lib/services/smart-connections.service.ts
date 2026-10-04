import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SavedItem } from "@/models/SavedItem";
import { findPotentialConnections } from "./potential-connections.service";
import {
  analyzeSmartConnections,
  CandidateItemSummary,
  SmartConnectionEvaluation,
} from "@/lib/ai/gemma";

const ALLOWED_RELATIONSHIP_TYPES = new Set([
  "prerequisite",
  "extends",
  "complementary",
  "conceptual-overlap",
  "practical-application",
  "contrast",
  "alternative-approach",
  "implementation-detail",
]);

// Map reciprocal relationship types
const RECIPROCAL_RELATIONSHIP_MAP: Record<string, string> = {
  prerequisite: "extends",
  extends: "prerequisite",
  complementary: "complementary",
  "conceptual-overlap": "conceptual-overlap",
  "practical-application": "implementation-detail",
  "implementation-detail": "practical-application",
  contrast: "contrast",
  "alternative-approach": "alternative-approach",
};

export interface ProcessedConnection {
  connectedItemId: string;
  connectedItemTitle: string;
  relationshipType: string;
  strength: "strong" | "moderate";
  explanation: string;
}

/**
 * Runs the two-stage Smart Connections workflow for a saved item:
 * Stage 1: Deterministic candidate shortlist (top 5 by tag/keyword overlap)
 * Stage 2: Gemma semantic relationship analysis
 * Strictly user-isolated: all queries scope by userId.
 */
export async function generateAndSaveSmartConnections(
  userId: string,
  itemId: string
): Promise<{ addedConnections: ProcessedConnection[]; totalConnections: number }> {
  if (!userId || !itemId) {
    throw new Error("userId and itemId are required for Smart Connections.");
  }

  await connectToDatabase();

  // 1. Fetch target item strictly scoped to userId
  const targetItem = await SavedItem.findOne({ _id: itemId, userId }).exec();
  if (!targetItem) {
    throw new Error("Item not found or access denied.");
  }

  // 2. Stage 1: Deterministic candidate shortlist
  const candidates = await findPotentialConnections(userId, {
    excludeItemId: itemId,
    tags: targetItem.tags,
    title: targetItem.title,
    description: targetItem.description,
    limit: 5,
  });

  if (candidates.length === 0) {
    return { addedConnections: [], totalConnections: targetItem.connections.length };
  }

  // Prepare input for Gemma
  const targetSummary: CandidateItemSummary = {
    id: targetItem._id.toString(),
    title: targetItem.title,
    description: targetItem.description,
    contentType: targetItem.contentType,
    tags: targetItem.tags,
  };

  const candidateSummaries: CandidateItemSummary[] = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    contentType: c.contentType,
    tags: c.tags,
  }));

  // 3. Stage 2: Gemma semantic analysis
  let evaluations: SmartConnectionEvaluation[] = [];
  try {
    evaluations = await analyzeSmartConnections(targetSummary, candidateSummaries);
  } catch (err) {
    console.error("Gemma smart connection analysis failed:", err);
    throw new Error(`AI connection analysis failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (evaluations.length === 0) {
    return { addedConnections: [], totalConnections: targetItem.connections.length };
  }

  // 4. Validate & filter evaluations against real user-owned items
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const existingConnectedIds = new Set(
    targetItem.connections.map((c) => c.connectedItemId.toString())
  );

  const newConnectionsToAdd: ProcessedConnection[] = [];

  for (const evalResult of evaluations) {
    const candidate = candidateMap.get(evalResult.connectedItemId);

    // Anti-hallucination & validation checks
    if (!candidate) continue;
    if (evalResult.connectedItemId === itemId) continue;
    if (!ALLOWED_RELATIONSHIP_TYPES.has(evalResult.relationshipType)) continue;
    if (evalResult.strength !== "strong" && evalResult.strength !== "moderate") continue;
    if (existingConnectedIds.has(evalResult.connectedItemId)) continue;

    const strengthNumeric = evalResult.strength === "strong" ? 0.9 : 0.6;

    // Add to target item connections
    targetItem.connections.push({
      connectedItemId: new Types.ObjectId(evalResult.connectedItemId),
      relationshipType: evalResult.relationshipType,
      strength: strengthNumeric,
      explanation: evalResult.explanation,
    });

    existingConnectedIds.add(evalResult.connectedItemId);

    newConnectionsToAdd.push({
      connectedItemId: evalResult.connectedItemId,
      connectedItemTitle: candidate.title,
      relationshipType: evalResult.relationshipType,
      strength: evalResult.strength,
      explanation: evalResult.explanation,
    });

    // Reciprocal connection update on candidate item
    try {
      const reciprocalType =
        RECIPROCAL_RELATIONSHIP_MAP[evalResult.relationshipType] || "complementary";

      await SavedItem.updateOne(
        {
          _id: evalResult.connectedItemId,
          userId, // strictly scoped
          "connections.connectedItemId": { $ne: new Types.ObjectId(itemId) },
        },
        {
          $push: {
            connections: {
              connectedItemId: new Types.ObjectId(itemId),
              relationshipType: reciprocalType,
              strength: strengthNumeric,
              explanation: `Connected to "${targetItem.title}": ${evalResult.explanation}`,
            },
          },
        }
      ).exec();
    } catch (err) {
      console.error("Reciprocal connection update non-fatal error:", err);
    }
  }

  if (newConnectionsToAdd.length > 0) {
    await targetItem.save();
  }

  return {
    addedConnections: newConnectionsToAdd,
    totalConnections: targetItem.connections.length,
  };
}

import { NormalizedExtraction } from "./types";

const MAX_README_LENGTH = 12000;

interface RepoIdentifier {
  provider: "github" | "gitlab";
  ownerOrNamespace: string;
  repo: string;
  fullPath: string;
}

/**
 * Parses GitHub and GitLab repository URLs.
 */
export function parseRepositoryUrl(rawUrl: string): RepoIdentifier {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid repository URL format");
  }

  const hostname = url.hostname.toLowerCase();
  const cleanPath = url.pathname.replace(/^\/|\/$/g, "");
  const segments = cleanPath.split("/").filter(Boolean);

  if (hostname === "github.com" || hostname === "www.github.com") {
    if (segments.length < 2) {
      throw new Error("Invalid GitHub repository URL. Expected format: https://github.com/owner/repo");
    }
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/, "");
    return {
      provider: "github",
      ownerOrNamespace: owner,
      repo,
      fullPath: `${owner}/${repo}`,
    };
  }

  if (hostname === "gitlab.com" || hostname === "www.gitlab.com") {
    if (segments.length < 2) {
      throw new Error("Invalid GitLab repository URL. Expected format: https://gitlab.com/group/repo or https://gitlab.com/group/subgroup/repo");
    }
    const repo = segments[segments.length - 1].replace(/\.git$/, "");
    const namespace = segments.slice(0, -1).join("/");
    return {
      provider: "gitlab",
      ownerOrNamespace: namespace,
      repo,
      fullPath: `${namespace}/${repo}`,
    };
  }

  throw new Error("Unsupported repository provider. Only GitHub (github.com) and GitLab (gitlab.com) are currently supported.");
}

/**
 * Extracts metadata and README context from a GitHub or GitLab repository.
 */
export async function extractRepository(rawUrl: string): Promise<NormalizedExtraction> {
  const repoInfo = parseRepositoryUrl(rawUrl);

  if (repoInfo.provider === "github") {
    return await extractGitHubRepo(repoInfo);
  } else {
    return await extractGitLabRepo(repoInfo);
  }
}

async function extractGitHubRepo(info: RepoIdentifier): Promise<NormalizedExtraction> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "EchoShelf/2.0",
  };

  // Fetch repository metadata
  const metaRes = await fetch(`https://api.github.com/repos/${info.fullPath}`, { headers });

  if (!metaRes.ok) {
    if (metaRes.status === 404) {
      throw new Error(`GitHub repository '${info.fullPath}' not found or is private.`);
    }
    if (metaRes.status === 403 || metaRes.status === 429) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }
    throw new Error(`GitHub API error: HTTP ${metaRes.status}`);
  }

  const metaData = await metaRes.json();

  // Fetch README if available
  let readmeText = "";
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${info.fullPath}/readme`, { headers });
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      if (readmeData.content && readmeData.encoding === "base64") {
        readmeText = Buffer.from(readmeData.content, "base64").toString("utf-8");
      }
    }
  } catch {
    // README fetch failure is non-fatal; proceed with repository metadata
  }

  if (readmeText.length > MAX_README_LENGTH) {
    readmeText = readmeText.slice(0, MAX_README_LENGTH) + "... [truncated]";
  }

  const name = metaData.name || info.repo;
  const description = metaData.description || "";
  const stars = metaData.stargazers_count ?? 0;
  const language = metaData.language || "Unknown";
  const topics: string[] = Array.isArray(metaData.topics) ? metaData.topics : [];

  const combinedContent = [
    `Repository: ${info.fullPath}`,
    `Description: ${description}`,
    `Primary Language: ${language}`,
    `Stars: ${stars}`,
    topics.length > 0 ? `Topics: ${topics.join(", ")}` : "",
    readmeText ? `\nREADME:\n${readmeText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const avatarUrl = metaData.owner?.avatar_url;

  return {
    contentType: "Repository",
    titleHint: `${info.fullPath}: ${description ? description.slice(0, 80) : name}`,
    descriptionHint: description,
    text: combinedContent,
    previewImageUrl: avatarUrl,
    canonicalUrl: metaData.html_url || `https://github.com/${info.fullPath}`,
    authorHint: metaData.owner?.login,
    sourceMetadata: {
      provider: "github",
      repo: info.repo,
      owner: info.ownerOrNamespace,
      stars,
      language,
      topics,
      forks: metaData.forks_count,
    },
  };
}

async function extractGitLabRepo(info: RepoIdentifier): Promise<NormalizedExtraction> {
  const encodedPath = encodeURIComponent(info.fullPath);
  const headers = { "User-Agent": "EchoShelf/2.0" };

  const metaRes = await fetch(`https://gitlab.com/api/v4/projects/${encodedPath}`, { headers });

  if (!metaRes.ok) {
    if (metaRes.status === 404) {
      throw new Error(`GitLab project '${info.fullPath}' not found or is private.`);
    }
    throw new Error(`GitLab API error: HTTP ${metaRes.status}`);
  }

  const metaData = await metaRes.json();

  let readmeText = "";
  try {
    const readmeRes = await fetch(`https://gitlab.com/api/v4/projects/${encodedPath}/repository/files/README.md/raw?ref=main`, { headers });
    if (readmeRes.ok) {
      readmeText = await readmeRes.text();
    }
  } catch {
    // README fetch failure is non-fatal
  }

  if (readmeText.length > MAX_README_LENGTH) {
    readmeText = readmeText.slice(0, MAX_README_LENGTH) + "... [truncated]";
  }

  const name = metaData.name || info.repo;
  const description = metaData.description || "";
  const stars = metaData.star_count ?? 0;
  const topics: string[] = Array.isArray(metaData.topics) ? metaData.topics : [];

  const combinedContent = [
    `GitLab Repository: ${info.fullPath}`,
    `Description: ${description}`,
    `Stars: ${stars}`,
    topics.length > 0 ? `Topics: ${topics.join(", ")}` : "",
    readmeText ? `\nREADME:\n${readmeText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    contentType: "Repository",
    titleHint: `${info.fullPath}: ${description ? description.slice(0, 80) : name}`,
    descriptionHint: description,
    text: combinedContent,
    previewImageUrl: metaData.avatar_url || undefined,
    canonicalUrl: metaData.web_url || `https://gitlab.com/${info.fullPath}`,
    sourceMetadata: {
      provider: "gitlab",
      repo: info.repo,
      namespace: info.ownerOrNamespace,
      stars,
      topics,
    },
  };
}

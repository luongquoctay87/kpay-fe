import type { MetadataRoute } from "next";

/**
 * Private admin / payment portal — disallow all crawlers, including AI scrapers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "ChatGPT-User", disallow: "/" },
      { userAgent: "OAI-SearchBot", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
      { userAgent: "Googlebot", disallow: "/" },
      { userAgent: "Googlebot-Image", disallow: "/" },
      { userAgent: "Bingbot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "ClaudeBot", disallow: "/" },
      { userAgent: "Claude-Web", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
      { userAgent: "PerplexityBot", disallow: "/" },
      { userAgent: "Applebot", disallow: "/" },
      { userAgent: "Applebot-Extended", disallow: "/" },
      { userAgent: "cohere-ai", disallow: "/" },
      { userAgent: "Diffbot", disallow: "/" },
      { userAgent: "FacebookBot", disallow: "/" },
      { userAgent: "meta-externalagent", disallow: "/" },
      { userAgent: "Amazonbot", disallow: "/" },
      { userAgent: "YouBot", disallow: "/" },
    ],
  };
}

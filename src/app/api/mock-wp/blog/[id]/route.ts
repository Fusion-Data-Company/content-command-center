import { NextRequest } from "next/server";
import { getPostById } from "@/lib/wordpress/mock-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  const post = getPostById(postId);

  if (!post) {
    return new Response("Not Found", { status: 404 });
  }

  const dateStr = new Date(post.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const categoryNames = post.categories.map((id) => `Category ${id}`).join(", ") || "Uncategorized";
  const statusLabel = post.status === "publish" ? "Published" : "Draft";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title.rendered} - Demo WordPress Site</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: #0D0D0D;
      color: #E5E5E5;
      line-height: 1.7;
    }
    .demo-banner {
      background: #1a1a1a;
      border-bottom: 1px solid #C8FF00;
      padding: 0.75rem 1.5rem;
      text-align: center;
      font-size: 0.8125rem;
      color: #C8FF00;
      letter-spacing: 0.02em;
    }
    .demo-banner span { opacity: 0.7; }
    .container {
      max-width: 760px;
      margin: 0 auto;
      padding: 3rem 1.5rem;
    }
    .site-header {
      margin-bottom: 3rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #222;
    }
    .site-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.01em;
    }
    .post-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
    }
    .post-meta {
      color: #888;
      font-size: 0.875rem;
      margin-bottom: 2.5rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .post-meta .badge {
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .post-meta .badge.published { border-color: #C8FF00; color: #C8FF00; }
    .post-meta .badge.draft { border-color: #F59E0B; color: #F59E0B; }
    .post-content {
      font-size: 1.0625rem;
      color: #ccc;
    }
    .post-content h1, .post-content h2, .post-content h3,
    .post-content h4, .post-content h5, .post-content h6 {
      color: #fff;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }
    .post-content h2 { font-size: 1.5rem; }
    .post-content h3 { font-size: 1.25rem; }
    .post-content p { margin-bottom: 1.25rem; }
    .post-content ul, .post-content ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
    .post-content li { margin-bottom: 0.5rem; }
    .post-content a { color: #C8FF00; text-decoration: none; }
    .post-content a:hover { text-decoration: underline; }
    .post-content blockquote {
      border-left: 3px solid #C8FF00;
      padding-left: 1rem;
      margin: 1.5rem 0;
      color: #999;
      font-style: italic;
    }
    .post-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0; }
    .post-content code {
      background: #1a1a1a;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-size: 0.9em;
      color: #C8FF00;
    }
    .post-content pre {
      background: #1a1a1a;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    .post-content pre code { background: none; padding: 0; }
    .post-footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #222;
      color: #666;
      font-size: 0.8125rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="demo-banner">
    <span>Mock WordPress Site &mdash; Published via Content Command Center</span>
  </div>
  <div class="container">
    <header class="site-header">
      <div class="site-name">Demo WordPress Site</div>
    </header>
    <article>
      <h1 class="post-title">${post.title.rendered}</h1>
      <div class="post-meta">
        <span>${dateStr}</span>
        <span>&middot;</span>
        <span>${categoryNames}</span>
        <span class="badge ${post.status === "publish" ? "published" : "draft"}">${statusLabel}</span>
      </div>
      <div class="post-content">
        ${post.content.rendered}
      </div>
    </article>
    <footer class="post-footer">
      Published with Content Command Center &mdash; AI-Powered Content Publishing
    </footer>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

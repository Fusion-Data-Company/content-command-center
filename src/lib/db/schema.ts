import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  real,
} from "drizzle-orm/pg-core";

// ──── Brand Profiles ───────────────────────────────────────

export const brandProfiles = pgTable("brand_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default("default"),
  companyName: text("company_name").notNull(),
  industry: text("industry"),
  brandVoice: text("brand_voice"),
  colorPalette: jsonb("color_palette"), // string[] of hex codes
  logoUrl: text("logo_url"),
  targetAudiences: jsonb("target_audiences"), // string[] or structured
  competitorUrls: jsonb("competitor_urls"), // string[]
  sitemapUrl: text("sitemap_url"),
  internalLinks: jsonb("internal_links"), // { url, anchorText }[]
  keywords: jsonb("keywords"), // string[]
  styleGuideUrl: text("style_guide_url"),
  referenceImageUrls: jsonb("reference_image_urls"), // string[] — style reference images
  brandGuidelines: text("brand_guidelines"), // free-text brand guidelines
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ──── Content Projects ─────────────────────────────────────

export const contentProjects = pgTable("content_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default("default"),
  brandProfileId: uuid("brand_profile_id").references(
    () => brandProfiles.id
  ),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"), // draft, in_review, approved, published
  topic: text("topic"),
  primaryKeyword: text("primary_keyword"),
  secondaryKeywords: jsonb("secondary_keywords"), // string[]
  targetAudience: text("target_audience"),
  contentGoal: text("content_goal"),
  wordCountTarget: integer("word_count_target").default(2000),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ──── Chat Messages ────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => contentProjects.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  attachments: jsonb("attachments"), // { filename, url, type, extractedText }[]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ──── Generated Content ────────────────────────────────────

export const generatedContent = pgTable("generated_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => contentProjects.id, { onDelete: "cascade" })
    .notNull(),
  version: integer("version").notNull().default(1),
  contentHtml: text("content_html").notNull(),
  contentMarkdown: text("content_markdown"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  urlSlug: text("url_slug"),
  seoScore: jsonb("seo_score"), // { overall, checks[] }
  aiDetectionScore: real("ai_detection_score"),
  isNaturalized: boolean("is_naturalized").notNull().default(false),
  naturalizeStrength: text("naturalize_strength"), // light, medium, heavy
  schemaMarkup: jsonb("schema_markup"), // JSON-LD
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ──── Generated Images ─────────────────────────────────────

export const generatedImages = pgTable("generated_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .references(() => contentProjects.id, { onDelete: "cascade" })
    .notNull(),
  contentId: uuid("content_id").references(() => generatedContent.id),
  imageType: text("image_type"), // hero, section, infographic, social
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  caption: text("caption"),
  generationPrompt: text("generation_prompt"),
  dimensions: text("dimensions"), // 1200x630, 1080x1080, etc.
  sectionPlacement: text("section_placement"), // which H2 section
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ──── Content Templates ────────────────────────────────────

export const contentTemplates = pgTable("content_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default("default"),
  name: text("name").notNull(),
  description: text("description"),
  structure: jsonb("structure").notNull(), // template definition
  category: text("category"), // how-to, listicle, case-study, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ──── Studio Generations ──────────────────────────────────

export const studioGenerations = pgTable("studio_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  brandProfileId: uuid("brand_profile_id").references(
    () => brandProfiles.id
  ),
  prompt: text("prompt").notNull(),
  contextText: text("context_text"),
  referenceImageUrls: jsonb("reference_image_urls"), // string[]
  model: text("model").notNull().default("fal-ai/nano-banana-pro"),
  aspectRatio: text("aspect_ratio").notNull().default("16:9"),
  resolution: text("resolution").notNull().default("1K"),
  stylePreset: text("style_preset"), // infographic, hero, social, editorial
  resultImageUrls: jsonb("result_image_urls"), // string[]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ──── WordPress Sites ─────────────────────────────────────

export const wordpressSites = pgTable("wordpress_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default("default"),
  brandProfileId: uuid("brand_profile_id").references(
    () => brandProfiles.id
  ),

  // Site identity
  siteName: text("site_name").notNull(),
  siteUrl: text("site_url").notNull(), // https://client.com
  description: text("description"),

  // Inline client fields (for sites without a full brand profile)
  clientName: text("client_name"),
  clientLogo: text("client_logo"), // URL
  clientIndustry: text("client_industry"),
  clientNotes: text("client_notes"),

  // WordPress API credentials
  wpUsername: text("wp_username").notNull(),
  wpAppPasswordEncrypted: text("wp_app_password_encrypted").notNull(),

  // Connection metadata
  wpVersion: text("wp_version"),
  lastConnectionTest: timestamp("last_connection_test"),
  connectionStatus: text("connection_status").notNull().default("untested"), // untested, success, failed

  // Cached WordPress data
  categoriesCache: jsonb("categories_cache"), // { id, name, slug }[]
  tagsCache: jsonb("tags_cache"), // { id, name, slug }[]
  lastCacheRefresh: timestamp("last_cache_refresh"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ──── Publishing Jobs ─────────────────────────────────────

export const publishingJobs = pgTable("publishing_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default("default"),

  siteId: uuid("site_id")
    .references(() => wordpressSites.id, { onDelete: "cascade" })
    .notNull(),
  contentProjectId: uuid("content_project_id").references(
    () => contentProjects.id
  ),
  externalContentId: uuid("external_content_id"),

  // Job configuration
  contentSource: text("content_source").notNull(), // platform, external

  // Post details
  postTitle: text("post_title").notNull(),
  postSlug: text("post_slug"),
  postStatus: text("post_status").notNull().default("publish"), // draft, publish
  featuredImageUrl: text("featured_image_url"),

  // AI-determined settings
  selectedCategories: jsonb("selected_categories"), // number[] (WP category IDs)
  selectedTags: jsonb("selected_tags"), // string[] (tag names)
  excerpt: text("excerpt"),

  // Job status
  status: text("status").notNull().default("pending"), // pending, analyzing, publishing, verifying, completed, failed
  progress: integer("progress").default(0), // 0-100

  // Results
  publishedPostId: integer("published_post_id"),
  publishedUrl: text("published_url"),

  // Agent activity log
  agentLog: jsonb("agent_log"), // { timestamp, step, message, success }[]
  errorMessage: text("error_message"),

  // Verification
  verificationStatus: text("verification_status"), // pending, verified, failed
  verificationNotes: text("verification_notes"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ──── External Content ────────────────────────────────────

export const externalContent = pgTable("external_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default("default"),

  title: text("title").notNull(),
  contentHtml: text("content_html"),
  contentMarkdown: text("content_markdown"),
  uploadedFileUrl: text("uploaded_file_url"),
  uploadedFileName: text("uploaded_file_name"),
  fileType: text("file_type"), // html, markdown, docx, pdf

  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),

  status: text("status").notNull().default("uploaded"), // uploaded, ready, published

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ──── App Settings ───────────────────────────────────────

export const appSettings = pgTable("app_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default("default").unique(),

  // AI Configuration
  chatModel: text("chat_model").notNull().default("perplexity/sonar"),
  chatTemperature: real("chat_temperature").notNull().default(0.7),
  chatMaxTokens: integer("chat_max_tokens").notNull().default(16000),

  // Image Generation
  defaultImageModel: text("default_image_model").notNull().default("fal-ai/nano-banana-pro"),
  defaultAspectRatio: text("default_aspect_ratio").notNull().default("16:9"),
  defaultResolution: text("default_resolution").notNull().default("1K"),
  autoGenerateImages: boolean("auto_generate_images").notNull().default(true),
  autoGenerateInfographic: boolean("auto_generate_infographic").notNull().default(true),

  // Content Defaults
  defaultContentTone: text("default_content_tone").notNull().default("professional"),
  targetWordCount: integer("target_word_count").notNull().default(2000),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ──── Type Exports ─────────────────────────────────────────

export type BrandProfile = typeof brandProfiles.$inferSelect;
export type NewBrandProfile = typeof brandProfiles.$inferInsert;
export type ContentProject = typeof contentProjects.$inferSelect;
export type NewContentProject = typeof contentProjects.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type GeneratedContent = typeof generatedContent.$inferSelect;
export type GeneratedImage = typeof generatedImages.$inferSelect;
export type ContentTemplate = typeof contentTemplates.$inferSelect;
export type StudioGeneration = typeof studioGenerations.$inferSelect;
export type NewStudioGeneration = typeof studioGenerations.$inferInsert;
export type WordPressSite = typeof wordpressSites.$inferSelect;
export type NewWordPressSite = typeof wordpressSites.$inferInsert;
export type PublishingJob = typeof publishingJobs.$inferSelect;
export type NewPublishingJob = typeof publishingJobs.$inferInsert;
export type ExternalContent = typeof externalContent.$inferSelect;
export type NewExternalContent = typeof externalContent.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;

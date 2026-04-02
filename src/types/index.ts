// Shared TypeScript interfaces matching the Rust backend models

export interface Site {
  id: string;
  name: string;
  url: string;
  username: string;
  app_password: string;
  is_active: boolean;
}

export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskStep = 'idle' | 'generating_titles' | 'generating_content' | 'publishing' | 'waiting';
export type PostStatusWP = 'draft' | 'publish' | 'future' | 'private';

export interface Task {
  id: string;
  site_id: string;
  name: string;
  prompt: string;
  system_prompt?: string;
  post_type: string;
  post_status: PostStatusWP;
  post_count: number;
  interval_minutes: number;
  model_override?: string;
  generate_excerpt: boolean;
  category_ids: number[];
  tag_ids: number[];
  status: TaskStatus;
  current_step: TaskStep;
  posts_completed: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_estimated_cost: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface CreateTaskInput {
  site_id: string;
  name: string;
  prompt: string;
  system_prompt?: string;
  post_type: string;
  post_status: string;
  post_count: number;
  interval_minutes: number;
  model_override?: string;
  generate_excerpt: boolean;
  category_ids: number[];
  tag_ids: number[];
  first_publish_at?: string;
}

export interface Post {
  id: string;
  task_id: string;
  sequence_number: number;
  title?: string;
  content?: string;
  excerpt?: string;
  wp_post_id?: number;
  status: 'pending' | 'title_generated' | 'content_generated' | 'published' | 'failed';
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost: number;
  scheduled_at?: string;
  published_at?: string;
  error_message?: string;
}

export interface TaskWithPosts {
  task: Task;
  posts: Post[];
}

export interface TaskLog {
  id: number;
  task_id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  created_at: string;
}

export interface ModelPricing {
  prompt: string;
  completion: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  pricing?: ModelPricing;
  context_length?: number;
}

export interface WPTerm {
  id: number;
  name: string;
  slug: string;
}

export interface PostType {
  slug: string;
  name: string;
  rest_base: string;
}

export interface DailyUsage {
  date: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  request_count: number;
}

export interface ModelUsageSummary {
  model: string;
  total_tokens: number;
  estimated_cost: number;
  request_count: number;
}

export interface UsageSummary {
  total_cost: number;
  total_tokens: number;
  total_requests: number;
  daily_breakdown: DailyUsage[];
  model_breakdown: ModelUsageSummary[];
}

export interface TaskCostRow {
  task_id: string;
  task_name: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost: number;
  date: string;
}

export interface TaskProgressPayload {
  task_id: string;
  status: TaskStatus;
  current_step: TaskStep;
  posts_completed: number;
  total_posts: number;
  current_post_title?: string;
  cost_so_far: number;
  log_message?: string;
}

export interface AppSettings {
  openrouter_api_key?: string;
  default_model?: string;
  default_temperature?: string;
  default_max_tokens?: string;
  default_top_p?: string;
  default_frequency_penalty?: string;
  default_presence_penalty?: string;
  default_system_prompt?: string;
}

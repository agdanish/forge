/**
 * Deterministic AppSpec fixtures for exploratory validation.
 * One fixture per shell — realistic data, no LLM needed.
 */

import type { AppSpec } from '../../src/shells/spec.js';

export const UNIVERSAL_FIXTURE: AppSpec = {
  appName: 'TaskFlow Pro',
  tagline: 'Manage your projects efficiently and beautifully',
  domain: 'Project Management',
  primaryEntity: 'Task',
  primaryEntityPlural: 'Tasks',
  primaryAction: 'Manage',
  shell: 'universal',
  theme: 'neutral-dark',
  categories: ['Engineering', 'Design', 'Marketing', 'Operations', 'Finance', 'HR'],
  kpis: [
    { label: 'Total Tasks', value: '48', trend: '+12%', trendUp: true },
    { label: 'In Progress', value: '14', trend: '+5%', trendUp: true },
    { label: 'Completed', value: '28', trend: '+24%', trendUp: true },
    { label: 'Overdue', value: '6', trend: '-8%', trendUp: false },
  ],
  seedData: [
    { name: 'API Integration', description: 'Connect payment gateway', status: 'active', priority: 'high', category: 'Engineering', value: 45000, date: '2026-03-15', assignee: 'Sarah Chen' },
    { name: 'Brand Refresh', description: 'Update color palette and logos', status: 'completed', priority: 'high', category: 'Design', value: 28000, date: '2026-03-12', assignee: 'James Wilson' },
    { name: 'Email Campaign', description: 'Q2 newsletter series', status: 'active', priority: 'medium', category: 'Marketing', value: 15000, date: '2026-03-18', assignee: 'Maria Garcia' },
    { name: 'Server Migration', description: 'Move to AWS us-east-2', status: 'pending', priority: 'high', category: 'Engineering', value: 67000, date: '2026-03-20', assignee: 'Alex Kim' },
    { name: 'Quarterly Review', description: 'Prepare board presentation', status: 'active', priority: 'medium', category: 'Operations', value: 12000, date: '2026-03-10', assignee: 'David Brown' },
    { name: 'Hiring Plan', description: 'Define Q2 headcount', status: 'pending', priority: 'medium', category: 'HR', value: 95000, date: '2026-03-25', assignee: 'Lisa Zhang' },
    { name: 'Cost Analysis', description: 'Reduce infrastructure spend', status: 'active', priority: 'high', category: 'Finance', value: 120000, date: '2026-03-08', assignee: 'Tom Anderson' },
    { name: 'Design System', description: 'Component library update', status: 'completed', priority: 'medium', category: 'Design', value: 32000, date: '2026-03-05', assignee: 'Sarah Chen' },
    { name: 'Load Testing', description: 'Stress test API endpoints', status: 'pending', priority: 'low', category: 'Engineering', value: 18000, date: '2026-03-28', assignee: 'James Wilson' },
    { name: 'Content Strategy', description: 'Blog + social calendar', status: 'active', priority: 'medium', category: 'Marketing', value: 22000, date: '2026-03-22', assignee: 'Maria Garcia' },
  ],
  views: ['Dashboard', 'List', 'Board'],
};

export const DASHBOARD_FIXTURE: AppSpec = {
  appName: 'Revenue Pulse',
  tagline: 'Analyze your sales performance with real-time insights',
  domain: 'Sales Analytics',
  primaryEntity: 'Deal',
  primaryEntityPlural: 'Deals',
  primaryAction: 'Analyze',
  shell: 'dashboard',
  theme: 'fintech-dark',
  categories: ['Enterprise', 'Mid-Market', 'SMB', 'Startup', 'Government', 'Renewal'],
  kpis: [
    { label: 'Total Revenue', value: '$2.4M', trend: '+18%', trendUp: true },
    { label: 'Active Deals', value: '67', trend: '+12%', trendUp: true },
    { label: 'Win Rate', value: '34%', trend: '+5%', trendUp: true },
    { label: 'Avg Deal Size', value: '$36K', trend: '-2%', trendUp: false },
  ],
  seedData: [
    { name: 'Acme Corp Enterprise', description: 'Full platform license renewal', status: 'active', priority: 'high', category: 'Enterprise', value: 250000, date: '2026-03-15', assignee: 'Sarah Chen' },
    { name: 'TechStart Series A', description: 'Startup package deal', status: 'active', priority: 'medium', category: 'Startup', value: 15000, date: '2026-03-18', assignee: 'James Wilson' },
    { name: 'Metro Health System', description: 'Government healthcare contract', status: 'pending', priority: 'high', category: 'Government', value: 180000, date: '2026-03-20', assignee: 'Maria Garcia' },
    { name: 'RetailMax Renewal', description: 'Annual license renewal with expansion', status: 'completed', priority: 'high', category: 'Renewal', value: 95000, date: '2026-03-12', assignee: 'Alex Kim' },
    { name: 'CloudNine Mid-Market', description: 'Mid-market SaaS deployment', status: 'active', priority: 'medium', category: 'Mid-Market', value: 45000, date: '2026-03-22', assignee: 'David Brown' },
    { name: 'DataFlow SMB', description: 'Small business analytics suite', status: 'active', priority: 'low', category: 'SMB', value: 8000, date: '2026-03-25', assignee: 'Lisa Zhang' },
    { name: 'GlobalTech Enterprise', description: 'Multi-region enterprise deal', status: 'pending', priority: 'high', category: 'Enterprise', value: 320000, date: '2026-03-28', assignee: 'Tom Anderson' },
    { name: 'EduLearn Platform', description: 'Education sector expansion', status: 'active', priority: 'medium', category: 'Mid-Market', value: 55000, date: '2026-03-10', assignee: 'Sarah Chen' },
    { name: 'FinServ Compliance', description: 'Financial services compliance module', status: 'completed', priority: 'high', category: 'Enterprise', value: 125000, date: '2026-03-08', assignee: 'James Wilson' },
    { name: 'StartupHub Batch', description: 'Batch deal for accelerator cohort', status: 'pending', priority: 'low', category: 'Startup', value: 22000, date: '2026-03-30', assignee: 'Maria Garcia' },
  ],
  views: ['Dashboard', 'List', 'Board'],
};

export const LANDING_FIXTURE: AppSpec = {
  appName: 'LaunchPad AI',
  tagline: 'The modern AI platform that helps teams build smarter products faster',
  domain: 'AI/ML Platform',
  primaryEntity: 'Product',
  primaryEntityPlural: 'Products',
  primaryAction: 'Discover',
  shell: 'landing',
  theme: 'creator-dark',
  categories: ['AI Models', 'Data Pipeline', 'Monitoring', 'Deployment', 'Training', 'Analytics'],
  kpis: [
    { label: 'Models Deployed', value: '2,400+', trend: '+35%', trendUp: true },
    { label: 'Active Users', value: '12K', trend: '+22%', trendUp: true },
    { label: 'Uptime', value: '99.99%', trend: '+0.01%', trendUp: true },
    { label: 'Response Time', value: '45ms', trend: '-15%', trendUp: true },
  ],
  seedData: [
    { name: 'GPT Fine-Tuning', description: 'Custom model training service', status: 'active', priority: 'high', category: 'AI Models', value: 99, date: '2026-03-15', assignee: 'Platform' },
    { name: 'Data Pipeline Pro', description: 'Automated ETL workflows', status: 'active', priority: 'high', category: 'Data Pipeline', value: 149, date: '2026-03-12', assignee: 'Platform' },
    { name: 'Model Monitor', description: 'Real-time drift detection', status: 'active', priority: 'medium', category: 'Monitoring', value: 79, date: '2026-03-18', assignee: 'Platform' },
    { name: 'One-Click Deploy', description: 'Deploy models to production instantly', status: 'active', priority: 'high', category: 'Deployment', value: 199, date: '2026-03-20', assignee: 'Platform' },
    { name: 'Training Lab', description: 'GPU-accelerated training environment', status: 'active', priority: 'medium', category: 'Training', value: 299, date: '2026-03-10', assignee: 'Platform' },
    { name: 'Analytics Suite', description: 'Model performance dashboards', status: 'active', priority: 'medium', category: 'Analytics', value: 129, date: '2026-03-25', assignee: 'Platform' },
    { name: 'API Gateway', description: 'Managed API endpoints', status: 'active', priority: 'high', category: 'Deployment', value: 59, date: '2026-03-08', assignee: 'Platform' },
    { name: 'Dataset Manager', description: 'Version and manage training data', status: 'active', priority: 'medium', category: 'Data Pipeline', value: 89, date: '2026-03-05', assignee: 'Platform' },
    { name: 'Alert System', description: 'Custom alerting rules', status: 'active', priority: 'low', category: 'Monitoring', value: 49, date: '2026-03-28', assignee: 'Platform' },
    { name: 'Batch Inference', description: 'Process large datasets efficiently', status: 'active', priority: 'medium', category: 'AI Models', value: 179, date: '2026-03-22', assignee: 'Platform' },
  ],
  views: ['Features', 'Pricing', 'FAQ'],
};

export const KANBAN_FIXTURE: AppSpec = {
  appName: 'Hire Stream',
  tagline: 'Visualize and move your candidates through every stage',
  domain: 'Recruitment',
  primaryEntity: 'Candidate',
  primaryEntityPlural: 'Candidates',
  primaryAction: 'Track',
  shell: 'kanban',
  theme: 'neutral-dark',
  categories: ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Operations'],
  kpis: [
    { label: 'Open Positions', value: '24', trend: '+8%', trendUp: true },
    { label: 'In Pipeline', value: '156', trend: '+15%', trendUp: true },
    { label: 'Interviews This Week', value: '18', trend: '+22%', trendUp: true },
    { label: 'Avg Time to Hire', value: '23 days', trend: '-12%', trendUp: true },
  ],
  seedData: [
    { name: 'Alice Johnson', description: 'Senior frontend engineer, 8 years exp', status: 'active', priority: 'high', category: 'Engineering', value: 160000, date: '2026-03-15', assignee: 'HR Team' },
    { name: 'Bob Martinez', description: 'Product designer, portfolio review', status: 'pending', priority: 'high', category: 'Design', value: 130000, date: '2026-03-12', assignee: 'HR Team' },
    { name: 'Carol Williams', description: 'Growth marketing lead', status: 'active', priority: 'medium', category: 'Marketing', value: 140000, date: '2026-03-18', assignee: 'HR Team' },
    { name: 'David Park', description: 'Backend engineer, systems design', status: 'completed', priority: 'high', category: 'Engineering', value: 175000, date: '2026-03-08', assignee: 'HR Team' },
    { name: 'Emma Chen', description: 'Product manager, fintech experience', status: 'active', priority: 'high', category: 'Product', value: 155000, date: '2026-03-20', assignee: 'HR Team' },
    { name: 'Frank Russo', description: 'Enterprise sales, SaaS background', status: 'pending', priority: 'medium', category: 'Sales', value: 120000, date: '2026-03-25', assignee: 'HR Team' },
    { name: 'Grace Liu', description: 'DevOps engineer, Kubernetes expert', status: 'active', priority: 'medium', category: 'Engineering', value: 165000, date: '2026-03-10', assignee: 'HR Team' },
    { name: 'Henry Thompson', description: 'UX researcher, qual+quant methods', status: 'pending', priority: 'low', category: 'Design', value: 110000, date: '2026-03-28', assignee: 'HR Team' },
    { name: 'Ivy Patel', description: 'Operations coordinator', status: 'archived', priority: 'low', category: 'Operations', value: 75000, date: '2026-03-05', assignee: 'HR Team' },
    { name: 'Jack O\'Brien', description: 'Content marketing specialist', status: 'active', priority: 'medium', category: 'Marketing', value: 95000, date: '2026-03-22', assignee: 'HR Team' },
  ],
  views: ['Board', 'List'],
};

export const WIZARD_FIXTURE: AppSpec = {
  appName: 'FitMatch',
  tagline: 'Your guided fitness assessment — step by step',
  domain: 'Health & Fitness',
  primaryEntity: 'Assessment',
  primaryEntityPlural: 'Assessments',
  primaryAction: 'Guide',
  shell: 'wizard',
  theme: 'health-light',
  categories: ['Cardio', 'Strength', 'Flexibility', 'Nutrition', 'Recovery', 'Mindfulness'],
  kpis: [
    { label: 'Assessments', value: '1,240', trend: '+28%', trendUp: true },
    { label: 'Completion Rate', value: '87%', trend: '+5%', trendUp: true },
    { label: 'Avg Score', value: '72/100', trend: '+8%', trendUp: true },
    { label: 'Recommendations', value: '3,600', trend: '+32%', trendUp: true },
  ],
  seedData: [
    { name: 'Morning Cardio Plan', description: 'Beginner 30-min running program', status: 'active', priority: 'high', category: 'Cardio', value: 29, date: '2026-03-15', assignee: 'Coach Sarah' },
    { name: 'Strength Foundation', description: 'Full-body strength for beginners', status: 'active', priority: 'high', category: 'Strength', value: 39, date: '2026-03-12', assignee: 'Coach Mike' },
    { name: 'Yoga Flow Series', description: 'Daily flexibility routine', status: 'active', priority: 'medium', category: 'Flexibility', value: 19, date: '2026-03-18', assignee: 'Coach Lena' },
    { name: 'Meal Prep Guide', description: 'Weekly nutrition planning', status: 'pending', priority: 'high', category: 'Nutrition', value: 49, date: '2026-03-20', assignee: 'Nutritionist Amy' },
    { name: 'Recovery Protocol', description: 'Post-workout recovery techniques', status: 'active', priority: 'medium', category: 'Recovery', value: 15, date: '2026-03-10', assignee: 'Coach Sarah' },
    { name: 'HIIT Challenge', description: 'Advanced 6-week HIIT program', status: 'active', priority: 'high', category: 'Cardio', value: 59, date: '2026-03-25', assignee: 'Coach Mike' },
    { name: 'Meditation Basics', description: 'Guided mindfulness for stress', status: 'completed', priority: 'low', category: 'Mindfulness', value: 9, date: '2026-03-08', assignee: 'Coach Lena' },
    { name: 'Protein Guide', description: 'Optimal protein intake calculator', status: 'active', priority: 'medium', category: 'Nutrition', value: 25, date: '2026-03-05', assignee: 'Nutritionist Amy' },
    { name: 'Sleep Optimization', description: 'Better sleep hygiene program', status: 'pending', priority: 'medium', category: 'Recovery', value: 19, date: '2026-03-28', assignee: 'Coach Sarah' },
    { name: 'Power Lifting', description: 'Intermediate powerlifting program', status: 'active', priority: 'high', category: 'Strength', value: 69, date: '2026-03-22', assignee: 'Coach Mike' },
  ],
  views: ['Assessment', 'Results'],
};

export const ALL_FIXTURES: Record<string, AppSpec> = {
  universal: UNIVERSAL_FIXTURE,
  dashboard: DASHBOARD_FIXTURE,
  landing: LANDING_FIXTURE,
  kanban: KANBAN_FIXTURE,
  wizard: WIZARD_FIXTURE,
};

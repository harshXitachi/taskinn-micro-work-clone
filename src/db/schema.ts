import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';



// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  role: text("role").notNull().default("worker"),
  avatar: text("avatar"),
  bio: text("bio"),
  phone: text("phone"),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false),
  profilePicture: text("profile_picture"),
  skills: text("skills"),
  experience: text("experience"),
  education: text("education"),
  location: text("location"),
  lastLogin: integer("last_login", { mode: "timestamp" }),
  interests: text("interests"),
  availability: text("availability"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Categories table
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  createdAt: text("created_at").notNull(),
});

// Tasks table
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  employerId: text("employer_id").references(() => user.id),
  status: text("status").notNull().default("open"),
  price: real("price").notNull(),
  timeEstimate: integer("time_estimate"),
  slots: integer("slots").notNull().default(1),
  slotsFilled: integer("slots_filled").notNull().default(0),
  requirements: text("requirements"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at"),
});

// Task Submissions table
export const taskSubmissions = sqliteTable("task_submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").references(() => tasks.id),
  workerId: text("worker_id").references(() => user.id),
  status: text("status").notNull().default("pending"),
  submissionData: text("submission_data"),
  submittedAt: text("submitted_at").notNull(),
  reviewedAt: text("reviewed_at"),
  reviewerNotes: text("reviewer_notes"),
});

// Payments table
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").references(() => user.id),
  taskSubmissionId: integer("task_submission_id").references(() => taskSubmissions.id),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  paymentType: text("payment_type").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  paymentAddress: text("payment_address"),
  transactionHash: text("transaction_hash"),
  notes: text("notes"),
  commissionAmount: real("commission_amount"),
  createdAt: text("created_at").notNull(),
  processedAt: text("processed_at"),
});

// Reviews table
export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").references(() => tasks.id),
  reviewerId: text("reviewer_id").references(() => user.id),
  revieweeId: text("reviewee_id").references(() => user.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull(),
});

// Disputes table
export const disputes = sqliteTable("disputes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskSubmissionId: integer("task_submission_id").references(() => taskSubmissions.id),
  raisedById: text("raised_by_id").references(() => user.id),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  resolvedById: text("resolved_by_id").references(() => user.id),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

// User Stats table
export const userStats = sqliteTable("user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique().references(() => user.id),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksPosted: integer("tasks_posted").notNull().default(0),
  totalEarned: real("total_earned").notNull().default(0),
  totalSpent: real("total_spent").notNull().default(0),
  averageRating: real("average_rating").notNull().default(0),
  successRate: real("success_rate").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

// Admin Settings table
export const adminSettings = sqliteTable("admin_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commissionRate: real("commission_rate").notNull().default(0.1),
  adminUsername: text("admin_username").notNull().default("admin"),
  adminPasswordHash: text("admin_password_hash").notNull(),
  adminEmail: text("admin_email"),
  totalEarnings: real("total_earnings").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Add new wallets table
export const wallets = sqliteTable('wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id),
  currencyType: text('currency_type').notNull(), // "USD" or "USDT_TRC20"
  balance: real('balance').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add new wallet_transactions table
export const walletTransactions = sqliteTable('wallet_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  walletId: integer('wallet_id').notNull().references(() => wallets.id),
  transactionType: text('transaction_type').notNull(), // "deposit", "withdrawal", "task_payment", "task_refund"
  amount: real('amount').notNull(),
  currencyType: text('currency_type').notNull(),
  status: text('status').notNull().default('pending'), // "pending", "completed", "failed"
  referenceId: text('reference_id'),
  description: text('description'),
  transactionHash: text('transaction_hash'),
  createdAt: text('created_at').notNull(),
});

// Add new admin_wallets table at the end
export const adminWallets = sqliteTable('admin_wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  currencyType: text('currency_type').notNull(), // "USD" or "USDT_TRC20"
  balance: real('balance').notNull().default(0),
  totalEarned: real('total_earned').notNull().default(0),
  totalWithdrawn: real('total_withdrawn').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
// Domain types for Family Hub.
//
// Permission model: there are no admin/member roles. Every family member
// has the same capabilities — add/remove members, create and assign tasks
// to anyone, edit family settings. This mirrors `family_members.ts` and
// the RLS policies in `supabase/schema.sql`, which grant every row the
// same access as long as the caller belongs to that family.

export type IconKey =
  | "cat"
  | "book"
  | "homework"
  | "shower"
  | "alarm"
  | "sun"
  | "moon"
  | "bed"
  | "dishes"
  | "kitchen"
  | "vacuum"
  | "broom"
  | "mop"
  | "laundry"
  | "shirt"
  | "trash"
  | "bedroom"
  | "house"
  | "phone-off"
  | "heart"
  | "family"
  | "star"
  | "trophy"
  | "gift"
  | "exercise"
  | "reading"
  | "school"
  | "checklist"
  | "food"
  | "plus"
  | "calendar"
  | "clock"
  | "settings"
  | "back"
  | "close";

export type Difficulty = "easy" | "normal" | "hard" | "epic";

export type RecurrenceType =
  | "once"
  | "daily"
  | "weekdays"
  | "weekends"
  | "custom_days"
  | "times_per_week"
  | "times_per_day";

export interface Recurrence {
  type: RecurrenceType;
  daysOfWeek?: number[]; // 0=Sun..6=Sat, used by custom_days/weekdays/weekends
  timesPerWeek?: number;
  timesPerDay?: number;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  displayName: string;
  photoUrl: string | null;
  accentColor: "pink" | "lilac" | "sky" | "mint" | "yellow" | "coral";
  points: number;
  lifetimePoints: number;
  currentStreak: number;
  longestStreak: number;
  completedTaskCount: number;
  timezone: string;
  active: boolean;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  memberIds: string[];
  pointsRules: {
    difficultyDefaults: Record<Difficulty, number>;
  };
  notificationRules: {
    notifyOnComplete: boolean;
    notifyOnRefuse: boolean;
    notifyOnPostpone: boolean;
    notifyOnMissed: boolean;
    notifyOnBadge: boolean;
    notifyOnReward: boolean;
    maxAutoReminders: number;
    followUpDelaysMinutes: number[]; // e.g. [60, 180]
  };
  createdAt: string;
}

export type TaskAssignee =
  | { kind: "member"; memberIds: string[] }
  | { kind: "family" };

export interface Task {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  category: string;
  icon: IconKey;
  color: FamilyMember["accentColor"];
  points: number;
  difficulty: Difficulty;
  assignee: TaskAssignee;
  creatorId: string;
  recurrence: Recurrence;
  startTime?: string; // "HH:mm"
  dueTime?: string; // "HH:mm"
  onceDate?: string; // ISO date, only for recurrence.type === "once"
  hasDeadline: boolean;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OccurrenceStatus =
  | "pending"
  | "snoozed"
  | "completed"
  | "refused"
  | "missed"
  | "cancelled";

export interface TaskOccurrence {
  id: string;
  taskId: string;
  memberId: string; // which assignee this occurrence tracks
  scheduledFor: string; // ISO date-time
  status: OccurrenceStatus;
  snoozedUntil?: string;
  refusalReason?: string;
  remindersSent: number;
  completedAt?: string;
  refusedAt?: string;
}

export type PointsTransactionType =
  | "task_completion"
  | "bonus"
  | "manual_adjustment"
  | "reward_redemption";

export interface PointsLedgerEntry {
  id: string;
  memberId: string;
  taskOccurrenceId?: string;
  amount: number;
  type: PointsTransactionType;
  reason?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: IconKey;
  criteria: string; // human-readable; evaluated by badge engine
}

export interface EarnedBadge {
  memberId: string;
  badgeId: string;
  earnedAt: string;
}

export type RewardScope = "individual" | "family";

export interface Reward {
  id: string;
  familyId: string;
  name: string;
  icon: IconKey;
  pointsRequired: number;
  scope: RewardScope;
  memberId?: string; // set when scope === "individual"
  redeemed: boolean;
  redeemedAt?: string;
  isMilestone?: boolean; // auto-generated "every +1000 points" tier
}

export type ActivityEventType =
  | "task_completed"
  | "task_refused"
  | "task_postponed"
  | "task_missed"
  | "points_awarded"
  | "badge_earned"
  | "reward_unlocked"
  | "member_joined";

export interface ActivityEvent {
  id: string;
  familyId: string;
  type: ActivityEventType;
  memberId: string;
  taskId?: string;
  points?: number;
  message: string;
  createdAt: string;
}

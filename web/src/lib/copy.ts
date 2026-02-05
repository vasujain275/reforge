/**
 * Centralized copy constants for the Reforge application.
 * 
 * Use these constants instead of hardcoding text in components.
 * This ensures consistency and makes it easier to update copy across the app.
 */

export const COPY = {
  // Brand
  brand: {
    name: 'Reforge',
    tagline: 'Master DSA for your next interview',
    description: 'Intelligent spaced repetition for coding interview preparation',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    problems: 'Problems',
    sessions: 'Sessions',
    patterns: 'Patterns',
    attempts: 'Attempts',
    settings: 'Settings',
    security: 'Security',
    admin: 'Admin',
  },

  // Auth
  auth: {
    signIn: 'Sign In',
    signUp: 'Create Account',
    signOut: 'Sign Out',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset Password',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    name: 'Name',
    rememberMe: 'Remember me',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    createAccount: 'Create your account',
    signInToAccount: 'Sign in to your account',
  },

  // Actions
  actions: {
    save: 'Save',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    remove: 'Remove',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    done: 'Done',
    retry: 'Try Again',
    viewAll: 'View All',
    startSession: 'Start Session',
    generateSession: 'Generate Session',
    recordAttempt: 'Record Attempt',
    goToDashboard: 'Go to Dashboard',
    getStarted: 'Get Started',
    learnMore: 'Learn More',
  },

  // Status
  status: {
    loading: 'Loading...',
    saving: 'Saving...',
    saved: 'Saved',
    error: 'Error',
    success: 'Success',
    pending: 'Pending',
    active: 'Active',
    completed: 'Completed',
    failed: 'Failed',
    passed: 'Passed',
  },

  // Empty states
  empty: {
    problems: {
      title: 'No problems yet',
      description: 'Add your first problem to start tracking your progress.',
      action: 'Add Problem',
    },
    sessions: {
      title: 'No sessions yet',
      description: 'Start a practice session to begin your revision journey.',
      action: 'Start Session',
    },
    patterns: {
      title: 'No patterns yet',
      description: 'Patterns help you organize problems by technique.',
      action: 'Add Pattern',
    },
    attempts: {
      title: 'No attempts recorded',
      description: 'Record your first attempt to start tracking progress.',
      action: 'Record Attempt',
    },
    search: {
      title: 'No results found',
      description: 'Try adjusting your search or filters.',
    },
  },

  // Dashboard
  dashboard: {
    welcome: 'Welcome back',
    readyToPractice: 'Ready to practice?',
    problemsDue: 'problems due for revision',
    yourProgress: 'Your Progress',
    problemsNeedingReview: 'Problems Needing Review',
    quickSession: 'Quick Session',
    customSession: 'Custom Session',
    stats: {
      totalProblems: 'Total Problems',
      problemsSolved: 'Solved',
      avgConfidence: 'Avg Confidence',
      currentStreak: 'Current Streak',
      days: 'days',
    },
  },

  // Problems
  problems: {
    title: 'Title',
    source: 'Source',
    url: 'URL',
    difficulty: 'Difficulty',
    patterns: 'Patterns',
    confidence: 'Confidence',
    lastAttempt: 'Last Attempt',
    attempts: 'Attempts',
    status: 'Status',
    score: 'Priority Score',
    addProblem: 'Add Problem',
    editProblem: 'Edit Problem',
    deleteProblem: 'Delete Problem',
    difficulties: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
    },
    statuses: {
      unsolved: 'Unsolved',
      solved: 'Solved',
      abandoned: 'Abandoned',
    },
  },

  // Sessions
  sessions: {
    title: 'Sessions',
    newSession: 'New Session',
    duration: 'Duration',
    problems: 'Problems',
    template: 'Template',
    startedAt: 'Started',
    completedAt: 'Completed',
    inProgress: 'In Progress',
    howMuchTime: 'How much time do you have?',
    focusArea: 'Focus area',
    allPatterns: 'All patterns',
    weakPatterns: 'Weak patterns',
    specificPattern: 'Specific pattern',
    minutes: 'minutes',
    sessionPreview: 'Session Preview',
    reason: 'Reason',
    regenerate: 'Regenerate',
    templates: {
      quickReview: 'Quick Review',
      dailyPractice: 'Daily Practice',
      standardSession: 'Standard Session',
      patternFocus: 'Pattern Focus',
      weekendComprehensive: 'Weekend Comprehensive',
      interviewPrep: 'Interview Prep',
    },
  },

  // Patterns
  patterns: {
    title: 'Title',
    description: 'Description',
    problemCount: 'Problems',
    avgConfidence: 'Avg Confidence',
    timesRevised: 'Times Revised',
    addPattern: 'Add Pattern',
    editPattern: 'Edit Pattern',
    deletePattern: 'Delete Pattern',
  },

  // Attempts
  attempts: {
    recordAttempt: 'Record Attempt',
    problem: 'Problem',
    confidence: 'Confidence',
    duration: 'Duration',
    outcome: 'Outcome',
    notes: 'Notes',
    performedAt: 'Performed At',
    passed: 'Passed',
    failed: 'Failed',
    confidenceHint: 'How confident do you feel about this problem?',
    notesPlaceholder: 'Any notes or reflections on this attempt...',
  },

  // Settings
  settings: {
    title: 'Settings',
    preferences: 'Preferences',
    scoringWeights: 'Scoring Weights',
    weightsDescription: 'Adjust how different factors influence problem priority.',
    resetToDefaults: 'Reset to Defaults',
    weightSum: 'Weights must sum to 1.0',
    weights: {
      confidence: 'Confidence',
      days: 'Days Since Practice',
      attempts: 'Total Attempts',
      time: 'Average Time',
      difficulty: 'Difficulty',
      failed: 'Last Failed',
      pattern: 'Pattern Weakness',
    },
  },

  // Errors
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Unable to connect. Please check your connection.',
    notFound: 'The requested resource was not found.',
    unauthorized: 'Please sign in to continue.',
    forbidden: 'You do not have permission to perform this action.',
    validation: 'Please check your input and try again.',
  },

  // Confirmation dialogs
  confirm: {
    delete: {
      title: 'Are you sure?',
      description: 'This action cannot be undone.',
      confirm: 'Delete',
      cancel: 'Cancel',
    },
    unsavedChanges: {
      title: 'Unsaved changes',
      description: 'You have unsaved changes. Are you sure you want to leave?',
      confirm: 'Leave',
      cancel: 'Stay',
    },
  },

  // Time formatting
  time: {
    justNow: 'Just now',
    minutesAgo: (n: number) => `${n} minute${n === 1 ? '' : 's'} ago`,
    hoursAgo: (n: number) => `${n} hour${n === 1 ? '' : 's'} ago`,
    daysAgo: (n: number) => `${n} day${n === 1 ? '' : 's'} ago`,
    never: 'Never',
  },
} as const;

// Type helper for accessing nested copy
export type CopyKey = keyof typeof COPY;

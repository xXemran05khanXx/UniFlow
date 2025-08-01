# MongoDB Schemas Documentation

This document describes the MongoDB schemas implemented using Mongoose for the UniFlow application.

## 📁 Schema Overview

The UniFlow application uses 5 main schemas:

1. **User** - User accounts and authentication
2. **Project** - Project containers for workflows
3. **Flow** - Individual workflow definitions
4. **Execution** - Runtime execution tracking
5. **Template** - Reusable workflow templates

## 🔐 User Schema

### Purpose
Manages user accounts, authentication, profiles, and preferences.

### Key Features
- **Authentication**: Email/password with bcrypt hashing
- **JWT Integration**: Token generation and validation
- **Account Security**: Login attempts tracking, account locking
- **Password Reset**: Secure token-based password reset
- **Email Verification**: Email verification workflow
- **User Profiles**: Extended profile information
- **Preferences**: User settings and customization

### Fields
```javascript
{
  // Basic Information
  name: String (required, max 50 chars),
  email: String (required, unique, validated),
  password: String (required, min 6 chars, hashed),
  
  // Account Status
  role: ['user', 'admin', 'moderator'],
  isActive: Boolean,
  isEmailVerified: Boolean,
  avatar: String,
  
  // Extended Profile
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    dateOfBirth: Date,
    bio: String (max 500 chars),
    location: String,
    website: String
  },
  
  // User Preferences
  preferences: {
    theme: ['light', 'dark', 'auto'],
    notifications: {
      email: Boolean,
      push: Boolean,
      sms: Boolean
    },
    language: String
  },
  
  // Security & Activity
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date
}
```

### Methods
- `getSignedJwtToken()` - Generate JWT token
- `matchPassword(password)` - Verify password
- `getResetPasswordToken()` - Generate password reset token
- `getEmailVerificationToken()` - Generate email verification token
- `incLoginAttempts()` - Handle failed login attempts
- `resetLoginAttempts()` - Reset login attempts after success

### Virtuals
- `fullName` - Combines first and last name
- `isLocked` - Check if account is locked

## 📊 Project Schema

### Purpose
Container for organizing workflows, managing collaborators, and project settings.

### Key Features
- **Ownership & Collaboration**: Owner and multiple collaborators with roles
- **Permission System**: Granular permissions for different actions
- **Project Organization**: Categories, tags, visibility settings
- **Template Support**: Projects can be marked as templates
- **Statistics**: Usage analytics and metrics

### Fields
```javascript
{
  // Basic Information
  name: String (required, max 100 chars),
  description: String (max 1000 chars),
  slug: String (unique, auto-generated),
  owner: ObjectId (ref: User),
  
  // Collaboration
  collaborators: [{
    user: ObjectId (ref: User),
    role: ['viewer', 'editor', 'admin'],
    permissions: {
      canEdit: Boolean,
      canDelete: Boolean,
      canInvite: Boolean,
      canManageSettings: Boolean
    },
    addedAt: Date
  }],
  
  // Project Settings
  status: ['active', 'inactive', 'archived', 'deleted'],
  visibility: ['private', 'public', 'team'],
  settings: {
    allowPublicViewing: Boolean,
    allowComments: Boolean,
    autoSave: Boolean,
    versionControl: Boolean
  },
  
  // Organization
  tags: [String],
  category: ['workflow', 'diagram', 'flowchart', 'process', 'other'],
  
  // Template Features
  template: {
    isTemplate: Boolean,
    templateCategory: String,
    usageCount: Number
  },
  
  // Analytics
  stats: {
    viewCount: Number,
    forkCount: Number,
    starCount: Number,
    lastViewed: Date,
    lastEdited: Date
  }
}
```

### Methods
- `isCollaborator(userId)` - Check if user is collaborator
- `getUserRole(userId)` - Get user's role in project
- `canUserPerform(userId, action)` - Check permissions

## 🔄 Flow Schema

### Purpose
Defines individual workflows with nodes, edges, and execution configuration.

### Key Features
- **Visual Flow Definition**: Nodes and edges with positioning
- **Flexible Node Types**: Start, end, task, decision, gateway, subprocess, event
- **Version Management**: Automatic versioning and history tracking
- **Execution Configuration**: Variables, triggers, and settings
- **Validation**: Flow structure validation
- **Statistics**: Execution metrics and performance data

### Fields
```javascript
{
  // Basic Information
  project: ObjectId (ref: Project),
  name: String (required, max 100 chars),
  description: String (max 500 chars),
  version: String (auto-incremented),
  status: ['draft', 'active', 'inactive', 'archived'],
  
  // Flow Definition
  definition: {
    nodes: [{
      id: String (required),
      type: ['start', 'end', 'task', 'decision', 'gateway', 'subprocess', 'event'],
      label: String (required),
      position: { x: Number, y: Number },
      data: Mixed (flexible properties),
      style: Mixed (visual styling)
    }],
    edges: [{
      id: String (required),
      source: String (required),
      target: String (required),
      label: String,
      type: ['default', 'straight', 'step', 'smoothstep', 'bezier'],
      animated: Boolean,
      style: Mixed,
      data: Mixed
    }],
    viewport: { x: Number, y: Number, zoom: Number }
  },
  
  // Execution Configuration
  execution: {
    isExecutable: Boolean,
    engine: ['custom', 'bpmn', 'workflow'],
    triggers: [{
      type: ['manual', 'scheduled', 'webhook', 'event'],
      config: Mixed,
      isActive: Boolean
    }],
    variables: [{
      name: String (required),
      type: ['string', 'number', 'boolean', 'object', 'array'],
      defaultValue: Mixed,
      description: String,
      required: Boolean
    }]
  },
  
  // Metadata
  metadata: {
    author: ObjectId (ref: User),
    lastModifiedBy: ObjectId (ref: User),
    tags: [String],
    category: String,
    complexity: ['simple', 'medium', 'complex']
  },
  
  // Version History
  versions: [{
    version: String,
    definition: Mixed,
    author: ObjectId (ref: User),
    createdAt: Date,
    comment: String,
    isActive: Boolean
  }],
  
  // Statistics
  stats: {
    executionCount: Number,
    successCount: Number,
    errorCount: Number,
    averageExecutionTime: Number,
    lastExecuted: Date
  }
}
```

### Methods
- `createVersion(comment, userId)` - Create new version
- `validateFlow()` - Validate flow structure

### Virtuals
- `nodeCount` - Number of nodes
- `edgeCount` - Number of edges
- `successRate` - Success percentage

## ⚡ Execution Schema

### Purpose
Tracks runtime execution of flows with detailed logging and metrics.

### Key Features
- **Execution Tracking**: Complete execution lifecycle management
- **Step-by-step Logging**: Detailed trace of each node execution
- **Error Handling**: Comprehensive error tracking and reporting
- **Performance Metrics**: Memory usage, execution time, and statistics
- **Real-time Status**: Live execution status updates

### Fields
```javascript
{
  // References
  flow: ObjectId (ref: Flow),
  project: ObjectId (ref: Project),
  
  // Trigger Information
  triggeredBy: {
    user: ObjectId (ref: User),
    trigger: ['manual', 'scheduled', 'webhook', 'event'],
    source: String
  },
  
  // Execution Status
  executionId: String (unique, auto-generated),
  status: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'],
  startTime: Date,
  endTime: Date,
  duration: Number (milliseconds),
  
  // Data Flow
  input: {
    variables: Mixed,
    parameters: Mixed
  },
  output: {
    result: Mixed,
    variables: Mixed
  },
  
  // Execution Trace
  trace: [{
    nodeId: String (required),
    nodeName: String,
    status: ['pending', 'running', 'completed', 'failed', 'skipped'],
    startTime: Date,
    endTime: Date,
    duration: Number,
    input: Mixed,
    output: Mixed,
    error: {
      message: String,
      stack: String,
      code: String
    },
    logs: [String]
  }],
  
  // Current State
  currentNode: String,
  currentStep: Number,
  
  // Error Information
  error: {
    message: String,
    stack: String,
    code: String,
    nodeId: String,
    step: Number
  },
  
  // Context
  context: {
    variables: Mixed,
    environment: String,
    version: String,
    settings: Mixed
  },
  
  // Performance Metrics
  metrics: {
    totalNodes: Number,
    completedNodes: Number,
    failedNodes: Number,
    skippedNodes: Number,
    memoryUsage: Number,
    cpuTime: Number
  },
  
  // Logging
  logs: [{
    timestamp: Date,
    level: ['debug', 'info', 'warn', 'error'],
    message: String,
    nodeId: String,
    data: Mixed
  }]
}
```

### Methods
- `addLog(level, message, nodeId, data)` - Add log entry
- `updateStep(nodeId, status, input, output, error)` - Update execution step
- `cancel(reason)` - Cancel execution

### Virtuals
- `progress` - Execution progress percentage
- `executionTime` - Formatted execution time
- `isRunning` - Check if execution is running
- `isFinished` - Check if execution is finished

## 📋 Template Schema

### Purpose
Reusable workflow templates with ratings, documentation, and usage tracking.

### Key Features
- **Template Library**: Public/private template sharing
- **Rating System**: User reviews and ratings
- **Usage Analytics**: Download and usage statistics
- **Documentation**: Comprehensive template documentation
- **Search & Discovery**: Full-text search and categorization

### Fields
```javascript
{
  // Basic Information
  name: String (required, max 100 chars),
  description: String (required, max 1000 chars),
  category: ['business-process', 'workflow', 'approval', 'data-processing', 'integration', 'automation', 'reporting', 'other'],
  subcategory: String,
  tags: [String],
  
  // Template Definition
  definition: {
    nodes: [/* Same as Flow schema */],
    edges: [/* Same as Flow schema */],
    viewport: { x: Number, y: Number, zoom: Number }
  },
  
  // Configuration
  config: {
    variables: [{
      name: String (required),
      type: ['string', 'number', 'boolean', 'object', 'array'],
      defaultValue: Mixed,
      description: String,
      required: Boolean,
      validation: {
        min: Number,
        max: Number,
        pattern: String,
        options: [String]
      }
    }],
    settings: {
      autoSave: Boolean,
      versionControl: Boolean,
      allowCustomization: Boolean,
      requireApproval: Boolean
    }
  },
  
  // Metadata
  author: ObjectId (ref: User),
  version: String,
  status: ['draft', 'published', 'deprecated', 'archived'],
  visibility: ['public', 'private', 'organization'],
  
  // Usage & Rating
  usage: {
    downloadCount: Number,
    usageCount: Number,
    favoriteCount: Number
  },
  rating: {
    average: Number (0-5),
    count: Number,
    reviews: [{
      user: ObjectId (ref: User),
      rating: Number (1-5),
      comment: String (max 500 chars),
      createdAt: Date
    }]
  },
  
  // Documentation
  documentation: {
    overview: String,
    instructions: String,
    examples: [String],
    requirements: [String],
    troubleshooting: String
  },
  
  // Media
  media: {
    thumbnail: String,
    screenshots: [String],
    demo: String
  },
  
  // Compatibility
  compatibility: {
    minVersion: String,
    maxVersion: String,
    dependencies: [String],
    platforms: [String]
  }
}
```

### Methods
- `addReview(userId, rating, comment)` - Add user review
- `incrementUsage()` - Increment usage count
- `incrementDownload()` - Increment download count
- `toggleFavorite(increment)` - Toggle favorite status

### Static Methods
- `getPopular(limit)` - Get popular templates
- `search(query, filters)` - Search templates

### Virtuals
- `popularityScore` - Calculated popularity score
- `ratingFormatted` - Formatted average rating

## 🔗 Relationships

### Entity Relationship Diagram
```
User ||--o{ Project : owns
User ||--o{ Project : collaborates
Project ||--o{ Flow : contains
User ||--o{ Flow : authors
Flow ||--o{ Execution : runs
User ||--o{ Execution : triggers
User ||--o{ Template : creates
Template ||--o{ Project : generates
```

### Key Relationships
- **User → Project**: One-to-many (ownership) + Many-to-many (collaboration)
- **Project → Flow**: One-to-many
- **Flow → Execution**: One-to-many
- **User → Template**: One-to-many (authorship)
- **Template → Project**: Many-to-many (template usage)

## 📊 Indexes

### Performance Optimizations
All schemas include strategic indexes for:
- Primary queries (user lookups, project access)
- Search functionality (text indexes)
- Analytics queries (date ranges, statistics)
- Security checks (active status, permissions)

### Key Indexes
- **User**: email, isActive, role, createdAt
- **Project**: owner+status, slug, tags, category
- **Flow**: project+status, author, tags, version
- **Execution**: flow+status, project+createdAt, executionId
- **Template**: category+status, tags, rating.average, usage.downloadCount

## 🛡️ Security Features

### Data Protection
- **Password Hashing**: Bcrypt with salt rounds
- **Token Security**: JWT with expiration
- **Account Locking**: Brute force protection
- **Input Validation**: Mongoose validators and custom validation
- **Permission Checks**: Role-based and resource-based authorization

### Privacy Controls
- **Data Sensitivity**: Sensitive fields excluded from responses
- **Visibility Controls**: Public/private/team visibility levels
- **Access Control**: Owner and collaboration-based permissions

## 🚀 Usage Examples

### Creating a User
```javascript
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword'
});
```

### Creating a Project with Collaborators
```javascript
const project = await Project.create({
  name: 'My Workflow',
  description: 'A sample workflow project',
  owner: userId,
  collaborators: [{
    user: collaboratorId,
    role: 'editor',
    permissions: { canEdit: true }
  }]
});
```

### Creating a Flow
```javascript
const flow = await Flow.create({
  project: projectId,
  name: 'Sample Flow',
  definition: {
    nodes: [
      { id: '1', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
      { id: '2', type: 'end', label: 'End', position: { x: 200, y: 0 } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' }
    ]
  },
  metadata: { author: userId }
});
```

This comprehensive schema design provides a solid foundation for a workflow management application with user authentication, project organization, flow definition, execution tracking, and template sharing capabilities.

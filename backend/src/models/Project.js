const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a project name'],
    trim: true,
    maxlength: [100, 'Project name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    permissions: {
      canEdit: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canInvite: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false }
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived', 'deleted'],
    default: 'active'
  },
  visibility: {
    type: String,
    enum: ['private', 'public', 'team'],
    default: 'private'
  },
  settings: {
    allowPublicViewing: { type: Boolean, default: false },
    allowComments: { type: Boolean, default: true },
    autoSave: { type: Boolean, default: true },
    versionControl: { type: Boolean, default: true }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: ['workflow', 'diagram', 'flowchart', 'process', 'other'],
    default: 'workflow'
  },
  template: {
    isTemplate: { type: Boolean, default: false },
    templateCategory: String,
    usageCount: { type: Number, default: 0 }
  },
  stats: {
    viewCount: { type: Number, default: 0 },
    forkCount: { type: Number, default: 0 },
    starCount: { type: Number, default: 0 },
    lastViewed: Date,
    lastEdited: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ slug: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ 'template.isTemplate': 1 });
projectSchema.index({ createdAt: -1 });

// Generate slug from name before saving
projectSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Add random suffix if needed for uniqueness
    if (!this.slug) {
      this.slug = `project-${Date.now()}`;
    }
  }
  next();
});

// Virtual for collaborator count
projectSchema.virtual('collaboratorCount').get(function() {
  return this.collaborators ? this.collaborators.length : 0;
});

// Method to check if user is collaborator
projectSchema.methods.isCollaborator = function(userId) {
  return this.collaborators.some(collab => 
    collab.user.toString() === userId.toString()
  );
};

// Method to get user's role in project
projectSchema.methods.getUserRole = function(userId) {
  const collaborator = this.collaborators.find(collab => 
    collab.user.toString() === userId.toString()
  );
  return collaborator ? collaborator.role : null;
};

// Method to check if user can perform action
projectSchema.methods.canUserPerform = function(userId, action) {
  // Owner can do everything
  if (this.owner.toString() === userId.toString()) {
    return true;
  }

  const collaborator = this.collaborators.find(collab => 
    collab.user.toString() === userId.toString()
  );

  if (!collaborator) return false;

  switch (action) {
    case 'view':
      return true;
    case 'edit':
      return collaborator.permissions.canEdit || collaborator.role === 'admin';
    case 'delete':
      return collaborator.permissions.canDelete || collaborator.role === 'admin';
    case 'invite':
      return collaborator.permissions.canInvite || collaborator.role === 'admin';
    case 'manage':
      return collaborator.permissions.canManageSettings || collaborator.role === 'admin';
    default:
      return false;
  }
};

module.exports = mongoose.model('Project', projectSchema);

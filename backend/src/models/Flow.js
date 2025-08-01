const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a flow name'],
    trim: true,
    maxlength: [100, 'Flow name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'archived'],
    default: 'draft'
  },
  // Flow definition using a flexible schema
  definition: {
    nodes: [{
      id: { type: String, required: true },
      type: { 
        type: String, 
        required: true,
        enum: ['start', 'end', 'task', 'decision', 'gateway', 'subprocess', 'event']
      },
      label: { type: String, required: true },
      position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 }
      },
      data: {
        // Flexible data structure for different node types
        properties: mongoose.Schema.Types.Mixed,
        config: mongoose.Schema.Types.Mixed
      },
      style: {
        width: Number,
        height: Number,
        backgroundColor: String,
        borderColor: String,
        borderWidth: Number,
        borderRadius: Number,
        fontSize: Number,
        fontColor: String
      }
    }],
    edges: [{
      id: { type: String, required: true },
      source: { type: String, required: true },
      target: { type: String, required: true },
      label: String,
      type: {
        type: String,
        enum: ['default', 'straight', 'step', 'smoothstep', 'bezier'],
        default: 'default'
      },
      animated: { type: Boolean, default: false },
      style: {
        stroke: String,
        strokeWidth: Number,
        strokeDasharray: String
      },
      data: mongoose.Schema.Types.Mixed
    }],
    viewport: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      zoom: { type: Number, default: 1 }
    }
  },
  // Execution configuration
  execution: {
    isExecutable: { type: Boolean, default: false },
    engine: {
      type: String,
      enum: ['custom', 'bpmn', 'workflow'],
      default: 'custom'
    },
    triggers: [{
      type: {
        type: String,
        enum: ['manual', 'scheduled', 'webhook', 'event']
      },
      config: mongoose.Schema.Types.Mixed,
      isActive: { type: Boolean, default: true }
    }],
    variables: [{
      name: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['string', 'number', 'boolean', 'object', 'array'],
        default: 'string'
      },
      defaultValue: mongoose.Schema.Types.Mixed,
      description: String,
      required: { type: Boolean, default: false }
    }]
  },
  // Metadata
  metadata: {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [String],
    category: String,
    complexity: {
      type: String,
      enum: ['simple', 'medium', 'complex'],
      default: 'simple'
    }
  },
  // Version history
  versions: [{
    version: String,
    definition: mongoose.Schema.Types.Mixed,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now },
    comment: String,
    isActive: { type: Boolean, default: false }
  }],
  // Statistics
  stats: {
    executionCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    averageExecutionTime: { type: Number, default: 0 },
    lastExecuted: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
flowSchema.index({ project: 1, status: 1 });
flowSchema.index({ 'metadata.author': 1 });
flowSchema.index({ 'metadata.tags': 1 });
flowSchema.index({ version: 1 });
flowSchema.index({ createdAt: -1 });

// Virtual for node count
flowSchema.virtual('nodeCount').get(function() {
  return this.definition && this.definition.nodes ? this.definition.nodes.length : 0;
});

// Virtual for edge count
flowSchema.virtual('edgeCount').get(function() {
  return this.definition && this.definition.edges ? this.definition.edges.length : 0;
});

// Virtual for success rate
flowSchema.virtual('successRate').get(function() {
  if (this.stats.executionCount === 0) return 0;
  return Math.round((this.stats.successCount / this.stats.executionCount) * 100);
});

// Method to create new version
flowSchema.methods.createVersion = function(comment, userId) {
  const newVersion = {
    version: this.version,
    definition: this.definition,
    author: userId,
    comment: comment || `Version ${this.version}`,
    isActive: false
  };
  
  this.versions.push(newVersion);
  return this.save();
};

// Method to validate flow definition
flowSchema.methods.validateFlow = function() {
  const errors = [];
  
  if (!this.definition || !this.definition.nodes || this.definition.nodes.length === 0) {
    errors.push('Flow must have at least one node');
  }
  
  // Check for start and end nodes
  const hasStart = this.definition.nodes.some(node => node.type === 'start');
  const hasEnd = this.definition.nodes.some(node => node.type === 'end');
  
  if (!hasStart) errors.push('Flow must have a start node');
  if (!hasEnd) errors.push('Flow must have an end node');
  
  // Validate edges
  if (this.definition.edges) {
    this.definition.edges.forEach(edge => {
      const sourceExists = this.definition.nodes.some(node => node.id === edge.source);
      const targetExists = this.definition.nodes.some(node => node.id === edge.target);
      
      if (!sourceExists) errors.push(`Edge source node '${edge.source}' not found`);
      if (!targetExists) errors.push(`Edge target node '${edge.target}' not found`);
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Pre-save middleware to update version
flowSchema.pre('save', function(next) {
  if (this.isModified('definition') && !this.isNew) {
    // Auto-increment patch version
    const [major, minor, patch] = this.version.split('.').map(Number);
    this.version = `${major}.${minor}.${patch + 1}`;
  }
  next();
});

module.exports = mongoose.model('Flow', flowSchema);

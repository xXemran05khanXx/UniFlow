const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  flow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flow',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  triggeredBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    trigger: {
      type: String,
      enum: ['manual', 'scheduled', 'webhook', 'event'],
      required: true
    },
    source: String // webhook URL, event name, etc.
  },
  executionId: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'pending'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: Number, // in milliseconds
  
  // Input/Output data
  input: {
    variables: mongoose.Schema.Types.Mixed,
    parameters: mongoose.Schema.Types.Mixed
  },
  output: {
    result: mongoose.Schema.Types.Mixed,
    variables: mongoose.Schema.Types.Mixed
  },
  
  // Execution trace
  trace: [{
    nodeId: { type: String, required: true },
    nodeName: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      required: true
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    error: {
      message: String,
      stack: String,
      code: String
    },
    logs: [String]
  }],
  
  // Current execution state
  currentNode: String,
  currentStep: { type: Number, default: 0 },
  
  // Error information
  error: {
    message: String,
    stack: String,
    code: String,
    nodeId: String,
    step: Number
  },
  
  // Execution context
  context: {
    variables: mongoose.Schema.Types.Mixed,
    environment: String,
    version: String,
    settings: mongoose.Schema.Types.Mixed
  },
  
  // Performance metrics
  metrics: {
    totalNodes: Number,
    completedNodes: Number,
    failedNodes: Number,
    skippedNodes: Number,
    memoryUsage: Number,
    cpuTime: Number
  },
  
  // Logs and debugging
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info'
    },
    message: String,
    nodeId: String,
    data: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
executionSchema.index({ flow: 1, status: 1 });
executionSchema.index({ project: 1, createdAt: -1 });
executionSchema.index({ executionId: 1 });
executionSchema.index({ 'triggeredBy.user': 1 });
executionSchema.index({ status: 1, createdAt: -1 });

// Generate unique execution ID before saving
executionSchema.pre('save', function(next) {
  if (!this.executionId) {
    this.executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Calculate duration when status changes to completed/failed
executionSchema.pre('save', function(next) {
  if (this.isModified('status') && 
      ['completed', 'failed', 'cancelled'].includes(this.status) && 
      !this.endTime) {
    this.endTime = new Date();
    this.duration = this.endTime - this.startTime;
  }
  next();
});

// Virtual for progress percentage
executionSchema.virtual('progress').get(function() {
  if (!this.metrics || !this.metrics.totalNodes) return 0;
  return Math.round((this.metrics.completedNodes / this.metrics.totalNodes) * 100);
});

// Virtual for execution time formatted
executionSchema.virtual('executionTime').get(function() {
  if (!this.duration) return 'N/A';
  
  const seconds = Math.floor(this.duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
});

// Virtual for is running
executionSchema.virtual('isRunning').get(function() {
  return ['pending', 'running'].includes(this.status);
});

// Virtual for is finished
executionSchema.virtual('isFinished').get(function() {
  return ['completed', 'failed', 'cancelled'].includes(this.status);
});

// Method to add log entry
executionSchema.methods.addLog = function(level, message, nodeId = null, data = null) {
  this.logs.push({
    level,
    message,
    nodeId,
    data,
    timestamp: new Date()
  });
  return this.save();
};

// Method to update current step
executionSchema.methods.updateStep = function(nodeId, status, input = null, output = null, error = null) {
  // Update current node and step
  this.currentNode = nodeId;
  this.currentStep += 1;
  
  // Find or create trace entry
  let traceEntry = this.trace.find(t => t.nodeId === nodeId);
  if (!traceEntry) {
    traceEntry = {
      nodeId,
      status: 'pending',
      startTime: new Date()
    };
    this.trace.push(traceEntry);
  }
  
  // Update trace entry
  traceEntry.status = status;
  if (input) traceEntry.input = input;
  if (output) traceEntry.output = output;
  if (error) traceEntry.error = error;
  
  if (status === 'completed' || status === 'failed') {
    traceEntry.endTime = new Date();
    traceEntry.duration = traceEntry.endTime - traceEntry.startTime;
  }
  
  // Update metrics
  if (!this.metrics) {
    this.metrics = {
      completedNodes: 0,
      failedNodes: 0,
      skippedNodes: 0
    };
  }
  
  if (status === 'completed') this.metrics.completedNodes += 1;
  else if (status === 'failed') this.metrics.failedNodes += 1;
  else if (status === 'skipped') this.metrics.skippedNodes += 1;
  
  return this.save();
};

// Method to cancel execution
executionSchema.methods.cancel = function(reason = 'User cancelled') {
  this.status = 'cancelled';
  this.endTime = new Date();
  this.duration = this.endTime - this.startTime;
  this.error = {
    message: reason,
    code: 'CANCELLED'
  };
  return this.save();
};

module.exports = mongoose.model('Execution', executionSchema);

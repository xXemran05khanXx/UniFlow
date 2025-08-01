const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a template name'],
    trim: true,
    maxlength: [100, 'Template name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a template description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  category: {
    type: String,
    required: true,
    enum: [
      'business-process',
      'workflow',
      'approval',
      'data-processing',
      'integration',
      'automation',
      'reporting',
      'other'
    ]
  },
  subcategory: String,
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Template definition
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
      data: mongoose.Schema.Types.Mixed,
      style: mongoose.Schema.Types.Mixed
    }],
    edges: [{
      id: { type: String, required: true },
      source: { type: String, required: true },
      target: { type: String, required: true },
      label: String,
      type: { type: String, default: 'default' },
      style: mongoose.Schema.Types.Mixed
    }],
    viewport: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      zoom: { type: Number, default: 1 }
    }
  },
  
  // Template configuration
  config: {
    variables: [{
      name: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['string', 'number', 'boolean', 'object', 'array'],
        default: 'string'
      },
      defaultValue: mongoose.Schema.Types.Mixed,
      description: String,
      required: { type: Boolean, default: false },
      validation: {
        min: Number,
        max: Number,
        pattern: String,
        options: [String]
      }
    }],
    settings: {
      autoSave: { type: Boolean, default: true },
      versionControl: { type: Boolean, default: true },
      allowCustomization: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: false }
    }
  },
  
  // Metadata
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'deprecated', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'organization'],
    default: 'public'
  },
  
  // Usage and rating
  usage: {
    downloadCount: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 }
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      createdAt: { type: Date, default: Date.now }
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
  
  // Images and media
  media: {
    thumbnail: String,
    screenshots: [String],
    demo: String // URL to demo video or interactive demo
  },
  
  // Compatibility and requirements
  compatibility: {
    minVersion: String,
    maxVersion: String,
    dependencies: [String],
    platforms: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
templateSchema.index({ category: 1, status: 1 });
templateSchema.index({ tags: 1 });
templateSchema.index({ author: 1 });
templateSchema.index({ 'rating.average': -1 });
templateSchema.index({ 'usage.downloadCount': -1 });
templateSchema.index({ createdAt: -1 });
templateSchema.index({ name: 'text', description: 'text' });

// Virtual for popularity score
templateSchema.virtual('popularityScore').get(function() {
  const downloadWeight = 0.4;
  const usageWeight = 0.3;
  const ratingWeight = 0.2;
  const favoriteWeight = 0.1;
  
  return (
    (this.usage.downloadCount * downloadWeight) +
    (this.usage.usageCount * usageWeight) +
    (this.rating.average * this.rating.count * ratingWeight) +
    (this.usage.favoriteCount * favoriteWeight)
  );
});

// Virtual for average rating formatted
templateSchema.virtual('ratingFormatted').get(function() {
  return Math.round(this.rating.average * 10) / 10;
});

// Method to add review
templateSchema.methods.addReview = function(userId, rating, comment) {
  // Remove existing review from same user
  this.rating.reviews = this.rating.reviews.filter(
    review => review.user.toString() !== userId.toString()
  );
  
  // Add new review
  this.rating.reviews.push({
    user: userId,
    rating,
    comment
  });
  
  // Recalculate average rating
  this.rating.count = this.rating.reviews.length;
  this.rating.average = this.rating.reviews.reduce(
    (sum, review) => sum + review.rating, 0
  ) / this.rating.count;
  
  return this.save();
};

// Method to increment usage count
templateSchema.methods.incrementUsage = function() {
  this.usage.usageCount += 1;
  return this.save();
};

// Method to increment download count
templateSchema.methods.incrementDownload = function() {
  this.usage.downloadCount += 1;
  return this.save();
};

// Method to toggle favorite
templateSchema.methods.toggleFavorite = function(increment = true) {
  if (increment) {
    this.usage.favoriteCount += 1;
  } else {
    this.usage.favoriteCount = Math.max(0, this.usage.favoriteCount - 1);
  }
  return this.save();
};

// Static method to get popular templates
templateSchema.statics.getPopular = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ 'usage.downloadCount': -1, 'rating.average': -1 })
    .limit(limit)
    .populate('author', 'name avatar');
};

// Static method to search templates
templateSchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    status: 'published',
    ...filters
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, 'rating.average': -1 })
    .populate('author', 'name avatar');
};

module.exports = mongoose.model('Template', templateSchema);

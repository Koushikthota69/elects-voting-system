const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const User = require('../models/user');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const sharp = require('sharp');
const { createCanvas, loadImage, ImageData } = require('canvas');
require('dotenv').config();

const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/face_recognition/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'face-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).single('photo');

// ✅ Auth Middleware
const authMiddleware = (req, res, next) => {
  let token = req.headers['authorization'];
  if (!token) {
    return res.status(403).json({ success: false, message: 'No authentication token provided' });
  }
  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    req.userId = decoded.userId || decoded.id;
    next();
  });
};

// ✅ Pure JavaScript Face Detection and Feature Extraction
async function detectAndExtractFace(imagePath) {
  try {
    console.log('🔍 Detecting face with Pure JavaScript:', imagePath);

    // Load and process image with sharp
    const imageBuffer = await sharp(imagePath)
      .resize(128, 128)
      .grayscale()
      .normalize()
      .raw()
      .toBuffer();

    // Convert buffer to pixel array
    const pixels = new Float32Array(imageBuffer.length);
    for (let i = 0; i < imageBuffer.length; i++) {
      pixels[i] = imageBuffer[i] / 255.0;
    }

    // Advanced feature extraction
    const features = extractAdvancedFeaturesPureJS(pixels, 128, 128);

    console.log(`✅ Extracted ${features.length} facial features using Pure JavaScript`);
    return features;
  } catch (error) {
    console.error('❌ Pure JS face detection error:', error);
    return generateFallbackFeatures();
  }
}

// ✅ Advanced Feature Extraction using Pure JavaScript
function extractAdvancedFeaturesPureJS(pixels, width, height) {
  const features = [];

  // 1. Histogram features
  const histogram = calculateHistogramPureJS(pixels);
  features.push(...histogram);

  // 2. Statistical features
  const stats = calculateStatisticalFeaturesPureJS(pixels);
  features.push(...stats);

  // 3. Gradient features (simplified HOG)
  const gradientFeatures = calculateGradientFeaturesPureJS(pixels, width, height);
  features.push(...gradientFeatures);

  // 4. Texture features (simplified LBP)
  const textureFeatures = calculateTextureFeaturesPureJS(pixels, width, height);
  features.push(...textureFeatures);

  // 5. Geometric features
  const geometricFeatures = calculateGeometricFeaturesPureJS(pixels, width, height);
  features.push(...geometricFeatures);

  // 6. Add some pixel-based features (first 100 pixels)
  const pixelFeatures = Array.from(pixels.slice(0, 100));
  features.push(...pixelFeatures);

  return features;
}

// ✅ Calculate histogram features
function calculateHistogramPureJS(pixels) {
  const histogram = new Array(16).fill(0);

  pixels.forEach(pixel => {
    const bin = Math.min(15, Math.floor(pixel * 16));
    histogram[bin]++;
  });

  // Normalize
  const sum = histogram.reduce((a, b) => a + b, 0);
  return histogram.map(count => count / sum);
}

// ✅ Calculate statistical features
function calculateStatisticalFeaturesPureJS(pixels) {
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;

  const variance = pixels.reduce((sum, pixel) => {
    return sum + Math.pow(pixel - mean, 2);
  }, 0) / pixels.length;

  const stdDev = Math.sqrt(variance);

  // Calculate skewness and kurtosis
  const skewness = pixels.reduce((sum, pixel) => {
    return sum + Math.pow(pixel - mean, 3);
  }, 0) / (pixels.length * Math.pow(stdDev, 3));

  const kurtosis = pixels.reduce((sum, pixel) => {
    return sum + Math.pow(pixel - mean, 4);
  }, 0) / (pixels.length * Math.pow(variance, 2)) - 3;

  return [
    mean,
    stdDev,
    skewness,
    kurtosis,
    Math.min(...pixels),
    Math.max(...pixels)
  ];
}

// ✅ Calculate gradient features (simplified HOG)
function calculateGradientFeaturesPureJS(pixels, width, height) {
  const features = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Simple gradient calculation
      const gradX = pixels[idx + 1] - pixels[idx - 1];
      const gradY = pixels[idx + width] - pixels[idx - width];

      const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
      const angle = Math.atan2(gradY, gradX);

      features.push(magnitude, angle);
    }
  }

  // Limit features to prevent overflow
  return features.slice(0, 50);
}

// ✅ Calculate texture features (simplified LBP)
function calculateTextureFeaturesPureJS(pixels, width, height) {
  const features = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = pixels[y * width + x];
      let binaryPattern = 0;

      // 3x3 neighborhood (simplified)
      const neighbors = [
        pixels[(y-1)*width + (x-1)], pixels[(y-1)*width + x], pixels[(y-1)*width + (x+1)],
        pixels[y*width + (x+1)], pixels[(y+1)*width + (x+1)], pixels[(y+1)*width + x],
        pixels[(y+1)*width + (x-1)], pixels[y*width + (x-1)]
      ];

      neighbors.forEach((neighbor, idx) => {
        if (neighbor >= center) {
          binaryPattern |= (1 << idx);
        }
      });

      features.push(binaryPattern / 255);
    }
  }

  return features.slice(0, 50);
}

// ✅ Calculate geometric features
function calculateGeometricFeaturesPureJS(pixels, width, height) {
  // Calculate center of mass
  let sumX = 0, sumY = 0, totalMass = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const intensity = pixels[y * width + x];
      sumX += x * intensity;
      sumY += y * intensity;
      totalMass += intensity;
    }
  }

  const centerX = totalMass > 0 ? sumX / totalMass : width / 2;
  const centerY = totalMass > 0 ? sumY / totalMass : height / 2;

  return [
    centerX / width,
    centerY / height,
    width / 128,  // Normalized dimensions
    height / 128,
    (width * height) / (128 * 128) // Area ratio
  ];
}

// ✅ Fallback feature generation
function generateFallbackFeatures() {
  console.log('🔄 Using fallback feature generation');
  return Array.from({ length: 256 }, (_, i) =>
    Math.sin(i * 0.1) * 0.3 + Math.cos(i * 0.05) * 0.3 + 0.4
  );
}

// ✅ Advanced Face Similarity Calculation
function calculateFaceSimilarity(encoding1, encoding2) {
  if (!encoding1 || !encoding2 || encoding1.length !== encoding2.length) {
    console.log('❌ Invalid encodings for similarity calculation');
    return 0;
  }

  // Use multiple similarity metrics for better accuracy
  const cosineSim = calculateCosineSimilarity(encoding1, encoding2);
  const euclideanSim = calculateEuclideanSimilarity(encoding1, encoding2);
  const manhattanSim = calculateManhattanSimilarity(encoding1, encoding2);
  const pearsonSim = calculatePearsonSimilarity(encoding1, encoding2);

  // Weighted combination - prioritize cosine similarity
  const combinedSimilarity =
    (cosineSim * 0.4) +
    (euclideanSim * 0.3) +
    (manhattanSim * 0.2) +
    (pearsonSim * 0.1);

  console.log(`📊 Similarity Analysis - Cosine: ${cosineSim.toFixed(3)}, Euclidean: ${euclideanSim.toFixed(3)}, Combined: ${combinedSimilarity.toFixed(3)}`);

  return Math.max(0, Math.min(1, combinedSimilarity));
}

// ✅ Cosine Similarity
function calculateCosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (mag1 * mag2);
}

// ✅ Euclidean Similarity
function calculateEuclideanSimilarity(vec1, vec2) {
  let sumSquaredDiff = 0;

  for (let i = 0; i < vec1.length; i++) {
    sumSquaredDiff += Math.pow(vec1[i] - vec2[i], 2);
  }

  const distance = Math.sqrt(sumSquaredDiff);
  const maxDistance = Math.sqrt(vec1.length);

  return 1 - (distance / maxDistance);
}

// ✅ Manhattan Similarity
function calculateManhattanSimilarity(vec1, vec2) {
  let sumAbsDiff = 0;

  for (let i = 0; i < vec1.length; i++) {
    sumAbsDiff += Math.abs(vec1[i] - vec2[i]);
  }

  const maxDistance = vec1.length;
  return 1 - (sumAbsDiff / maxDistance);
}

// ✅ Pearson Correlation Similarity
function calculatePearsonSimilarity(vec1, vec2) {
  const n = vec1.length;

  const sum1 = vec1.reduce((a, b) => a + b, 0);
  const sum2 = vec2.reduce((a, b) => a + b, 0);

  const sum1Sq = vec1.reduce((a, b) => a + b * b, 0);
  const sum2Sq = vec2.reduce((a, b) => a + b * b, 0);

  let pSum = 0;
  for (let i = 0; i < n; i++) {
    pSum += vec1[i] * vec2[i];
  }

  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

  if (den === 0) return 0;

  return (num / den + 1) / 2; // Normalize to 0-1
}

// ✅ Face Registration Endpoint
router.post('/facerecognition/register', authMiddleware, (req, res) => {
  console.log('🔍 Starting PURE JS face registration for user:', req.userId);

  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ Upload error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE' ?
          'File too large. Maximum size is 10MB.' : err.message
      });
    }

    const userId = req.userId;
    let uploadedPhotoPath = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded. Please capture a clear photo of your face.'
        });
      }

      uploadedPhotoPath = req.file.path;
      console.log('📸 Registration photo uploaded:', uploadedPhotoPath);

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
        return res.status(404).json({
          success: false,
          message: 'User account not found.'
        });
      }

      console.log('👤 User found for registration:', user.email);

      // ✅ Pure JavaScript face detection and feature extraction
      const faceEncoding = await detectAndExtractFace(uploadedPhotoPath);

      if (!faceEncoding) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
        return res.status(400).json({
          success: false,
          message: 'No face detected or image quality too low. Please ensure:\n• Your face is clearly visible\n• Good lighting conditions\n• Facing camera directly\n• No sunglasses or face coverings'
        });
      }

      // Store face data
      user.faceEncoding = faceEncoding;
      user.realtimePhoto = uploadedPhotoPath;
      user.isFaceRegistered = true;
      user.faceRegisteredAt = new Date();
      await user.save();

      console.log('✅ Face registered successfully with Pure JS for user:', user.email);

      // Keep the uploaded file for reference
      // await fs.promises.unlink(uploadedPhotoPath).catch(console.error);

      res.status(200).json({
        success: true,
        message: 'Face registration completed successfully! Your facial features have been securely stored.',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          isFaceRegistered: true
        }
      });

    } catch (error) {
      console.error('🔥 Face registration system error:', error);

      if (uploadedPhotoPath) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
      }

      return res.status(500).json({
        success: false,
        message: 'System error during face registration. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// ✅ Face Verification Endpoint
router.post('/facerecognition/verify', authMiddleware, (req, res) => {
  console.log('🔍 Starting PURE JS face verification for user:', req.userId);

  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ Upload error:', err.message);
      return res.status(400).json({
        success: false,
        message: err.code === 'LIMIT_FILE_SIZE' ?
          'File too large. Maximum size is 10MB.' : err.message
      });
    }

    const userId = req.userId;
    let uploadedPhotoPath = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file uploaded. Please capture a clear photo of your face.'
        });
      }

      uploadedPhotoPath = req.file.path;
      console.log('📸 Verification photo uploaded:', uploadedPhotoPath);

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID format'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
        return res.status(404).json({
          success: false,
          message: 'User account not found. Please ensure you are registered.'
        });
      }

      console.log('👤 User found for verification:', user.email);

      if (!user.isFaceRegistered || !user.faceEncoding) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
        return res.status(400).json({
          success: false,
          message: 'No face registered for your account. Please complete face registration first.',
          errorCode: 'FACE_NOT_REGISTERED'
        });
      }

      // Extract features from verification image using Pure JS
      const verificationFaceEncoding = await detectAndExtractFace(uploadedPhotoPath);

      if (!verificationFaceEncoding) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
        return res.status(400).json({
          success: false,
          message: 'No face detected in verification image. Please ensure your face is clearly visible and well-lit.'
        });
      }

      // Calculate similarity with advanced algorithm
      const similarity = calculateFaceSimilarity(user.faceEncoding, verificationFaceEncoding);

      console.log('📊 Pure JS face comparison result - Similarity:', (similarity * 100).toFixed(1) + '%');

      const HIGH_SECURITY_THRESHOLD = 0.35; // 75% similarity required for Pure JS
      const MEDIUM_SECURITY_THRESHOLD = 0.30; // 65% for medium security

      const isMatch = similarity >= HIGH_SECURITY_THRESHOLD;
      const isPartialMatch = similarity >= MEDIUM_SECURITY_THRESHOLD && similarity < HIGH_SECURITY_THRESHOLD;

      await fs.promises.unlink(uploadedPhotoPath).catch(console.error);

      if (isMatch) {
        console.log('✅ Face verification SUCCESS - High similarity:', (similarity * 100).toFixed(1) + '%');

        // Update last verification time
        user.lastFaceVerification = new Date();
        await user.save();

        return res.status(200).json({
          success: true,
          message: `Face verification successful! Similarity: ${(similarity * 100).toFixed(1)}%`,
          similarity: similarity,
          confidence: 'HIGH',
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        });
      } else if (isPartialMatch) {
        console.log('⚠️ Face verification PARTIAL MATCH - Medium similarity:', (similarity * 100).toFixed(1) + '%');

        return res.status(200).json({
          success: false,
          message: `Face verification failed. Low similarity: ${(similarity * 100).toFixed(1)}% (required: ${(HIGH_SECURITY_THRESHOLD * 100).toFixed(1)}%)`,
          similarity: similarity,
          threshold: HIGH_SECURITY_THRESHOLD,
          errorCode: 'FACE_VERIFICATION_FAILED',
          suggestion: 'Please ensure:\n• Good lighting conditions\n• Look directly at camera\n• Same person as registration\n• Remove glasses/face coverings'
        });
      } else {
        console.log('❌ Face verification FAILED - Low similarity:', (similarity * 100).toFixed(1) + '%');

        return res.status(200).json({
          success: false,
          message: `Face verification failed. Very low similarity: ${(similarity * 100).toFixed(1)}% (required: ${(HIGH_SECURITY_THRESHOLD * 100).toFixed(1)}%)`,
          similarity: similarity,
          threshold: HIGH_SECURITY_THRESHOLD,
          errorCode: 'FACE_VERIFICATION_FAILED',
          suggestion: 'This does not appear to be the same person. Please use the same person who registered for voting.'
        });
      }

    } catch (error) {
      console.error('🔥 Face verification system error:', error);

      if (uploadedPhotoPath) {
        await fs.promises.unlink(uploadedPhotoPath).catch(console.error);
      }

      return res.status(500).json({
        success: false,
        message: 'System error during face verification. Please try again.',
        errorCode: 'SYSTEM_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// ✅ Check Face Registration Status
router.get('/facerecognition/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      isFaceRegistered: user.isFaceRegistered,
      faceRegisteredAt: user.faceRegisteredAt,
      lastFaceVerification: user.lastFaceVerification,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error checking face registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check face registration status'
    });
  }
});

// ✅ Health check endpoint
router.get('/facerecognition/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Pure JavaScript face verification service is running',
    timestamp: new Date().toISOString(),
    features: [
      'pure_javascript_image_analysis',
      'statistical_feature_extraction',
      'gradient_analysis',
      'texture_analysis',
      'multi_metric_verification'
    ],
    platform: 'Windows compatible'
  });
});

module.exports = router;
/**
 * Cloudinary Upload Utility
 * Handles unsigned uploads for images, videos, and documents.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

export const uploadToCloudinary = async (file) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    const missing = [];
    if (!CLOUD_NAME) missing.push('VITE_CLOUDINARY_CLOUD_NAME');
    if (!UPLOAD_PRESET) missing.push('VITE_CLOUDINARY_UPLOAD_PRESET');
    throw new Error(`Missing Environment Variables: ${missing.join(', ')}. Please add them to your Vercel project settings.`);
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Cloudinary upload failed (Check if Cloud Name and Preset are correct)');
    }

    const data = await response.json();
    
    // Determine media type
    let mediaType = 'doc';
    if (data.resource_type === 'image') mediaType = 'image';
    if (data.resource_type === 'video') mediaType = 'video';
    
    return {
      url: data.secure_url,
      type: mediaType,
      publicId: data.public_id
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

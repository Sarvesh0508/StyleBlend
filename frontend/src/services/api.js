import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for diffusion inference
});

export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.warn('Backend health check failed:', error.message);
    return { status: 'offline', error: error.message };
  }
};

export const generateVirtualTryOn = async (formData) => {
  try {
    const response = await apiClient.post('/tryon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error(error.message || 'Failed to communicate with FastAPI backend.');
  }
};

// ---------------------------------------------------------------------------
// Customization: re-style an existing result instantly (no GPU re-run)
// ---------------------------------------------------------------------------

export const customizeResult = async (payload, signal) => {
  try {
    const response = await apiClient.post('/customize', payload, { signal, timeout: 60000 });
    return response.data;
  } catch (error) {
    if (error.code === 'ERR_CANCELED') throw error;
    const msg = error.response?.data?.detail || error.message || 'Customization failed.';
    const err = new Error(msg);
    err.status = error.response?.status;
    throw err;
  }
};

// ---------------------------------------------------------------------------
// PHASE A: Persistent Saved Looks
// ---------------------------------------------------------------------------

export const saveLookToBackend = async (lookData) => {
  try {
    const response = await apiClient.post('/saved-looks', lookData);
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || 'Failed to save look.';
    throw new Error(msg);
  }
};

export const fetchSavedLooks = async () => {
  try {
    const response = await apiClient.get('/saved-looks');
    return response.data.saved_looks || [];
  } catch (error) {
    console.warn('Failed to fetch saved looks from backend, using fallback:', error.message);
    return null;
  }
};

export const removeSavedLook = async (lookId) => {
  try {
    const response = await apiClient.delete(`/saved-looks/${lookId}`);
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || 'Failed to delete look.';
    throw new Error(msg);
  }
};

// ---------------------------------------------------------------------------
// PHASE B: Digital Wardrobe API
// ---------------------------------------------------------------------------

export const fetchWardrobe = async () => {
  try {
    const response = await apiClient.get('/wardrobe');
    return response.data.items || [];
  } catch (error) {
    console.warn('Failed to fetch wardrobe from backend, using fallback:', error.message);
    return null;
  }
};

export const createWardrobeItemApi = async (formData) => {
  try {
    const response = await apiClient.post('/wardrobe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || 'Failed to create wardrobe item.';
    throw new Error(msg);
  }
};

export const updateWardrobeItemApi = async (itemId, formData) => {
  try {
    const response = await apiClient.put(`/wardrobe/${itemId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || 'Failed to update wardrobe item.';
    throw new Error(msg);
  }
};

export const deleteWardrobeItemApi = async (itemId) => {
  try {
    const response = await apiClient.delete(`/wardrobe/${itemId}`);
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || 'Failed to delete wardrobe item.';
    throw new Error(msg);
  }
};

// ---------------------------------------------------------------------------
// PHASE C: Size Comparison API
// ---------------------------------------------------------------------------

export const requestSizeComparison = async (payload) => {
  try {
    const response = await apiClient.post('/size-comparison', payload);
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || 'Size comparison failed.';
    throw new Error(msg);
  }
};

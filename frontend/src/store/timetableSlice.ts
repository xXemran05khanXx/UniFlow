import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { timetablesAPI } from '../services/api';
import { Timetable, TimetableGeneration, TimetableState } from '../types';

const initialState: TimetableState = {
  timetables: [],
  currentTimetable: null,
  generations: [],
  currentGeneration: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchTimetables = createAsyncThunk(
  'timetable/fetchTimetables',
  async (_, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.getAll();
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch timetables');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch timetables');
    }
  }
);

export const fetchTimetableById = createAsyncThunk(
  'timetable/fetchTimetableById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.getById(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch timetable');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch timetable');
    }
  }
);

export const createTimetable = createAsyncThunk(
  'timetable/createTimetable',
  async (timetableData: Partial<Timetable>, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.create(timetableData);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to create timetable');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create timetable');
    }
  }
);

export const updateTimetable = createAsyncThunk(
  'timetable/updateTimetable',
  async ({ id, data }: { id: string; data: Partial<Timetable> }, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.update(id, data);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to update timetable');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update timetable');
    }
  }
);

export const deleteTimetable = createAsyncThunk(
  'timetable/deleteTimetable',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.delete(id);
      if (response.success) {
        return id;
      } else {
        return rejectWithValue(response.error || 'Failed to delete timetable');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete timetable');
    }
  }
);

export const publishTimetable = createAsyncThunk(
  'timetable/publishTimetable',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.publish(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to publish timetable');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to publish timetable');
    }
  }
);

export const generateTimetable = createAsyncThunk(
  'timetable/generateTimetable',
  async (parameters: { semester: number; department: string; preferences?: any }, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.generate(parameters);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to generate timetable');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to generate timetable');
    }
  }
);

export const fetchGenerations = createAsyncThunk(
  'timetable/fetchGenerations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.getGenerations();
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch generations');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch generations');
    }
  }
);

export const fetchGenerationById = createAsyncThunk(
  'timetable/fetchGenerationById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await timetablesAPI.getGeneration(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || 'Failed to fetch generation');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch generation');
    }
  }
);

const timetableSlice = createSlice({
  name: 'timetable',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTimetable: (state, action) => {
      state.currentTimetable = action.payload;
    },
    setCurrentGeneration: (state, action) => {
      state.currentGeneration = action.payload;
    },
    clearCurrentTimetable: (state) => {
      state.currentTimetable = null;
    },
    clearCurrentGeneration: (state) => {
      state.currentGeneration = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Timetables
      .addCase(fetchTimetables.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTimetables.fulfilled, (state, action) => {
        state.isLoading = false;
        state.timetables = action.payload;
      })
      .addCase(fetchTimetables.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Timetable by ID
      .addCase(fetchTimetableById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTimetableById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTimetable = action.payload;
      })
      .addCase(fetchTimetableById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Timetable
      .addCase(createTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        state.timetables.push(action.payload);
        state.currentTimetable = action.payload;
      })
      .addCase(createTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Timetable
      .addCase(updateTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.timetables.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.timetables[index] = action.payload;
        }
        if (state.currentTimetable?._id === action.payload._id) {
          state.currentTimetable = action.payload;
        }
      })
      .addCase(updateTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Timetable
      .addCase(deleteTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        state.timetables = state.timetables.filter(t => t._id !== action.payload);
        if (state.currentTimetable?._id === action.payload) {
          state.currentTimetable = null;
        }
      })
      .addCase(deleteTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Publish Timetable
      .addCase(publishTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(publishTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.timetables.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.timetables[index] = action.payload;
        }
        if (state.currentTimetable?._id === action.payload._id) {
          state.currentTimetable = action.payload;
        }
      })
      .addCase(publishTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Generate Timetable
      .addCase(generateTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        state.generations.unshift(action.payload);
        state.currentGeneration = action.payload;
      })
      .addCase(generateTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Generations
      .addCase(fetchGenerations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGenerations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.generations = action.payload;
      })
      .addCase(fetchGenerations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Generation by ID
      .addCase(fetchGenerationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGenerationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentGeneration = action.payload;
      })
      .addCase(fetchGenerationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setCurrentTimetable, 
  setCurrentGeneration, 
  clearCurrentTimetable, 
  clearCurrentGeneration 
} = timetableSlice.actions;

export default timetableSlice.reducer;

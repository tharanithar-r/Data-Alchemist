import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Helper for testing file uploads
export const uploadFile = async (input: HTMLInputElement, file: File) => {
  await act(async () => {
    await userEvent.upload(input, file)
  })
}

// Helper for testing drag and drop
export const simulateDragAndDrop = async (
  dropzone: HTMLElement,
  files: File[]
) => {
  const user = userEvent.setup()
  
  await act(async () => {
    const dataTransfer = {
      files,
      items: files.map(file => ({
        kind: 'file' as const,
        type: file.type,
        getAsFile: () => file,
      })),
      types: ['Files'],
    }

    await user.hover(dropzone)
    
    // Simulate drag enter
    dropzone.dispatchEvent(
      new DragEvent('dragenter', {
        bubbles: true,
        dataTransfer: dataTransfer as unknown as DataTransfer,
      })
    )

    // Simulate drag over
    dropzone.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        dataTransfer: dataTransfer as unknown as DataTransfer,
      })
    )

    // Simulate drop
    dropzone.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        dataTransfer: dataTransfer as unknown as DataTransfer,
      })
    )
  })
}

// Helper for testing async operations with proper waiting
export const waitForAsync = async (callback: () => Promise<void>) => {
  await act(async () => {
    await callback()
  })
}

// Helper for testing Zustand stores
export const createStoreTest = <T>(
  createStore: () => T,
  initialState?: Partial<T>
) => {
  let store: T

  beforeEach(() => {
    store = createStore()
    if (initialState) {
      Object.assign(store as any, initialState)
    }
  })

  return () => store
}

// Helper for mocking timers in validation debouncing
export const mockTimers = () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  return {
    advanceTime: (ms: number) => act(() => jest.advanceTimersByTime(ms)),
    runAllTimers: () => act(() => jest.runAllTimers()),
  }
}

// Helper for testing AG-Grid components
export const getGridApi = (_container: HTMLElement) => {
  // Mock AG-Grid API for testing
  return {
    setRowData: jest.fn(),
    getRowData: jest.fn(),
    setColumnDefs: jest.fn(),
    getColumnDefs: jest.fn(),
    refreshCells: jest.fn(),
    sizeColumnsToFit: jest.fn(),
    getSelectedRows: jest.fn(),
    selectAll: jest.fn(),
    deselectAll: jest.fn(),
  }
}

// Helper for testing validation errors
export const expectValidationError = (
  errors: any[],
  type: string,
  entity?: string,
  field?: string
) => {
  const error = errors.find(err => 
    err.type === type && 
    (!entity || err.entity === entity) &&
    (!field || err.field === field)
  )
  expect(error).toBeDefined()
  return error
}

// Helper for testing AI integration
export const mockGeminiAPI = () => {
  const mockGenerateContent = jest.fn()
  
  jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  }))

  return {
    mockGenerateContent,
    mockResponse: (response: any) => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(response),
        },
      })
    },
    mockError: (error: Error) => {
      mockGenerateContent.mockRejectedValue(error)
    },
  }
}

// Helper for testing localStorage operations
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    get store() {
      return { ...store }
    },
  }
}
'use client'

import { CalculatorIcon, AlertTriangle, CheckCircle, Info, RotateCcw, Users, Target, Zap, TrendingUp } from 'lucide-react'
import { useState, useMemo } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// import { Label } from '@/components/ui/label' // Not used in this component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRulesStore, PriorityWeights } from '@/lib/stores/rules-store'

interface AHPCriteria {
  key: keyof PriorityWeights
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const AHP_CRITERIA: AHPCriteria[] = [
  {
    key: 'fairness',
    label: 'Fairness',
    description: 'Equal distribution of work and opportunities',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    key: 'priorityLevel',
    label: 'Priority Level',
    description: 'High-priority clients and urgent tasks',
    icon: TrendingUp,
    color: 'text-green-600'
  },
  {
    key: 'taskFulfillment',
    label: 'Task Fulfillment',
    description: 'Maximize completed tasks',
    icon: Target,
    color: 'text-purple-600'
  },
  {
    key: 'workerUtilization',
    label: 'Worker Utilization',
    description: 'Optimize worker capacity usage',
    icon: Zap,
    color: 'text-orange-600'
  },
  {
    key: 'constraints',
    label: 'Constraints',
    description: 'Enforce business rules strictly',
    icon: AlertTriangle,
    color: 'text-red-600'
  }
]

// Saaty's 1-9 scale for AHP comparisons
const AHP_SCALE = [
  { value: 1, label: '1 - Equal Importance', description: 'Two criteria are equally important' },
  { value: 2, label: '2 - Weak', description: 'Between equal and moderate' },
  { value: 3, label: '3 - Moderate', description: 'Moderate importance of one over another' },
  { value: 4, label: '4 - Moderate+', description: 'Between moderate and strong' },
  { value: 5, label: '5 - Strong', description: 'Strong importance of one over another' },
  { value: 6, label: '6 - Strong+', description: 'Between strong and very strong' },
  { value: 7, label: '7 - Very Strong', description: 'Very strong importance of one over another' },
  { value: 8, label: '8 - Very Strong+', description: 'Between very strong and extreme' },
  { value: 9, label: '9 - Extreme', description: 'Extreme importance of one over another' }
]

// Initialize comparison matrix
const initializeMatrix = (): number[][] => {
  const size = AHP_CRITERIA.length
  const matrix = Array(size).fill(null).map(() => Array(size).fill(1))
  return matrix
}

// Calculate geometric mean weights from comparison matrix
const calculateWeights = (matrix: number[][]): number[] => {
  const size = matrix.length
  const weights: number[] = []
  
  for (let i = 0; i < size; i++) {
    let product = 1
    for (let j = 0; j < size; j++) {
      product *= matrix[i][j]
    }
    weights[i] = Math.pow(product, 1 / size)
  }
  
  // Normalize weights to sum to 1
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  return weights.map(weight => weight / sum)
}

// Calculate consistency ratio (CR)
const calculateConsistencyRatio = (matrix: number[][], weights: number[]): number => {
  const size = matrix.length
  
  // Calculate lambda max (approximate)
  let lambdaMax = 0
  for (let i = 0; i < size; i++) {
    let sum = 0
    for (let j = 0; j < size; j++) {
      sum += matrix[i][j] * weights[j]
    }
    lambdaMax += sum / weights[i]
  }
  lambdaMax /= size
  
  // Consistency Index (CI)
  const ci = (lambdaMax - size) / (size - 1)
  
  // Random Index (RI) for matrix sizes
  const randomIndices = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49]
  const ri = randomIndices[size] || 1.12
  
  // Consistency Ratio
  return ci / ri
}

interface ComparisonCellProps {
  rowCriteria: AHPCriteria
  colCriteria: AHPCriteria
  value: number
  isEditable: boolean
  onChange: (value: number) => void
}

function ComparisonCell({ rowCriteria, colCriteria, value, isEditable, onChange }: ComparisonCellProps) {
  if (!isEditable) {
    // Display reciprocal or diagonal values
    const displayValue = value === 1 ? '1' : value < 1 ? `1/${Math.round(1/value)}` : value.toString()
    return (
      <div className="h-12 flex items-center justify-center bg-gray-50 border rounded">
        <span className="text-sm font-medium text-gray-600">{displayValue}</span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(parseFloat(val))}
      >
        <SelectTrigger className="h-12 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AHP_SCALE.map((scale) => (
            <SelectItem key={scale.value} value={scale.value.toString()}>
              <div>
                <div className="font-medium">{scale.label}</div>
                <div className="text-xs text-gray-600">{scale.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="text-xs text-center text-gray-500">
        {rowCriteria.label} vs {colCriteria.label}
      </div>
    </div>
  )
}

export function AHPMatrix() {
  const { 
    setPriorityWeights, 
    setPriorityMethod,
    rules 
  } = useRulesStore()

  const [matrix, setMatrix] = useState<number[][]>(initializeMatrix())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Calculate weights and consistency
  const { weights, consistencyRatio, priorityWeights } = useMemo(() => {
    const calculatedWeights = calculateWeights(matrix)
    const cr = calculateConsistencyRatio(matrix, calculatedWeights)
    
    // Convert normalized weights to 0-10 scale
    const maxWeight = Math.max(...calculatedWeights)
    const scaledWeights: PriorityWeights = {
      fairness: Math.round((calculatedWeights[0] / maxWeight) * 10 * 10) / 10,
      priorityLevel: Math.round((calculatedWeights[1] / maxWeight) * 10 * 10) / 10,
      taskFulfillment: Math.round((calculatedWeights[2] / maxWeight) * 10 * 10) / 10,
      workerUtilization: Math.round((calculatedWeights[3] / maxWeight) * 10 * 10) / 10,
      constraints: Math.round((calculatedWeights[4] / maxWeight) * 10 * 10) / 10
    }
    
    return {
      weights: calculatedWeights,
      consistencyRatio: cr,
      priorityWeights: scaledWeights
    }
  }, [matrix])

  // Update comparison value and its reciprocal
  const updateComparison = (row: number, col: number, value: number) => {
    const newMatrix = matrix.map(row => [...row])
    newMatrix[row][col] = value
    newMatrix[col][row] = 1 / value
    setMatrix(newMatrix)
    setHasUnsavedChanges(true)
  }

  // Apply weights to store
  const applyWeights = () => {
    setPriorityWeights(priorityWeights)
    setPriorityMethod('ahp')
    setHasUnsavedChanges(false)
  }

  // Reset matrix to defaults
  const resetMatrix = () => {
    setMatrix(initializeMatrix())
    setHasUnsavedChanges(false)
  }

  // Get consistency status
  const getConsistencyStatus = () => {
    if (consistencyRatio <= 0.1) {
      return { type: 'good', label: 'Acceptable', color: 'text-green-600', bgColor: 'bg-green-50' }
    } else if (consistencyRatio <= 0.2) {
      return { type: 'warning', label: 'Marginal', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    } else {
      return { type: 'poor', label: 'Poor', color: 'text-red-600', bgColor: 'bg-red-50' }
    }
  }

  const consistencyStatus = getConsistencyStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AHP Pairwise Comparison</h2>
          <p className="text-gray-600 mt-1">
            Compare criteria pairs to determine relative importance using mathematical analysis
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Unsaved Changes
            </Badge>
          )}
          <Button variant="outline" onClick={resetMatrix}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Matrix
          </Button>
          <Button onClick={applyWeights} disabled={!hasUnsavedChanges}>
            <CalculatorIcon className="h-4 w-4 mr-2" />
            Apply Weights
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Comparison Matrix */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalculatorIcon className="h-5 w-5" />
                Pairwise Comparison Matrix
              </CardTitle>
              <CardDescription>
                Compare each pair of criteria. How much more important is the row criterion compared to the column criterion?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Scale Reference */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Saaty's 1-9 Scale</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs text-blue-700">
                    <div><strong>1:</strong> Equal importance</div>
                    <div><strong>3:</strong> Moderate importance</div>
                    <div><strong>5:</strong> Strong importance</div>
                    <div><strong>7:</strong> Very strong</div>
                    <div><strong>9:</strong> Extreme importance</div>
                    <div><strong>2,4,6,8:</strong> Intermediate values</div>
                  </div>
                </div>

                {/* Matrix Grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Header Row */}
                    <div className="grid grid-cols-6 gap-2 mb-2">
                      <div></div>
                      {AHP_CRITERIA.map((criteria) => (
                        <div key={criteria.key} className="text-center p-2">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <criteria.icon className={`h-4 w-4 ${criteria.color}`} />
                          </div>
                          <div className="text-xs font-medium">{criteria.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Matrix Rows */}
                    {AHP_CRITERIA.map((rowCriteria, rowIndex) => (
                      <div key={rowCriteria.key} className="grid grid-cols-6 gap-2 mb-2">
                        {/* Row Header */}
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <rowCriteria.icon className={`h-4 w-4 ${rowCriteria.color}`} />
                          <span className="text-sm font-medium">{rowCriteria.label}</span>
                        </div>

                        {/* Comparison Cells */}
                        {AHP_CRITERIA.map((colCriteria, colIndex) => (
                          <ComparisonCell
                            key={`${rowIndex}-${colIndex}`}
                            rowCriteria={rowCriteria}
                            colCriteria={colCriteria}
                            value={matrix[rowIndex][colIndex]}
                            isEditable={rowIndex < colIndex}
                            onChange={(value) => updateComparison(rowIndex, colIndex, value)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Panel */}
        <div className="space-y-6">
          {/* Consistency Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Consistency Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${consistencyStatus.bgColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {consistencyStatus.type === 'good' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {consistencyStatus.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    {consistencyStatus.type === 'poor' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    <span className={`font-medium ${consistencyStatus.color}`}>
                      {consistencyStatus.label} Consistency
                    </span>
                  </div>
                  <div className={`text-sm ${consistencyStatus.color}`}>
                    Consistency Ratio: {(consistencyRatio * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="text-xs text-gray-600">
                  <p><strong>CR ≤ 10%:</strong> Acceptable consistency</p>
                  <p><strong>CR 10-20%:</strong> Marginal, review comparisons</p>
                  <p><strong>CR &gt; 20%:</strong> Inconsistent, revise judgments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculated Weights */}
          <Card>
            <CardHeader>
              <CardTitle>Calculated Weights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AHP_CRITERIA.map((criteria, index) => (
                  <div key={criteria.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <criteria.icon className={`h-4 w-4 ${criteria.color}`} />
                      <span className="text-sm font-medium">{criteria.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {priorityWeights[criteria.key]}/10
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {(weights[index] * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AHP Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" />
                About AHP
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <div className="space-y-2">
                <p>The Analytic Hierarchy Process uses pairwise comparisons to derive priority weights mathematically.</p>
                <p>Benefits:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Mathematically rigorous</li>
                  <li>Handles complex trade-offs</li>
                  <li>Built-in consistency checking</li>
                  <li>Reduces cognitive bias</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Active Rules Context */}
          {rules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rules Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>{rules.filter(r => r.isActive).length} active rules</p>
                  <p className="mt-2">
                    Consider the "Constraints" importance based on how strictly you want to enforce your business rules.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Consistency Warnings */}
      {consistencyRatio > 0.1 && (
        <Alert variant={consistencyRatio > 0.2 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {consistencyRatio > 0.2 ? (
              <div>
                <strong>Poor Consistency:</strong> Your comparisons contain significant contradictions. 
                Review your judgments and ensure logical consistency across all pairwise comparisons.
              </div>
            ) : (
              <div>
                <strong>Marginal Consistency:</strong> Some comparisons may be inconsistent. 
                Consider reviewing your judgments for better results.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Method Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How AHP Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Pairwise Comparisons</h4>
              <ul className="space-y-1">
                <li>• Compare every criterion against every other</li>
                <li>• Use Saaty's 1-9 scale for judgments</li>
                <li>• System automatically fills reciprocal values</li>
                <li>• Diagonal elements are always 1 (equal to self)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Mathematical Processing</h4>
              <ul className="space-y-1">
                <li>• Calculates weights using geometric mean method</li>
                <li>• Normalizes weights to sum to 100%</li>
                <li>• Scales to 0-10 range for system compatibility</li>
                <li>• Validates consistency mathematically</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
'use client';

import {
  Sliders,
  List,
  BarChart3,
  BookOpen,
  TrendingUp,
  Activity,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRulesStore } from '@/lib/stores/rules-store';

import { AHPMatrix } from './ahp-matrix';
import { PresetProfiles } from './preset-profiles';
import { PriorityWeightVisualization } from './priority-weight-visualization';
import { RankingInterface } from './ranking-interface';
import { WeightSliders } from './weight-sliders';

export function PrioritizationManager() {
  const { priorityMethod, presetProfile, priorityWeights, rules } =
    useRulesStore();

  const activeRules = rules.filter(r => r.isActive).length;
  const totalWeight = Object.values(priorityWeights).reduce(
    (sum, weight) => sum + weight,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Prioritization & Weights
          </h2>
          <p className="text-gray-600 mt-1">
            Configure how the allocation system should balance different
            criteria
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <span>Method: {priorityMethod}</span>
            </Badge>
            {presetProfile !== 'custom' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Profile: {presetProfile}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalWeight}</div>
                <p className="text-sm text-gray-600">Total Weight</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{priorityMethod}</div>
                <p className="text-sm text-gray-600">Priority Method</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{activeRules}</div>
                <p className="text-sm text-gray-600">Active Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prioritization Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Prioritization Method</CardTitle>
          <CardDescription>
            Select how you want to configure allocation priorities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={priorityMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="sliders" className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Weight Sliders
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Drag & Drop Ranking
              </TabsTrigger>
              <TabsTrigger value="ahp" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                AHP Matrix
              </TabsTrigger>
              <TabsTrigger value="presets" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Preset Profiles
              </TabsTrigger>
              <TabsTrigger
                value="visualization"
                className="flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                Visualization
              </TabsTrigger>
            </TabsList>

            {/* Weight Sliders Method */}
            <TabsContent value="sliders" className="mt-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">
                    Weight Sliders Method
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Use sliders to assign specific weight values (0-10) to each
                    criterion. This method gives you precise control over the
                    relative importance of each factor.
                  </p>
                </div>
                <WeightSliders />
              </div>
            </TabsContent>

            {/* Ranking Method */}
            <TabsContent value="ranking" className="mt-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">
                    Drag & Drop Ranking Method
                  </h3>
                  <p className="text-green-700 text-sm">
                    Simply drag criteria to reorder them by importance. The
                    system automatically converts your ranking to weight values
                    (1st place = highest weight).
                  </p>
                </div>
                <RankingInterface />
              </div>
            </TabsContent>

            {/* AHP Method */}
            <TabsContent value="ahp" className="mt-6">
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">
                    Analytic Hierarchy Process (AHP)
                  </h3>
                  <p className="text-purple-700 text-sm">
                    Use mathematical pairwise comparisons to derive priority
                    weights. AHP provides the most rigorous and consistent
                    method for complex decision-making.
                  </p>
                </div>
                <AHPMatrix />
              </div>
            </TabsContent>

            {/* Presets Method */}
            <TabsContent value="presets" className="mt-6">
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-2">
                    Preset Profiles
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    Choose from expertly designed priority configurations for
                    common organizational needs. Each profile represents a
                    proven allocation strategy.
                  </p>
                </div>
                <PresetProfiles />
              </div>
            </TabsContent>

            {/* Visualization Method */}
            <TabsContent value="visualization" className="mt-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">
                    Priority Weight Visualization
                  </h3>
                  <p className="text-green-700 text-sm">
                    See real-time visualizations of your weight configuration
                    and preview how it affects allocation decisions. Understand
                    the impact of your priority choices before applying them.
                  </p>
                </div>
                <PriorityWeightVisualization />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Method Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Method Comparison</CardTitle>
          <CardDescription>
            Understanding the different approaches to setting priorities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sliders className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">Weight Sliders</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Precise numerical control (0-10 scale)</li>
                <li>• Fine-tuned weight adjustments</li>
                <li>• Real-time percentage calculations</li>
                <li>• Best for: Detailed optimization</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <List className="h-5 w-5 text-green-600" />
                <h4 className="font-medium">Drag & Drop Ranking</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Intuitive priority ordering</li>
                <li>• Automatic weight conversion</li>
                <li>• Clear hierarchy visualization</li>
                <li>• Best for: Simple priority setting</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">AHP Matrix</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Mathematically rigorous approach</li>
                <li>• Pairwise comparison method</li>
                <li>• Built-in consistency validation</li>
                <li>• Best for: Complex decision-making</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium">Preset Profiles</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Expert-designed configurations</li>
                <li>• Business scenario optimization</li>
                <li>• Quick strategy deployment</li>
                <li>• Best for: Proven approaches</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-green-600" />
                <h4 className="font-medium">Visualization</h4>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Real-time weight visualization</li>
                <li>• Allocation impact preview</li>
                <li>• Strategy recommendations</li>
                <li>• Best for: Understanding impact</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

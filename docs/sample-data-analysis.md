# Sample Data Analysis - Data Alchemist

## Overview

Analysis of sample Excel files for the Data Alchemist project, examining data structure, quality issues, and validation challenges that the application needs to handle.

## File Structure

Both V1 and V2 files contain three sheets with identical structure:
- **Clients 1** (91 total rows: 50 data rows + header)
- **Worker 1** (51 total rows: 50 data rows + header) 
- **Tasks 1** (51 total rows: 50 data rows + header)

## Entity Type Analysis

### Clients Entity
**Schema**: `ClientID`, `ClientName`, `PriorityLevel`, `RequestedTaskIDs`, `GroupTag`, `AttributesJSON`

**Characteristics**:
- **ClientID**: Sequential format (C1, C2, C3...)
- **ClientName**: Realistic company names (Acme Corp, Globex Inc, Initech)
- **PriorityLevel**: Numeric values 1.0-5.0 (matches schema requirement)
- **RequestedTaskIDs**: Comma-separated task references (e.g., "T17,T27,T33,T31,T20,T3,T32,T26")
- **GroupTag**: Categorical grouping (GroupA, GroupB, GroupC)
- **AttributesJSON**: Mix of valid JSON and plain text (data quality issue in V1)

**Data Quality Issues**:
- **V1**: Contains non-JSON text in AttributesJSON field
- **V2**: All AttributesJSON entries are properly formatted JSON
- Some RequestedTaskIDs reference invalid task IDs

### Workers Entity
**Schema**: `WorkerID`, `WorkerName`, `Skills`, `AvailableSlots`, `MaxLoadPerPhase`, `WorkerGroup`, `QualificationLevel`

**Characteristics**:
- **WorkerID**: Sequential format (W1, W2, W3...)
- **WorkerName**: Generic naming (Worker1, Worker2...)
- **Skills**: Comma-separated skill tags (data, analysis, coding, ml, testing, ui/ux, reporting, devops, design)
- **AvailableSlots**: JSON array format [1,2,3], [2,4,5]
- **MaxLoadPerPhase**: Numeric values (1.0-3.0)
- **WorkerGroup**: Matches client groups (GroupA, GroupB, GroupC)
- **QualificationLevel**: Numeric values (1.0-5.0) - **Schema Mismatch**: Current schema expects string enum

### Tasks Entity
**Schema**: `TaskID`, `TaskName`, `Category`, `Duration`, `RequiredSkills`, `PreferredPhases`, `MaxConcurrent`

**Characteristics**:
- **TaskID**: Sequential format (T1, T2, T3...)
- **TaskName**: Descriptive task names (Data Cleanup, Report Generation, Model Training)
- **Category**: Various categories including some not in current schema
- **Duration**: Numeric values (1.0-5.0)
- **RequiredSkills**: Comma-separated skills matching worker skills
- **PreferredPhases**: **Format Inconsistency**: Mix of range format ("1 - 2") and array format ("[2,3,4]")
- **MaxConcurrent**: Numeric values (1.0-3.0)

## V1 vs V2 Comparison

### Key Differences
1. **AttributesJSON Formatting**:
   - **V1**: Mix of JSON and plain text (data quality issue)
   - **V2**: Consistent JSON format with structured schema: `{"message": "text", "location": "city", "budget": number}`

2. **Task References**:
   - **V1**: Contains invalid task reference "TX" in Client C20
   - **V2**: Cleaned up invalid references

3. **PreferredPhases Spacing**:
   - **V1**: Consistent spacing in ranges ("1 - 2")
   - **V2**: Some inconsistent spacing ("1  -  2" with extra spaces)

## Data Quality Issues and Validation Challenges

### Schema Mismatches
- **QualificationLevel**: Data uses numeric (1.0-5.0) but schema expects string enum ['Junior', 'Mid', 'Senior', 'Expert']
- **TaskCategory**: Data includes categories not in schema (ETL, Analytics, ML, QA, Research, Infrastructure)

### Format Inconsistencies
- **PreferredPhases**: Mixed formats require normalization (range vs array)
- **AttributesJSON**: V1 contains plain text requiring AI-powered cleanup

### Cross-Entity References
- **RequestedTaskIDs**: Some invalid references need validation
- **Skills**: Need cross-validation between worker skills and task requirements

### Data Validation Requirements
- JSON validation for AttributesJSON field
- Range validation for PriorityLevel (1-5)
- Array format validation for AvailableSlots
- Cross-reference validation between entities
- Duplicate ID detection

## Patterns for File Parser and Validation Engine

### Header Mapping Challenges
- Headers match expected schema exactly (good for AI mapping)
- Need to handle case variations and potential typos

### Data Type Conversions
- Numeric fields stored as strings need parsing
- JSON fields need validation and error handling
- Array fields need parsing from string format

### AI-Powered Cleanup Opportunities
- Convert plain text to JSON in AttributesJSON
- Standardize PreferredPhases format
- Validate and suggest corrections for invalid references
- Skill normalization and standardization

### Real-World Data Characteristics
- 50 entities per type provides good test coverage
- Realistic company names and task descriptions
- Mixed data quality simulates real-world scenarios
- Cross-entity relationships test validation complexity

## Implementation Requirements

Based on this analysis, the application needs to handle:

1. **Schema Updates**:
   - QualificationLevel should accept numeric values 1-5
   - TaskCategory enum needs additional values
   - PreferredPhases should handle both range and array formats

2. **Enhanced Validation**:
   - Cross-entity reference checking
   - JSON field validation and cleanup
   - Format normalization for mixed data types

3. **AI Integration Points**:
   - AttributesJSON cleanup from plain text to structured JSON
   - Invalid reference detection and suggestion
   - Format standardization across fields

## Conclusion

V2 represents the "clean" target state that AI-powered cleanup should achieve, making these files excellent for testing the validation engine and data transformation features. The variety of data quality issues provides comprehensive test cases for the Data Alchemist validation and cleanup capabilities.
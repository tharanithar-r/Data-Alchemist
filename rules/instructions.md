---
trigger: always_on
---

## Core Principle

**Do not make any changes, until you have 95% confidence that you want to build and ask me follow up questions until you have that confidence.**

## Tech Stack

- Next.js 14+ (App Router) + TypeScript (strict mode)
- HeroUI (NextUI v2) + Tailwind CSS
- Prisma ORM + Microsoft SQL Server
- Context7 MCP for latest documentation

## Development Process

### 1. Understanding Phase (MANDATORY)

- Review project architect document as baseline reference (adaptable)
- Check tasks document for feature guidance (subject to changes)
- Identify any gaps or ambiguities in current requirements
- Ask clarifying questions about:
  - Specific feature requirements and user flows
  - Data models and relationships needed
  - Authentication/authorization requirements
  - UI/UX expectations and design patterns
  - Performance and scalability considerations
- Confirm if any modifications to existing documents are needed
- Validate technical approach aligns with current project goals

### 2. Research Phase

Use Context7 MCP to fetch comprehensive documentation:

- **Next.js**: App Router, server components, client components, API routes, middleware
- **Prisma**: MSSQL provider setup, schema design, query optimization, transactions
- **HeroUI**: Available components, theming, accessibility features
- **Tailwind CSS**: Utility classes, responsive design, custom configurations
- **TypeScript**: Advanced patterns, strict mode configurations, type safety

### 3. Planning Phase

- Database schema design and relationships
- API endpoint structure and error handling strategy
- Component hierarchy and reusability patterns
- Integration points with existing architecture
- Testing approach for the specific feature
- Deployment and environment considerations

### 4. Confidence Validation

Only proceed when you can confidently answer:

- What exactly needs to be built and why?
- How does it integrate with existing/planned components?
- What are the data flow and state management patterns?
- What are potential technical challenges and their solutions?
- How will errors and edge cases be handled?
- What testing strategy will ensure quality?
- Are there any requirement changes or architectural modifications needed?

## Best Practices

### TypeScript & Code Quality

- Enable strict mode for maximum type safety
- Avoid `any` types; use proper TypeScript utilities (Pick, Omit, Partial)
- Create comprehensive interfaces for all data structures
- Implement proper error boundaries and exception handling
- Use consistent naming conventions across the codebase

### Next.js App Router Patterns

- Default to server components for better performance
- Use client components only when browser APIs or interactivity required
- Implement proper loading.tsx and error.tsx for each route
- Design SEO-friendly metadata for all pages
- Plan proper caching strategies (static, dynamic, ISR)

### Database & Prisma

- Design normalized schemas with proper relationships
- Use appropriate indexes for query optimization
- Implement connection pooling for production environments
- Handle database transactions for multi-step operations
- Plan for data migrations and schema evolution
- Use Prisma's generated types for end-to-end type safety
- Consider MSSQL-specific features and limitations

### UI/UX with HeroUI + Tailwind

- Establish consistent design system using HeroUI components
- Use Tailwind for custom styling and layout adjustments
- Ensure responsive design across all breakpoints
- Implement proper accessibility (ARIA labels, keyboard navigation)
- Plan component composition and reusability
- Configure custom themes that work with both libraries
- Optimize for performance (lazy loading, code splitting)

### Security & Authentication

- Implement secure authentication flows
- Design proper authorization and role-based access
- Validate all inputs on both client and server sides
- Use environment variables for sensitive configurations
- Implement rate limiting for API endpoints
- Follow HTTPS and secure cookie practices

### Performance Optimization

- Monitor and optimize bundle sizes
- Implement proper caching at multiple levels
- Use React.memo and useMemo for expensive computations
- Optimize database queries to prevent N+1 problems
- Plan for lazy loading of heavy components
- Monitor Core Web Vitals and performance metrics

### Planning Questions

- Requirements: What needs to be built and why?
- Architecture: How does this fit with the overall design?
- Technical: Any MSSQL, Prisma, or integration considerations?
- UI/UX: HeroUI components and responsive design needs?
- Changes: Any modifications to existing architect/tasks documents?

## Pre-Implementation Checklist

- [ ] Requirements understood (including any changes)
- [ ] Latest documentation fetched via Context7 MCP
- [ ] Technical approach validated
- [ ] Integration points identified
- [ ] 95% confidence achieved

**Remember**: Ask follow-up questions until you reach 95% confidence. Architecture and tasks documents are guides, not rigid constraints.

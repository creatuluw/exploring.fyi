# App Flow Documentation

## Core User Flow

1. **Landing Page** → User enters topic or URL
2. **Mind Map Generation** → AI generates and displays interactive mind map
3. **Content Generation** → User clicks node → AI generates structured learning content

## Content Generation Logic

### Step 1: Table of Contents Generation
- Generate hierarchical structure: Chapters → Paragraphs
- Store complete ToC in database before content generation
- Structure: `Chapter.title + description` → `Paragraph.title + description`

### Step 2: Progressive Content Generation
- Generate paragraph content on-demand (user clicks "Explain")
- Each paragraph has: Mark as Read, Chat buttons
- Track reading time and completion status

### Step 3: Chapter Assessment
- "Check" button per chapter → AI generates 3 questions
- AI evaluates answers and provides 1-10 comprehension score
- Store results in checks_done table

## Database Schema Requirements

```
topics → mind_maps → learning_content → chapters → paragraphs
                                    → chat_history
                                    → progress
                                    → checks_done
```

## Technical Requirements

- **Loading States**: Show spinners for all AI operations
- **Mind Map**: Non-overlapping, compact node layout
- **Caching**: Store and retrieve all generated content
- **Progressive Generation**: Concepts → Chapters → Paragraphs
- **History Access**: Users can access previously generated content
# Enhanced Context for Node-Based Content Generation

## Example: Clicking on "HTML (Structuur)" node

Based on the provided mindmap JSON, when a user clicks on the "HTML (Structuur)" node, the system will now pass this enhanced context:

### Original behavior (before enhancement):
```
topic: "HTML (Structuur)"
context: "Websites Bouwen" (basic parent topic name)
difficulty: "intermediate"
```

### New enhanced behavior:
```json
{
  "topic": "HTML (Structuur)",
  "enhancedContext": {
    "mainTopic": {
      "title": "Websites Bouwen",
      "description": "Websites bouwen is het proces van het creëren en onderhouden van websites. Dit omvat het schrijven van code, het ontwerpen van de gebruikersinterface, het beheren van content en het zorgen dat de website toegankelijk is op het internet. Het is een combinatie van creativiteit en logisch denken om digitale ervaringen te realiseren die informatie presenteren of interactie mogelijk maken."
    },
    "nodeInfo": {
      "description": "De basis van elke webpagina. HTML definieert de structuur en de inhoud van een website, zoals koppen, paragrafen, afbeeldingen en links. Het is de 'bouwtekening' van de pagina.",
      "level": 1,
      "importance": "high",
      "connections": ["CSS (Styling)", "JavaScript (Interactiviteit)", "Frontend Ontwikkeling"],
      "parentId": "main"
    }
  },
  "difficulty": "intermediate"
}
```

### What the AI receives in the enhanced prompt:

```
Generate basic content metadata for the topic "HTML (Structuur)" within the following context:
**Main Topic Context**: "Websites Bouwen" - Websites bouwen is het proces van het creëren en onderhouden van websites. Dit omvat het schrijven van code, het ontwerpen van de gebruikersinterface, het beheren van content en het zorgen dat de website toegankelijk is op het internet. Het is een combinatie van creativiteit en logisch denken om digitale ervaringen te realiseren die informatie presenteren of interactie mogelijk maken.
**Specific Focus**: De basis van elke webpagina. HTML definieert de structuur en de inhoud van een website, zoals koppen, paragrafen, afbeeldingen en links. Het is de 'bouwtekening' van de pagina.
**Related Concepts**: CSS (Styling), JavaScript (Interactiviteit), Frontend Ontwikkeling
**Importance Level**: high

Target audience level: intermediate

Generate only the essential metadata:
1. Compelling title and description that considers the specific context
2. Basic section titles (4-6 main sections) relevant to the focus area
3. Learning objectives, prerequisites, next steps, and related topics
4. Estimated reading time

Pay special attention to the provided context - tailor the content to fit within the broader learning framework and emphasize the specific focus area.

Topic: HTML (Structuur)
```

## Benefits of Enhanced Context

1. **Better Content Relevance**: The AI understands this is specifically about HTML within the context of building websites (not HTML in general)

2. **Proper Scoping**: Content will focus on HTML as the structural foundation for websites, emphasizing its role as the "blueprint" of pages

3. **Connection Awareness**: The AI knows to explain how HTML relates to CSS (styling) and JavaScript (interactivity)

4. **Appropriate Depth**: With level=1 and importance="high", the content will be fundamental but essential

5. **Contextual Learning Path**: The content will be tailored to fit within a broader website building curriculum

## Expected Content Improvements

Instead of generic HTML content, the AI will generate:
- Content specifically about HTML's role in website structure
- Examples relevant to website building
- Clear connections to CSS and JavaScript concepts
- Prerequisites and next steps that align with the broader curriculum
- Learning objectives focused on website building context

This ensures that when users click on different nodes in the mindmap, they get contextually relevant content that fits their learning journey rather than generic information.

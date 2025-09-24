# App Flow

## For this app i want the ux and interaction flow and logic to be like this:

1. User lands on the landing page
2. User can either enter a topic or a url
3. If user enters or selects a preset topic, the app will generate a mind map based on the topic
4. The ai will generate a mind map based on the topic
5. The mind map will be displayed to the user
6. User can click on a node to get more learning content, the ai generation flow needs to be like this:
A. The ai will first generate the table of contents for the content of the node/topic selected, the ToC will contain the chapter titles and a short description of the chapter, and the ai needs to add the paragraphs after that with a short description. This will be the output at that point:

Example taxonomy:

- Space Exploration (Chapter 1)
  - Introduction (Paragraph 1.1)
  - What is Space Exploration? (Paragraph 1.2)
  - Why is Space Exploration Important? (Paragraph 1.3)

- Known Universe (Chapter 2)
  - Introduction (Paragraph 2.1)
  - What is the Known Universe? (Paragraph 2.2)
  - Why is the Known Universe Important? (Paragraph 2.3)

- Etcetera...

Note:This data needs to be stored in the database and the ai will need to use this data to generate the content for the paragraphs.

B. After the ai has generated the ToC, the ai will then generate the content for the paragraphs, based on the demand of the user, the ai will generate the content for the paragraphs, the content will be displayed to the user. Only if the user clicks on an explain button will the next paragraph be generated.

C. Each paragraph will have a 'Mark as read' button, and a 'Chat' button. The 'Mark as read' button will mark the paragraph as read, and the 'Chat' button will open a chat drawer with the ai, the ai will use the paragraph content to answer the user's question.

Note: All this data needs to be stored in the database. So the database schema needs to have the following tables:
-> Topics table
-> Mind maps table
-> Learning Content
-> Paragraphs (where also the mark read is logged including the time spent on the paragraph)
-> Chat history (where the chat history is logged)
-> Progress (where the progress is logged)
-> Checks done (In this table we will later on add the questions and answers by chapter for a users' self-assessment of the chapter based on 3 questions per chapter that will be provided to the user once all paragraphs of the chapter are read)

D. Each chapter will have a 'Check' button, the 'Check' button will open a chat drawer with the ai, the ai will ask three questions about the active / current chapter on screen for the user to answer and get feedback from the ai and a comprehension score from 1-10 rated by the ai and added to the database checks done table.


Additional criteria:

- All loading states show spinners
- Mindmap nodes can never overlap and will by design be as compact as possible.
- All ai generated content needs to be generated progressively as the ai generates the content for the paragraphs. So from concepts to chapters to paragraphs.
- Content that is already available needs to be cached for the user and easily accessible for the user from the history page.